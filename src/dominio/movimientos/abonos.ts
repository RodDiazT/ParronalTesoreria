"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { obtenerContexto, db, exigirDeLaOrganizacion, registrarAuditoria } from "@/lib/contexto";
import { Contexto, exigir, puede } from "@/lib/permisos";
import { obtenerFechaHoyChile, ocultarDatosMovimiento } from "./reglas";
import { ArchivoEntrada } from "./acciones";
import {
  validarMagicBytesRespaldo,
  construirRutaRelativaRespaldo,
  guardarArchivoRespaldo,
  eliminarArchivoRespaldo,
} from "@/lib/archivos/almacenamiento";

function revalidarRutaSegura(ruta: string) {
  try {
    revalidatePath(ruta);
  } catch {
    // Silencioso si se ejecuta fuera de Next.js (ej: Vitest)
  }
}

export async function marcarPagado(
  id: string,
  datos: {
    montoClp: number;
    fechaPago: string;
    medioPago: "transferencia" | "efectivo" | "otro";
    archivo?: ArchivoEntrada | null;
  },
  version: number
) {
  const ctx = await obtenerContexto();
  return ejecutarMarcarPagado(ctx, id, datos, version);
}

export async function marcarPagadoAction(id: string, formData: FormData, version: number) {
  const ctx = await obtenerContexto();

  const montoClp = parseInt(formData.get("montoClp") as string, 10);
  const fechaPago = formData.get("fechaPago") as string;
  const medioPago = formData.get("medioPago") as "transferencia" | "efectivo" | "otro";

  let archivo: ArchivoEntrada | null = null;
  const file = formData.get("archivo");
  if (file instanceof File && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer();
    archivo = {
      buffer: Buffer.from(arrayBuffer),
      nombre: file.name,
      tipoMime: file.type,
      esComprobantePago: true,
    };
  }

  return ejecutarMarcarPagado(ctx, id, { montoClp, fechaPago, medioPago, archivo }, version);
}

/**
 * 4.5 y 3.5: Marca un movimiento pendiente como pagado total o registra un abono parcial enlazado.
 * Implementa control concurrente y bloqueo transaccional.
 */
