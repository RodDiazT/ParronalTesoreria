"use server";

import { Prisma, MedioPago } from "@prisma/client";
import { db, exigirDeLaOrganizacion, obtenerContexto } from "@/lib/contexto";
import { Contexto, exigir, puede } from "@/lib/permisos";
import { revalidatePath } from "next/cache";
import { ArchivoEntrada } from "@/dominio/movimientos/acciones";
import { registrarMovimientoSistema } from "@/dominio/movimientos/acciones";
import { esPagoVigente, porAsignar } from "./reglas";

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

export interface RepartoItemInput {
  id: string; // inscripcionId
  tipo?: "inscripcion" | "cargo";
  montoClp: number;
}

export interface RegistrarPagoInscripcionesInput {
  montoClp: number;
  fecha: string;
  fechaPago?: string | null;
  medioPago?: MedioPago;
  nombreOrigen?: string | null;
  observacion?: string | null;
  sinRespaldo?: boolean;
  claveCliente: string;
  reparto: RepartoItemInput[];
}

export type ResultadoRegistrarPagoInscripciones =
  | {
      exito: true;
      movimiento: any;
      pagos: any[];
      reintento: boolean;
      error?: undefined;
    }
  | {
      exito: false;
      error: string;
      movimiento?: undefined;
      pagos?: undefined;
      reintento?: undefined;
    };

/**
 * 3.6 y 5.3: Registra el pago de inscripción, crea el movimiento de ingreso
 * en la categoría de sistema 'inscripciones', valida los saldos de cada ítem
 * y crea los registros de Pago en una transacción ACID.
 */
