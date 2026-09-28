"use server";

import { Prisma, MedioPago } from "@prisma/client";
import { db, exigirDeLaOrganizacion, obtenerContexto } from "@/lib/contexto";
import { Contexto, exigir } from "@/lib/permisos";
import { revalidatePath } from "next/cache";
import { ArchivoEntrada } from "@/dominio/movimientos/acciones";
import { registrarMovimientoSistema } from "@/dominio/movimientos/acciones";
import { esPagoVigente, esDevolucionVigente, porAsignar } from "./reglas";

function revalidarRutasSeguras() {
  try {
    revalidatePath("/inscripciones");
    revalidatePath("/movimientos");
    revalidatePath("/movimientos/validar");
    revalidatePath("/participantes");
  } catch {
    // Entorno sin Next.js router
  }
}

export interface ItemRetiroInput {
  id: string;
  tipo?: "inscripcion" | "cargo";
}

export interface DevolucionInput {
  montoClp: number;
  fecha?: string;
  medioPago?: MedioPago;
  observacion?: string | null;
  motivo?: string | null;
  cuentaBancaria?: string;
  sinRespaldo?: boolean;
  claveCliente?: string;
}

export type ResultadoRetirar =
  | {
      exito: true;
      totalPagado: number;
      montoDevuelto: number;
      retenido: number;
      movimientoGasto: any;
      error?: undefined;
    }
  | {
      exito: false;
      error: string;
      totalPagado?: undefined;
      montoDevuelto?: undefined;
      retenido?: undefined;
      movimientoGasto?: undefined;
    };

/**
 * 3.8 y 5.3: Retiro de binomio o pruebas por administrador.
 * Detiene si hay pagos por validar. Permite devolución total, parcial o retención.
 */