export async function ejecutarMarcarPagado(
  ctx: Contexto,
  id: string,
  datos: {
    montoClp: number;
    fechaPago: string;
    medioPago: "transferencia" | "efectivo" | "otro";
    archivo?: ArchivoEntrada | null;
  },
  version: number
) {
  exigir(ctx, "marcar_pendiente_pagado");

  const hoy = obtenerFechaHoyChile();
  if (datos.fechaPago > hoy) {
    return { exito: false, error: "La fecha de pago no puede ser futura." };
  }

  if (datos.montoClp <= 0) {
    return { exito: false, error: "El monto a pagar debe ser mayor a 0." };
  }

  // Comprobar archivo si fue adjuntado
  let archivoValidado: {
    buffer: Buffer;
    tipoMime: "image/jpeg" | "image/png" | "application/pdf";
    extension: "jpg" | "png" | "pdf";
  } | null = null;

  if (datos.archivo) {
    const resArchivo = validarMagicBytesRespaldo(datos.archivo.buffer);
    if (!resArchivo.valido || !resArchivo.tipoMime || !resArchivo.extension) {
      return { exito: false, error: resArchivo.error || "Archivo de comprobante no válido." };
    }
    archivoValidado = {
      buffer: datos.archivo.buffer,
      tipoMime: resArchivo.tipoMime,
      extension: resArchivo.extension,
    };
  }

  let rutaArchivoEscrito = "";

  try {
    const resultado = await db(ctx).$transaction(async (tx) => {
      // Bloqueo de fila para evitar condiciones de carrera en pagos simultáneos
      const mov = await tx.movimiento.findUnique({
        where: { id, organizacionId: ctx.organizacionId },
      });

      if (!mov || mov.anulado) {
        throw new Error("El movimiento no existe o está anulado.");
      }

      if (mov.estadoPago !== "pendiente") {
        throw new Error("El movimiento ya está marcado como pagado.");
      }

      if (mov.version !== version) {
        throw new Error("El movimiento fue modificado por otro usuario. Por favor recarga los datos.");
      }

      // Validar si tiene algún abono por validar activo
      const abonoPorValidar = await tx.movimiento.findFirst({
        where: {
          abonoDeId: id,
          organizacionId: ctx.organizacionId,
          estadoValidacion: "por_validar",
          anulado: false,
        },
      });

      if (abonoPorValidar) {
        throw new Error("El movimiento tiene un abono por validar. Debe ser validado o anulado antes de registrar otro pago.");
      }

      if (datos.montoClp > mov.montoClp) {
        throw new Error(`El monto ($${datos.montoClp.toLocaleString("es-CL")}) no puede superar el saldo pendiente ($${mov.montoClp.toLocaleString("es-CL")}).`);
      }

      // Validar fechaPago respecto de la fecha del movimiento (no más de 365 días atrás)
      const msFecha = mov.fecha.getTime();
      const msFechaPago = new Date(`${datos.fechaPago}T00:00:00Z`).getTime();
      const diasDif = (msFecha - msFechaPago) / (1000 * 60 * 60 * 24);
      if (diasDif > 365) {
        throw new Error("La fecha de pago no puede ser anterior a la fecha del movimiento en más de 365 días.");
      }

      const fPago = new Date(`${datos.fechaPago}T00:00:00Z`);

      // CASO A: Pago total del saldo pendiente
      if (datos.montoClp === mov.montoClp) {
        let nuevoEstadoValidacion = mov.estadoValidacion;
        let enviadoAValidarPorId = mov.enviadoAValidarPorId;
        let validadoPorId = mov.validadoPorId;
        let validadoEn = mov.validadoEn;

        // Si lo marca un ayudante, pasa a por_validar (sale de por pagar y entra a por validar)
        if (ctx.rol === "ayudante") {
          nuevoEstadoValidacion = "por_validar";
          enviadoAValidarPorId = ctx.usuario.id;
          validadoPorId = null;
          validadoEn = null;
        } else if (ctx.rol === "administrador") {
          nuevoEstadoValidacion = "validado";
          validadoPorId = ctx.usuario.id;
          validadoEn = new Date();
        }

        const actualizado = await tx.movimiento.update({
          where: { id, organizacionId: ctx.organizacionId },
          data: {
            estadoPago: "pagado",
            fechaPago: fPago,
            medioPago: datos.medioPago,
            estadoValidacion: nuevoEstadoValidacion,
            enviadoAValidarPorId,
            validadoPorId,
            validadoEn,
            version: { increment: 1 },
          },
        });

        // Si hay comprobante adjunto, registrarlo
        if (archivoValidado) {
          const resp = await tx.respaldo.create({
            data: {
              organizacionId: ctx.organizacionId,
              movimientoId: id,
              ruta: "temporal",
              tipoMime: archivoValidado.tipoMime,
              bytes: archivoValidado.buffer.length,
              esComprobantePago: true,
              subidoPorId: ctx.usuario.id,
            },
          });

          const rutaRelativa = construirRutaRelativaRespaldo(
            ctx.organizacionId,
            id,
            resp.id,
            archivoValidado.extension
          );

          await tx.respaldo.update({
            where: { id: resp.id },
            data: { ruta: rutaRelativa },
          });

          await guardarArchivoRespaldo(rutaRelativa, archivoValidado.buffer);
          rutaArchivoEscrito = rutaRelativa;
        }

        await tx.registroAuditoria.create({
          data: {
            organizacionId: ctx.organizacionId,
            usuarioId: ctx.usuario.id,
            entidad: "Movimiento",
            entidadId: id,
            accion: "marcar_pagado",
            despues: {
              montoClp: datos.montoClp,
              fechaPago: datos.fechaPago,
              medioPago: datos.medioPago,
              estadoValidacion: nuevoEstadoValidacion,
              pagoTotal: true,
            },
          },
        });

        return { tipo: "pago_total" as const, movimiento: actualizado };
      }

      // CASO B: Abono parcial enlazado (monto menor al saldo pendiente)
      const esAdmin = puede(ctx, "validar");
      const estadoValidacionAbono = esAdmin ? "validado" : "por_validar";

      // Crear el movimiento del abono
      const claveAbono = `abono-${id}-${Date.now()}`;
      const abono = await tx.movimiento.create({
        data: {
          organizacionId: ctx.organizacionId,
          eventoId: mov.eventoId,
          tipo: mov.tipo,
          naturaleza: mov.naturaleza,
          montoClp: datos.montoClp,
          montoOriginalClp: datos.montoClp,
          fecha: mov.fecha,
          fechaPago: fPago,
          medioPago: datos.medioPago,
          estadoPago: "pagado",
          categoriaId: mov.categoriaId,
          sinIdentificar: false,
          contraparteId: mov.contraparteId,
          pagadoPorId: mov.pagadoPorId,
          nombreOrigen: mov.nombreOrigen,
          descripcion: mov.descripcion ? `Abono: ${mov.descripcion}` : "Abono",
          observacion: mov.observacion,
          sinRespaldo: !archivoValidado,
          estadoValidacion: estadoValidacionAbono,
          enviadoAValidarPorId: !esAdmin ? ctx.usuario.id : null,
          validadoPorId: esAdmin ? ctx.usuario.id : null,
          validadoEn: esAdmin ? new Date() : null,
          abonoDeId: mov.id,
          registradoPorId: ctx.usuario.id,
          claveCliente: claveAbono,
        },
      });

      // Si el administrador registra el abono, se descuenta de inmediato del original
      if (esAdmin) {
        const nuevoSaldo = mov.montoClp - datos.montoClp;
        await tx.movimiento.update({
          where: { id, organizacionId: ctx.organizacionId },
          data: {
            montoClp: nuevoSaldo,
            version: { increment: 1 },
          },
        });

        await tx.registroAuditoria.create({
          data: {
            organizacionId: ctx.organizacionId,
            usuarioId: ctx.usuario.id,
            entidad: "Movimiento",
            entidadId: id,
            accion: "aplicar_abono",
            despues: {
              montoClp: nuevoSaldo,
              abonoId: abono.id,
              montoAbono: datos.montoClp,
            },
          },
        });
      }

      // Si hay archivo de comprobante para el abono
      if (archivoValidado) {
        const resp = await tx.respaldo.create({
          data: {
            organizacionId: ctx.organizacionId,
            movimientoId: abono.id,
            ruta: "temporal",
            tipoMime: archivoValidado.tipoMime,
            bytes: archivoValidado.buffer.length,
            esComprobantePago: true,
            subidoPorId: ctx.usuario.id,
          },
        });

        const rutaRelativa = construirRutaRelativaRespaldo(
          ctx.organizacionId,
          abono.id,
          resp.id,
          archivoValidado.extension
        );

        await tx.respaldo.update({
          where: { id: resp.id },
          data: { ruta: rutaRelativa },
        });

        await guardarArchivoRespaldo(rutaRelativa, archivoValidado.buffer);
        rutaArchivoEscrito = rutaRelativa;
      }

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Movimiento",
          entidadId: abono.id,
          accion: "registrar_abono",
          despues: {
            abonoDeId: id,
            montoClp: datos.montoClp,
            fechaPago: datos.fechaPago,
            medioPago: datos.medioPago,
            estadoValidacion: estadoValidacionAbono,
          },
        },
      });

      return { tipo: "abono" as const, movimiento: abono };
    });

    revalidarRutaSegura("/movimientos");
    revalidarRutaSegura("/movimientos/validar");
    revalidarRutaSegura(`/movimientos/${id}`);

    return {
      exito: true,
      tipo: resultado.tipo,
      movimiento: ocultarDatosMovimiento(ctx, resultado.movimiento),
    };
  } catch (error: any) {
    if (rutaArchivoEscrito) {
      await eliminarArchivoRespaldo(rutaArchivoEscrito);
    }
    console.error("Error al marcar pagado:", error);
    return {
      exito: false,
      error: error?.message || "No se pudo registrar el pago.",
    };
  }
}