export async function ejecutarRegistrarPagoInscripciones(
  ctx: Contexto,
  datos: RegistrarPagoInscripcionesInput,
  archivos: ArchivoEntrada[] = [],
  opciones?: { tx?: any; auditar?: boolean }
): Promise<ResultadoRegistrarPagoInscripciones> {
  exigir(ctx, "inscripciones.inscribir");

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return { exito: false, error: "El evento debe estar abierto para registrar pagos." };
  }

  if (datos.montoClp <= 0) {
    return { exito: false, error: "El monto del pago debe ser mayor a 0." };
  }

  // Filtrar ítems asignados > 0
  const asignaciones = datos.reparto.filter((r) => r.montoClp > 0);
  const totalAsignado = asignaciones.reduce((acc, r) => acc + r.montoClp, 0);

  if (totalAsignado > datos.montoClp) {
    return { exito: false, error: "La suma asignada a los ítems no puede superar el monto del pago." };
  }

  for (const item of asignaciones) {
    if (item.tipo === "cargo") {
      await exigirDeLaOrganizacion(ctx, "cargo", item.id);
    } else {
      await exigirDeLaOrganizacion(ctx, "inscripcion", item.id);
    }
  }

  const operacion = async (tx: any) => {
    // 1. Crear el movimiento de ingreso de sistema 'inscripciones'
    const movimiento = await registrarMovimientoSistema(
      tx,
      ctx,
      {
        claveSistema: "inscripciones",
        tipo: "ingreso",
        montoClp: datos.montoClp,
        fecha: datos.fecha,
        fechaPago: datos.fechaPago,
        medioPago: datos.medioPago || "transferencia",
        nombreOrigen: datos.nombreOrigen,
        observacion: datos.observacion,
        sinRespaldo: datos.sinRespaldo,
        claveCliente: datos.claveCliente,
      },
      archivos
    );

    // Si fue reintento de un movimiento ya existente con pagos, retornar
    const pagosExistentes = await tx.pago.findMany({
      where: { movimientoId: movimiento.id, organizacionId: ctx.organizacionId, anulado: false },
    });
    if (pagosExistentes.length > 0) {
      return { movimiento, pagos: pagosExistentes, reintento: true };
    }

    // 2. Procesar cada asignación con validación de saldos en tiempo real
    const pagosCreados = [];

    for (const item of asignaciones) {
      if (item.tipo === "cargo") {
        const cargo = await tx.cargo.findUnique({
          where: { id: item.id },
          include: { pagos: { where: { anulado: false } } },
        });

        if (!cargo || cargo.anulado) {
          throw new Error(`El servicio '${item.id}' no existe o está anulado.`);
        }

        const pagadoPreviamente = cargo.pagos.reduce((acc: number, p: any) => acc + p.montoClp, 0);
        const saldoDisponible = Math.max(0, cargo.montoClp - pagadoPreviamente);

        if (item.montoClp > saldoDisponible) {
          throw new Error("El saldo de uno de los servicios cambió. Por favor recarga el formulario de reparto.");
        }

        const pago = await tx.pago.create({
          data: {
            organizacionId: ctx.organizacionId,
            movimientoId: movimiento.id,
            cargoId: item.id,
            montoClp: item.montoClp,
            creadoPorId: ctx.usuario.id,
          },
        });

        pagosCreados.push(pago);
      } else {
        const ins = await tx.inscripcion.findUnique({
          where: { id: item.id },
          include: { pagos: { where: { anulado: false } } },
        });

        if (!ins || ins.anulado) {
          throw new Error(`La inscripción '${item.id}' no existe o está anulada.`);
        }

        const pagadoPreviamente = ins.pagos.reduce((acc: number, p: any) => acc + p.montoClp, 0);
        const saldoDisponible = Math.max(0, ins.montoClp - pagadoPreviamente);

        if (item.montoClp > saldoDisponible) {
          throw new Error("El saldo cambió. Por favor recarga el formulario de reparto.");
        }

        const pago = await tx.pago.create({
          data: {
            organizacionId: ctx.organizacionId,
            movimientoId: movimiento.id,
            inscripcionId: item.id,
            montoClp: item.montoClp,
            creadoPorId: ctx.usuario.id,
          },
        });

        pagosCreados.push(pago);
      }
    }

    if (opciones?.auditar !== false) {
      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Pago",
          entidadId: movimiento.id,
          accion: "asignar_pago",
          despues: {
            movimientoId: movimiento.id,
            totalAsignado,
            porAsignar: datos.montoClp - totalAsignado,
            cantidadPagos: pagosCreados.length,
          } as Prisma.InputJsonValue,
        },
      });
    }

    return { movimiento, pagos: pagosCreados, reintento: false };
  };

  try {
    let resultado;
    if (opciones?.tx) {
      resultado = await operacion(opciones.tx);
    } else {
      resultado = await db(ctx).$transaction(operacion);
    }

    revalidarRutasSeguras();
    return { exito: true, ...resultado };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo registrar el pago." };
  }
}

export async function registrarPagoInscripciones(
  datos: RegistrarPagoInscripcionesInput,
  archivos: ArchivoEntrada[] = []
) {
  const ctx = await obtenerContexto();
  return ejecutarRegistrarPagoInscripciones(ctx, datos, archivos);
}