export async function ejecutarRetirar(
  ctx: Contexto,
  binomioId: string,
  items: ItemRetiroInput[],
  motivo: string,
  devolucion?: DevolucionInput,
  archivos: ArchivoEntrada[] = []
): Promise<ResultadoRetirar> {
  exigir(ctx, "inscripciones.administrar");

  if (!motivo || motivo.trim().length === 0) {
    return { exito: false, error: "El motivo del retiro es obligatorio." };
  }
  if (items.length === 0) {
    return { exito: false, error: "Debes seleccionar al menos un ítem a retirar." };
  }

  await exigirDeLaOrganizacion(ctx, "binomio", binomioId);

  try {
    const resultado = await db(ctx).$transaction(async (tx) => {
      // 1. Verificar pagos de cada ítem
      const itemsCargados: Array<{
        id: string;
        tipo: "inscripcion" | "cargo";
        pagado: number;
        devuelto: number;
      }> = [];

      let totalPagado = 0;
      let totalDevueltoPreviamente = 0;

      for (const it of items) {
        const ins = await tx.inscripcion.findUnique({
          where: { id: it.id },
          include: {
            pagos: {
              where: { anulado: false },
              include: { movimiento: true },
            },
            devoluciones: {
              where: { anulado: false },
              include: { movimiento: true },
            },
          },
        });

        if (!ins || ins.anulado) {
          throw new Error(`La inscripción '${it.id}' no existe o ya está anulada.`);
        }

        // Regla 3.8: Detener si hay pagos por validar u observados
        for (const p of ins.pagos) {
          if (
            p.movimiento &&
            (p.movimiento.estadoValidacion === "por_validar" ||
              p.movimiento.estadoValidacion === "observado")
          ) {
            throw new Error(
              "Hay un pago por validar en las pruebas seleccionadas. Valídalo o anúlalo primero en Tesorería."
            );
          }
        }

        const pagado = ins.pagos.filter(esPagoVigente).reduce((a: number, p: any) => a + p.montoClp, 0);
        const devuelto = ins.devoluciones
          .filter(esDevolucionVigente)
          .reduce((a: number, d: any) => a + d.montoClp, 0);

        totalPagado += pagado;
        totalDevueltoPreviamente += devuelto;
        itemsCargados.push({ id: it.id, tipo: it.tipo || "inscripcion", pagado, devuelto });

        // Marcar como retirado y anulado
        await tx.inscripcion.update({
          where: { id: it.id },
          data: {
            anulado: true,
            retirado: true,
            motivoAnulacion: motivo.trim(),
            anuladoPorId: ctx.usuario.id,
            anuladoEn: new Date(),
            version: ins.version + 1,
          },
        });
      }

      const retenidoInicial = Math.max(0, totalPagado - totalDevueltoPreviamente);
      let montoDevuelto = 0;
      let movimientoGasto: any = null;
      let movimientoGastoId: string | null = null;

      // 2. Si se solicitó devolución de dinero
      if (devolucion && devolucion.montoClp > 0) {
        if (devolucion.montoClp > retenidoInicial) {
          throw new Error(
            `El monto a devolver ($${devolucion.montoClp}) supera el dinero pagado disponible ($${retenidoInicial}).`
          );
        }

        const fechaMov = devolucion.fecha || new Date().toISOString().slice(0, 10);
        const claveCli = devolucion.claveCliente || `dev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const obs = devolucion.observacion || devolucion.motivo || undefined;
        movimientoGasto = await registrarMovimientoSistema(
          tx,
          ctx,
          {
            claveSistema: "devoluciones",
            tipo: "gasto",
            montoClp: devolucion.montoClp,
            fecha: fechaMov,
            medioPago: devolucion.medioPago || "transferencia",
            observacion: obs,
            sinRespaldo: devolucion.sinRespaldo ?? true,
            claveCliente: claveCli,
            descripcion: `Devolución por retiro de binomio: ${motivo.trim()}`,
          },
          archivos
        );

        movimientoGastoId = movimientoGasto.id;
        montoDevuelto = devolucion.montoClp;

        // Repartir la devolución entre los ítems
        let restanteDevolver = devolucion.montoClp;
        for (const it of itemsCargados) {
          if (restanteDevolver <= 0) break;
          const disponibleItem = Math.max(0, it.pagado - it.devuelto);
          if (disponibleItem <= 0) continue;

          const parteDevolucion = Math.min(disponibleItem, restanteDevolver);

          await tx.devolucion.create({
            data: {
              organizacionId: ctx.organizacionId,
              movimientoId: movimientoGasto.id,
              inscripcionId: it.id,
              montoClp: parteDevolucion,
              creadoPorId: ctx.usuario.id,
            },
          });

          restanteDevolver -= parteDevolucion;
        }
      }

      const retenidoFinal = Math.max(0, totalPagado - totalDevueltoPreviamente - montoDevuelto);

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Binomio",
          entidadId: binomioId,
          accion: "retirar",
          despues: {
            motivo: motivo.trim(),
            totalPagado,
            montoDevuelto,
            retenidoFinal,
            itemsRetirados: items.length,
            movimientoGastoId,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        totalPagado,
        montoDevuelto,
        retenido: retenidoFinal,
        movimientoGasto,
      };
    });

    revalidarRutasSeguras();
    return { exito: true, ...resultado };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo procesar el retiro." };
  }
}

export async function retirar(
  binomioId: string,
  items: ItemRetiroInput[],
  motivo: string,
  devolucion?: DevolucionInput,
  archivos: ArchivoEntrada[] = []
) {
  const ctx = await obtenerContexto();
  return ejecutarRetirar(ctx, binomioId, items, motivo, devolucion, archivos);
}

export async function retirarAction(formData: FormData) {
  const ctx = await obtenerContexto();

  const datosJson = formData.get("datos") as string;
  if (!datosJson) {
    return { exito: false, error: "Datos de formulario incompletos." };
  }

  let payload: {
    binomioId: string;
    items: ItemRetiroInput[];
    motivo: string;
    devolucion?: DevolucionInput;
  };
  try {
    payload = JSON.parse(datosJson);
  } catch {
    return { exito: false, error: "Formato de datos no válido." };
  }

  const archivos: ArchivoEntrada[] = [];
  const archivosForm = formData.getAll("archivos");

  for (const item of archivosForm) {
    if (item instanceof File && item.size > 0) {
      const arrayBuffer = await item.arrayBuffer();
      archivos.push({
        buffer: Buffer.from(arrayBuffer),
        nombre: item.name,
        tipoMime: item.type,
      });
    }
  }

  return ejecutarRetirar(
    ctx,
    payload.binomioId,
    payload.items,
    payload.motivo,
    payload.devolucion,
    archivos
  );
}


/**
 * 3.8: Registra una devolución posterior sobre ítems que ya fueron retirados
 * y tienen fondos retenidos en caja.
 */
export async function ejecutarRegistrarDevolucionRetiro(
  ctx: Contexto,
  items: ItemRetiroInput[],
  devolucion: DevolucionInput,
  archivos: ArchivoEntrada[] = []
) {
  exigir(ctx, "inscripciones.administrar");

  if (devolucion.montoClp <= 0) {
    return { exito: false, error: "El monto a devolver debe ser mayor a 0." };
  }

  try {
    const resultado = await db(ctx).$transaction(async (tx) => {
      let retenidoTotal = 0;
      const itemsRetirados = [];

      for (const it of items) {
        const ins = await tx.inscripcion.findUnique({
          where: { id: it.id },
          include: {
            pagos: { where: { anulado: false } },
            devoluciones: { where: { anulado: false } },
          },
        });
        if (!ins || !ins.retirado) throw new Error("La inscripción no está retirada.");

        const pagado = ins.pagos.filter(esPagoVigente).reduce((a: number, p: any) => a + p.montoClp, 0);
        const devuelto = ins.devoluciones
          .filter(esDevolucionVigente)
          .reduce((a: number, d: any) => a + d.montoClp, 0);
        const retenido = Math.max(0, pagado - devuelto);

        retenidoTotal += retenido;
        itemsRetirados.push({ id: it.id, tipo: it.tipo || "inscripcion", retenido });
      }

      if (devolucion.montoClp > retenidoTotal) {
        throw new Error(
          `El monto a devolver ($${devolucion.montoClp}) supera el saldo retenido disponible ($${retenidoTotal}).`
        );
      }

      const fechaMov = devolucion.fecha || new Date().toISOString().slice(0, 10);
      const claveCli = devolucion.claveCliente || `dev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const obs = devolucion.observacion || devolucion.motivo || undefined;
      const gastoDevolucion = await registrarMovimientoSistema(
        tx,
        ctx,
        {
          claveSistema: "devoluciones",
          tipo: "gasto",
          montoClp: devolucion.montoClp,
          fecha: fechaMov,
          medioPago: devolucion.medioPago || "transferencia",
          observacion: obs,
          sinRespaldo: devolucion.sinRespaldo ?? true,
          claveCliente: claveCli,
          descripcion: `Devolución posterior sobre ítems retirados`,
        },
        archivos
      );

      let restante = devolucion.montoClp;
      for (const it of itemsRetirados) {
        if (restante <= 0) break;
        if (it.retenido <= 0) continue;

        const parte = Math.min(it.retenido, restante);

        await tx.devolucion.create({
          data: {
            organizacionId: ctx.organizacionId,
            movimientoId: gastoDevolucion.id,
            inscripcionId: it.id,
            montoClp: parte,
            creadoPorId: ctx.usuario.id,
          },
        });

        restante -= parte;
      }

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Devolucion",
          entidadId: gastoDevolucion.id,
          accion: "registrar_devolucion",
          despues: { montoDevuelto: devolucion.montoClp },
        },
      });

      return {
        movimientoId: gastoDevolucion.id,
        montoDevuelto: devolucion.montoClp,
      };
    });

    revalidarRutasSeguras();
    return { exito: true, ...resultado };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo registrar la devolución." };
  }
}

export async function registrarDevolucionRetiro(
  items: ItemRetiroInput[],
  devolucion: DevolucionInput,
  archivos: ArchivoEntrada[] = []
) {
  const ctx = await obtenerContexto();
  return ejecutarRegistrarDevolucionRetiro(ctx, items, devolucion, archivos);
}

/**
 * 3.8: Devuelve un saldo sobrante que quedó 'por asignar' en un movimiento de ingreso.
 */
export async function ejecutarDevolverSobrante(
  ctx: Contexto,
  movimientoIngresoId: string,
  devolucion: DevolucionInput,
  archivos: ArchivoEntrada[] = []
) {
  exigir(ctx, "inscripciones.administrar");
  await exigirDeLaOrganizacion(ctx, "movimiento", movimientoIngresoId);

  const ingreso = await db(ctx).movimiento.findUnique({
    where: { id: movimientoIngresoId },
    include: {
      pagos: { where: { anulado: false } },
      devolucionesSobrante: { where: { anulado: false } },
    },
  });

  if (!ingreso || ingreso.anulado) {
    return { exito: false, error: "El ingreso no existe o fue anulado." };
  }

  const saldoDisponible = porAsignar(ingreso, ingreso.pagos, ingreso.devolucionesSobrante);
  if (devolucion.montoClp > saldoDisponible) {
    return {
      exito: false,
      error: `El monto a devolver ($${devolucion.montoClp}) supera el disponible por asignar ($${saldoDisponible}).`,
    };
  }

  try {
    const resultado = await db(ctx).$transaction(async (tx) => {
      const fechaMov = devolucion.fecha || new Date().toISOString().slice(0, 10);
      const claveCli = devolucion.claveCliente || `dev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const obs = devolucion.observacion || devolucion.motivo || undefined;
      const gastoDevolucion = await registrarMovimientoSistema(
        tx,
        ctx,
        {
          claveSistema: "devoluciones",
          tipo: "gasto",
          montoClp: devolucion.montoClp,
          fecha: fechaMov,
          medioPago: devolucion.medioPago || "transferencia",
          observacion: obs,
          sinRespaldo: devolucion.sinRespaldo ?? true,
          claveCliente: claveCli,
          descripcion: `Devolución de excedente por asignar del ingreso ${ingreso.id}`,
        },
        archivos
      );

      const dev = await tx.devolucion.create({
        data: {
          organizacionId: ctx.organizacionId,
          movimientoId: gastoDevolucion.id,
          ingresoId: ingreso.id,
          montoClp: devolucion.montoClp,
          creadoPorId: ctx.usuario.id,
        },
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Devolucion",
          entidadId: dev.id,
          accion: "devolver_sobrante",
          despues: {
            ingresoId: ingreso.id,
            montoDevuelto: devolucion.montoClp,
            nuevoPorAsignar: saldoDisponible - devolucion.montoClp,
          },
        },
      });

      return { devolucion: dev, gastoId: gastoDevolucion.id };
    });

    revalidarRutasSeguras();
    return { exito: true, ...resultado };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo devolver el sobrante." };
  }
}

export async function devolverSobrante(
  movimientoIngresoId: string,
  devolucion: DevolucionInput,
  archivos: ArchivoEntrada[] = []
) {
  const ctx = await obtenerContexto();
  return ejecutarDevolverSobrante(ctx, movimientoIngresoId, devolucion, archivos);
}