export async function registrarPagoInscripcionesAction(formData: FormData) {
  const ctx = await obtenerContexto();

  const datosJson = formData.get("datos") as string;
  if (!datosJson) {
    return { exito: false, error: "Datos de formulario incompletos." };
  }

  let datos: RegistrarPagoInscripcionesInput;
  try {
    datos = JSON.parse(datosJson);
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

  return ejecutarRegistrarPagoInscripciones(ctx, datos, archivos);
}


/**
 * 3.7: Asigna dinero disponible de un movimiento que quedó 'por asignar'.
 */
export async function ejecutarAsignarPorAsignar(
  ctx: Contexto,
  movimientoId: string,
  reparto: RepartoItemInput[],
  version?: number
) {
  await exigirDeLaOrganizacion(ctx, "movimiento", movimientoId);

  const mov = await db(ctx).movimiento.findUnique({
    where: { id: movimientoId },
    include: {
      categoria: true,
      pagos: { where: { anulado: false } },
      devolucionesSobrante: { where: { anulado: false } },
    },
  });

  if (!mov || mov.anulado) {
    return { exito: false, error: "El movimiento no existe o fue anulado." };
  }

  if (mov.categoria?.claveSistema !== "inscripciones") {
    return { exito: false, error: "Solo se puede asignar saldo en movimientos de inscripciones." };
  }

  // Verificación de permisos (docs §3.7)
  const esAdmin = puede(ctx, "inscripciones.administrar");
  const esPropioPorValidar =
    mov.enviadoAValidarPorId === ctx.usuario.id &&
    (mov.estadoValidacion === "por_validar" || mov.estadoValidacion === "observado");

  if (!esAdmin && !esPropioPorValidar) {
    return {
      exito: false,
      error: "No tienes permiso para asignar este saldo.",
    };
  }

  const asignaciones = reparto.filter((r) => r.montoClp > 0);
  const totalAsignar = asignaciones.reduce((a, r) => a + r.montoClp, 0);

  const saldoPorAsignar = porAsignar(mov, mov.pagos, mov.devolucionesSobrante);
  if (totalAsignar > saldoPorAsignar) {
    return { exito: false, error: "El monto a asignar supera el saldo disponible por asignar." };
  }

  try {
    const nuevosPagos = await db(ctx).$transaction(async (tx) => {
      if (version !== undefined && mov.version !== version) {
        throw new Error("El movimiento fue modificado por otro usuario.");
      }

      const pagos = [];
      for (const item of asignaciones) {
        if (item.tipo === "cargo") {
          const cargo = await tx.cargo.findUnique({
            where: { id: item.id },
            include: { pagos: { where: { anulado: false } } },
          });
          if (!cargo || cargo.anulado) throw new Error("Servicio no encontrado o anulado.");
          const saldo = Math.max(
            0,
            cargo.montoClp - cargo.pagos.reduce((a: number, p: any) => a + p.montoClp, 0)
          );
          if (item.montoClp > saldo) throw new Error("El saldo del servicio cambió.");

          const p = await tx.pago.create({
            data: {
              organizacionId: ctx.organizacionId,
              movimientoId,
              cargoId: item.id,
              montoClp: item.montoClp,
              creadoPorId: ctx.usuario.id,
            },
          });
          pagos.push(p);
        } else {
          const ins = await tx.inscripcion.findUnique({
            where: { id: item.id },
            include: { pagos: { where: { anulado: false } } },
          });
          if (!ins || ins.anulado) throw new Error("Inscripción no encontrada.");
          const saldo = Math.max(
            0,
            ins.montoClp - ins.pagos.reduce((a: number, p: any) => a + p.montoClp, 0)
          );
          if (item.montoClp > saldo) throw new Error("El saldo de la inscripción cambió.");

          const p = await tx.pago.create({
            data: {
              organizacionId: ctx.organizacionId,
              movimientoId,
              inscripcionId: item.id,
              montoClp: item.montoClp,
              creadoPorId: ctx.usuario.id,
            },
          });
          pagos.push(p);
        }
      }

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Pago",
          entidadId: movimientoId,
          accion: "asignar_pago",
          despues: { montoAsignado: totalAsignar },
        },
      });

      return pagos;
    });

    revalidarRutasSeguras();
    return { exito: true, pagos: nuevosPagos };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo asignar el saldo." };
  }
}

export async function asignarPorAsignar(
  movimientoId: string,
  reparto: RepartoItemInput[],
  version?: number
) {
  const ctx = await obtenerContexto();
  return ejecutarAsignarPorAsignar(ctx, movimientoId, reparto, version);
}

/**
 * 3.7: Corrige el reparto completo de un movimiento anulando pagos previos.
 */
export async function ejecutarCorregirReparto(
  ctx: Contexto,
  movimientoId: string,
  nuevoReparto: RepartoItemInput[],
  version?: number
) {
  await exigirDeLaOrganizacion(ctx, "movimiento", movimientoId);

  const mov = await db(ctx).movimiento.findUnique({
    where: { id: movimientoId },
    include: {
      categoria: true,
      pagos: { where: { anulado: false } },
      devolucionesSobrante: { where: { anulado: false } },
    },
  });

  if (!mov || mov.anulado) {
    return { exito: false, error: "Movimiento no encontrado o anulado." };
  }

  const esAdmin = puede(ctx, "inscripciones.administrar");
  const esPropioPorValidar =
    mov.enviadoAValidarPorId === ctx.usuario.id &&
    (mov.estadoValidacion === "por_validar" || mov.estadoValidacion === "observado");

  if (!esAdmin && !esPropioPorValidar) {
    return { exito: false, error: "No tienes permiso para corregir el reparto de este movimiento." };
  }

  const asignaciones = nuevoReparto.filter((r) => r.montoClp > 0);
  const totalNuevo = asignaciones.reduce((a, r) => a + r.montoClp, 0);

  const devolucionesTotal = mov.devolucionesSobrante.reduce((a, d) => a + d.montoClp, 0);
  if (totalNuevo + devolucionesTotal > mov.montoClp) {
    return { exito: false, error: "El nuevo reparto supera el monto total del movimiento." };
  }

  try {
    const nuevosPagos = await db(ctx).$transaction(async (tx) => {
      // 1. Anular pagos anteriores
      for (const p of mov.pagos) {
        await tx.pago.update({
          where: { id: p.id },
          data: {
            anulado: true,
            motivoAnulacion: "Corrección de reparto",
            anuladoPorId: ctx.usuario.id,
            anuladoEn: new Date(),
          },
        });
      }

      // 2. Crear nuevos pagos
      const pagos = [];
      for (const item of asignaciones) {
        const ins = await tx.inscripcion.findUnique({
          where: { id: item.id },
          include: { pagos: { where: { anulado: false } } },
        });
        if (!ins || ins.anulado) throw new Error("Inscripción no encontrada.");
        const saldo = Math.max(
          0,
          ins.montoClp - ins.pagos.reduce((a: number, p: any) => a + p.montoClp, 0)
        );
        if (item.montoClp > saldo) throw new Error("El saldo de la inscripción cambió.");

        const p = await tx.pago.create({
          data: {
            organizacionId: ctx.organizacionId,
            movimientoId,
            inscripcionId: item.id,
            montoClp: item.montoClp,
            creadoPorId: ctx.usuario.id,
          },
        });
        pagos.push(p);
      }

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Pago",
          entidadId: movimientoId,
          accion: "corregir_reparto",
          despues: { pagosAnulados: mov.pagos.length, nuevosPagos: pagos.length },
        },
      });

      return pagos;
    });

    revalidarRutasSeguras();
    return { exito: true, pagos: nuevosPagos };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo corregir el reparto." };
  }
}

export async function corregirReparto(
  movimientoId: string,
  nuevoReparto: RepartoItemInput[],
  version?: number
) {
  const ctx = await obtenerContexto();
  return ejecutarCorregirReparto(ctx, movimientoId, nuevoReparto, version);
}

/**
 * 3.7: Desasigna un pago individual (anulación lógica). Solo administrador.
 */
export async function ejecutarDesasignarPago(
  ctx: Contexto,
  pagoId: string,
  motivo: string
) {
  exigir(ctx, "inscripciones.administrar");

  if (!motivo || motivo.trim().length === 0) {
    return { exito: false, error: "El motivo de la desasignación es obligatorio." };
  }

  await exigirDeLaOrganizacion(ctx, "pago", pagoId);

  try {
    await db(ctx).$transaction(async (tx) => {
      const pago = await tx.pago.findUnique({ where: { id: pagoId } });
      if (!pago || pago.anulado) {
        throw new Error("El pago no existe o ya está anulado.");
      }

      await tx.pago.update({
        where: { id: pagoId },
        data: {
          anulado: true,
          motivoAnulacion: motivo.trim(),
          anuladoPorId: ctx.usuario.id,
          anuladoEn: new Date(),
        },
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Pago",
          entidadId: pagoId,
          accion: "desasignar_pago",
          despues: { motivo: motivo.trim(), montoClp: pago.montoClp },
        },
      });
    });

    revalidarRutasSeguras();
    return { exito: true };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo desasignar el pago." };
  }
}

export async function desasignarPago(pagoId: string, motivo: string) {
  const ctx = await obtenerContexto();
  return ejecutarDesasignarPago(ctx, pagoId, motivo);
}
