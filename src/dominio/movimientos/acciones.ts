"use server";

import { revalidatePath } from "next/cache";
import { Prisma, MedioPago } from "@prisma/client";
import { obtenerContexto, db, exigirDeLaOrganizacion, registrarAuditoria } from "@/lib/contexto";
import { Contexto, exigir, esPropio, exigirNoPropio, puede } from "@/lib/permisos";
import {
  movimientoRegistroSchema,
  movimientoEdicionSchema,
  MovimientoRegistroInput,
  validarReglasMovimiento,
  filtroSumable,
  ocultarDatosMovimiento,
} from "./reglas";
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

export interface ArchivoEntrada {
  buffer: Buffer;
  nombre: string;
  tipoMime?: string;
  esComprobantePago?: boolean;
}

/**
 * Server action para registro desde formularios FormData en cliente.
 */
export async function registrarMovimientoAction(formData: FormData) {
  const ctx = await obtenerContexto();

  const datosJson = formData.get("datos");
  if (!datosJson || typeof datosJson !== "string") {
    return { exito: false, error: "Datos del formulario no encontrados." };
  }

  let datos: MovimientoRegistroInput;
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

  return ejecutarRegistrarMovimiento(ctx, datos, archivos);
}

export async function registrarMovimiento(
  datos: MovimientoRegistroInput,
  archivos: ArchivoEntrada[] = []
) {
  const ctx = await obtenerContexto();
  return ejecutarRegistrarMovimiento(ctx, datos, archivos);
}

export async function buscarDuplicados(datos: {
  tipo: "ingreso" | "gasto";
  montoClp: number;
  fecha: string;
  categoriaId?: string | null;
  contraparteId?: string | null;
}) {
  const ctx = await obtenerContexto();
  return buscarPosiblesDuplicados(ctx, datos);
}

export async function editarMovimiento(
  id: string,
  cambios: {
    montoClp: number;
    fecha: string;
    fechaPago?: string | null;
    medioPago?: "transferencia" | "efectivo" | "otro" | null;
    estadoPago: "pagado" | "pendiente";
    categoriaId?: string | null;
    contraparteId?: string | null;
    pagadoPorId?: string | null;
    nombreOrigen?: string | null;
    descripcion?: string | null;
    observacion?: string | null;
    binomioId?: string | null;
    jineteId?: string | null;
    caballoId?: string | null;
    clubId?: string | null;
  },
  version: number
) {
  const ctx = await obtenerContexto();
  return ejecutarEditarMovimiento(ctx, id, cambios, version);
}

export async function reenviarMovimiento(id: string, version: number) {
  const ctx = await obtenerContexto();
  return ejecutarReenviarMovimiento(ctx, id, version);
}

export async function validarMovimiento(
  id: string,
  version: number,
  cambios?: { categoriaId?: string; contraparteId?: string; montoClp?: number }
) {
  const ctx = await obtenerContexto();
  return ejecutarValidarMovimiento(ctx, id, version, cambios);
}

export async function observarMovimiento(id: string, comentario: string, version: number) {
  const ctx = await obtenerContexto();
  return ejecutarObservarMovimiento(ctx, id, comentario, version);
}

export async function clasificarMovimiento(
  id: string,
  categoriaId: string,
  contraparteId?: string | null,
  version?: number
) {
  const ctx = await obtenerContexto();
  return ejecutarClasificarMovimiento(ctx, id, categoriaId, contraparteId, version);
}

export async function anularMovimiento(id: string, motivo: string, version: number) {
  const ctx = await obtenerContexto();
  return ejecutarAnularMovimiento(ctx, id, motivo, version);
}

export async function agregarRespaldoAction(movimientoId: string, formData: FormData) {
  const ctx = await obtenerContexto();
  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return { exito: false, error: "Debes seleccionar un archivo." };
  }

  const arrayBuffer = await file.arrayBuffer();
  return ejecutarAgregarRespaldo(ctx, movimientoId, {
    buffer: Buffer.from(arrayBuffer),
    nombre: file.name,
    tipoMime: file.type,
  });
}

export async function anularRespaldo(
  respaldoId: string,
  motivo: string,
  justificacionSinRespaldo?: string
) {
  const ctx = await obtenerContexto();
  return ejecutarAnularRespaldo(ctx, respaldoId, motivo, justificacionSinRespaldo);
}

export async function marcarRespaldoVisto(respaldoId: string) {
  const ctx = await obtenerContexto();
  return ejecutarMarcarRespaldoVisto(ctx, respaldoId);
}

export async function obtenerResumenPendientes(usuarioId: string) {
  const ctx = await obtenerContexto();
  return resumenPendientesDe(ctx, usuarioId);
}

/**
 * 4.3 y 3.1: Registra un movimiento de tesorería (Gasto o Ingreso) con idempotencia,
 * autovalidación para administradores y persistencia atómica de respaldos.
 */
export async function ejecutarRegistrarMovimiento(
  ctx: Contexto,
  datosEntrada: MovimientoRegistroInput,
  archivos: ArchivoEntrada[] = []
) {
  exigir(ctx, "registrar");

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return {
      exito: false,
      error: "No hay un evento abierto vigente para registrar movimientos.",
    };
  }

  const parseado = movimientoRegistroSchema.safeParse(datosEntrada);
  if (!parseado.success) {
    return {
      exito: false,
      error: parseado.error.issues[0]?.message || "Datos del movimiento no válidos.",
    };
  }
  const datos = parseado.data;

  // Idempotencia por claveCliente
  const existente = await db(ctx).movimiento.findUnique({
    where: {
      organizacionId_claveCliente: {
        organizacionId: ctx.organizacionId,
        claveCliente: datos.claveCliente,
      },
    },
    include: { respaldos: true },
  });

  if (existente) {
    if (existente.registradoPorId === ctx.usuario.id) {
      return {
        exito: true,
        movimiento: ocultarDatosMovimiento(ctx, existente),
        reintento: true,
      };
    }
    return {
      exito: false,
      error: "La clave de transacción ya fue utilizada por otro usuario.",
    };
  }

  // Validar categoría si existe
  let categoria: { exigeContraparte: boolean; claveSistema: string | null } | null = null;
  if (datos.categoriaId) {
    await exigirDeLaOrganizacion(ctx, "categoria", datos.categoriaId);
    categoria = await db(ctx).categoria.findUnique({
      where: { id: datos.categoriaId },
      select: { exigeContraparte: true, claveSistema: true },
    });
  }

  // Validar contraparte si existe
  if (datos.contraparteId) {
    await exigirDeLaOrganizacion(ctx, "contraparte", datos.contraparteId);
  }

  // Validar miembro pagador (reembolso en gastos)
  if (datos.pagadoPorId) {
    if (ctx.rol !== "administrador" && datos.pagadoPorId !== ctx.usuario.id) {
      return {
        exito: false,
        error: "Como ayudante solo puedes registrar reembolsos a tu nombre.",
      };
    }
    const miembro = await db(ctx).membresia.findFirst({
      where: { usuarioId: datos.pagadoPorId, estado: "activa" },
    });
    if (!miembro) {
      return {
        exito: false,
        error: "El miembro seleccionado para reembolso no tiene membresía activa.",
      };
    }
  }

  // Validar formato de archivos antes de cualquier operación
  const archivosValidados: {
    buffer: Buffer;
    tipoMime: "image/jpeg" | "image/png" | "application/pdf";
    extension: "jpg" | "png" | "pdf";
    esComprobantePago?: boolean;
  }[] = [];

  for (const arch of archivos) {
    const validacion = validarMagicBytesRespaldo(arch.buffer);
    if (!validacion.valido || !validacion.tipoMime || !validacion.extension) {
      return {
        exito: false,
        error: validacion.error || `Archivo '${arch.nombre}' no válido.`,
      };
    }
    archivosValidados.push({
      buffer: arch.buffer,
      tipoMime: validacion.tipoMime,
      extension: validacion.extension,
      esComprobantePago: arch.esComprobantePago,
    });
  }

  // Validar referencias operativas opcionales si vienen
  if (datos.caballoId) await exigirDeLaOrganizacion(ctx, "caballo", datos.caballoId);
  if (datos.jineteId) await exigirDeLaOrganizacion(ctx, "jinete", datos.jineteId);
  if (datos.clubId) await exigirDeLaOrganizacion(ctx, "club", datos.clubId);
  if (datos.binomioId) await exigirDeLaOrganizacion(ctx, "binomio", datos.binomioId);
  if (datos.pruebaId) await exigirDeLaOrganizacion(ctx, "prueba", datos.pruebaId);

  // Herencia automática de entidades deportivas
  let binomioId = datos.binomioId || null;
  let jineteId = datos.jineteId || null;
  let caballoId = datos.caballoId || null;
  let clubId = datos.clubId || null;
  let pruebaId = datos.pruebaId || null;

  if (binomioId) {
    const bin = await db(ctx).binomio.findUnique({
      where: { id: binomioId },
      select: { id: true, jineteId: true, caballoId: true, clubId: true },
    });
    if (bin) {
      jineteId = jineteId || bin.jineteId;
      caballoId = caballoId || bin.caballoId;
      clubId = clubId || bin.clubId;
    }
  } else if (caballoId && !clubId) {
    const cab = await db(ctx).caballo.findUnique({
      where: { id: caballoId },
      select: { clubId: true },
    });
    if (cab?.clubId) clubId = cab.clubId;
  } else if (jineteId && !clubId) {
    const jin = await db(ctx).jinete.findUnique({
      where: { id: jineteId },
      select: { clubId: true },
    });
    if (jin?.clubId) clubId = jin.clubId;
  }

  // Validar reglas de dominio integradas
  const validacionReglas = validarReglasMovimiento(
    {
      ...datos,
      binomioId,
      jineteId,
      caballoId,
      clubId,
      pruebaId,
    },
    categoria,
    archivosValidados.length > 0
  );
  if (!validacionReglas.valido) {
    return {
      exito: false,
      error: validacionReglas.error || "Datos del movimiento no válidos.",
    };
  }

  // Estado de pago: si es gasto pagado por una persona, nace pendiente como reembolso
  const esReembolso = datos.tipo === "gasto" && Boolean(datos.pagadoPorId);
  const estadoPago = esReembolso ? "pendiente" : datos.estadoPago;
  const naturaleza = datos.naturaleza ?? "dinero";

  // Estado de validación:
  // Administrador -> validado (salvo si es sinIdentificar)
  // Ayudante o sinIdentificar -> por_validar
  const puedeAutoValidar = puede(ctx, "validar") && !datos.sinIdentificar;
  const estadoValidacion = puedeAutoValidar ? "validado" : "por_validar";

  const archivosEscritos: string[] = [];

  try {
    const nuevoMovimiento = await db(ctx).$transaction(async (tx) => {
      const mov = await tx.movimiento.create({
        data: {
          organizacionId: ctx.organizacionId,
          eventoId: ctx.evento!.id,
          tipo: datos.tipo,
          naturaleza,
          montoClp: datos.montoClp,
          montoOriginalClp: datos.montoClp,
          fecha: new Date(`${datos.fecha}T00:00:00Z`),
          fechaPago:
            estadoPago === "pagado"
              ? new Date(`${datos.fechaPago || datos.fecha}T00:00:00Z`)
              : null,
          medioPago:
            estadoPago === "pagado" && naturaleza === "dinero"
              ? datos.medioPago
              : null,
          estadoPago,
          categoriaId: datos.sinIdentificar ? null : datos.categoriaId,
          sinIdentificar: datos.sinIdentificar,
          contraparteId: datos.contraparteId || null,
          pagadoPorId: datos.tipo === "gasto" ? (datos.pagadoPorId || null) : null,
          nombreOrigen: datos.tipo === "ingreso" ? (datos.nombreOrigen || null) : null,
          descripcion: datos.descripcion || null,
          observacion: datos.observacion || null,
          sinRespaldo: datos.sinRespaldo,
          estadoValidacion,
          enviadoAValidarPorId: estadoValidacion === "por_validar" ? ctx.usuario.id : null,
          validadoPorId: estadoValidacion === "validado" ? ctx.usuario.id : null,
          validadoEn: estadoValidacion === "validado" ? new Date() : null,
          registradoPorId: ctx.usuario.id,
          claveCliente: datos.claveCliente,
          binomioId,
          jineteId,
          caballoId,
          clubId,
          pruebaId,
        },
      });

      // Crear registros y archivos de respaldo
      for (const arch of archivosValidados) {
        const respaldo = await tx.respaldo.create({
          data: {
            organizacionId: ctx.organizacionId,
            movimientoId: mov.id,
            ruta: "temporal",
            tipoMime: arch.tipoMime,
            bytes: arch.buffer.length,
            esComprobantePago: arch.esComprobantePago ?? false,
            subidoPorId: ctx.usuario.id,
          },
        });

        const rutaRelativa = construirRutaRelativaRespaldo(
          ctx.organizacionId,
          mov.id,
          respaldo.id,
          arch.extension
        );

        await tx.respaldo.update({
          where: { id: respaldo.id },
          data: { ruta: rutaRelativa },
        });

        // Guardar archivo físico
        await guardarArchivoRespaldo(rutaRelativa, arch.buffer);
        archivosEscritos.push(rutaRelativa);
      }

      // Procesar reparto a inscripciones si fue especificado
      if (datos.repartoInscripciones && datos.repartoInscripciones.length > 0) {
        const asignaciones = datos.repartoInscripciones.filter((r) => r.montoClp > 0);
        const totalAsignado = asignaciones.reduce((acc, r) => acc + r.montoClp, 0);

        if (totalAsignado > datos.montoClp) {
          throw new Error("La suma asignada a las inscripciones no puede superar el monto del pago.");
        }

        for (const item of asignaciones) {
          await exigirDeLaOrganizacion(ctx, "inscripcion", item.id);
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
            throw new Error("El saldo de una de las pruebas cambió. Por favor verifica los montos.");
          }

          await tx.pago.create({
            data: {
              organizacionId: ctx.organizacionId,
              movimientoId: mov.id,
              inscripcionId: item.id,
              montoClp: item.montoClp,
              creadoPorId: ctx.usuario.id,
            },
          });
        }
      }

      // Registro de auditoría
      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Movimiento",
          entidadId: mov.id,
          accion: "crear",
          despues: {
            id: mov.id,
            tipo: mov.tipo,
            montoClp: mov.montoClp,
            estadoValidacion: mov.estadoValidacion,
            autovalidado: estadoValidacion === "validado",
            sinRespaldo: mov.sinRespaldo,
            cantidadRespaldos: archivosValidados.length,
          } as Prisma.InputJsonValue,
        },
      });

      return mov;
    });

    revalidarRutaSegura("/movimientos");
    revalidarRutaSegura("/movimientos/validar");
    if (datos.repartoInscripciones && datos.repartoInscripciones.length > 0) {
      revalidarRutaSegura("/inscripciones");
    }

    return {
      exito: true,
      movimiento: ocultarDatosMovimiento(ctx, nuevoMovimiento),
    };
  } catch (error: any) {
    // Si algo falló, limpiar archivos escritos
    for (const ruta of archivosEscritos) {
      await eliminarArchivoRespaldo(ruta);
    }
    console.error("Error al registrar movimiento:", error);
    return {
      exito: false,
      error: error?.message || "No se pudo registrar el movimiento.",
    };
  }
}

/**
 * 4.3 y 3.1: Detección de posibles duplicados (±1 día, mismo monto y tipo, misma contraparte o categoría).
 */
export async function buscarPosiblesDuplicados(
  ctx: Contexto,
  datos: {
    tipo: "ingreso" | "gasto";
    montoClp: number;
    fecha: string;
    categoriaId?: string | null;
    contraparteId?: string | null;
  }
) {
  exigir(ctx, "registrar");

  if (!ctx.evento) return [];

  const fechaBase = new Date(`${datos.fecha}T00:00:00Z`);
  const diaMenos = new Date(fechaBase.getTime() - 24 * 60 * 60 * 1000);
  const diaMas = new Date(fechaBase.getTime() + 24 * 60 * 60 * 1000);

  const orConditions: Prisma.MovimientoWhereInput[] = [];
  if (datos.categoriaId) {
    orConditions.push({ categoriaId: datos.categoriaId });
  }
  if (datos.contraparteId) {
    orConditions.push({ contraparteId: datos.contraparteId });
  }

  if (orConditions.length === 0) {
    return [];
  }

  const candidatos = await db(ctx).movimiento.findMany({
    where: {
      eventoId: ctx.evento.id,
      tipo: datos.tipo,
      montoClp: datos.montoClp,
      anulado: false,
      fecha: {
        gte: diaMenos,
        lte: diaMas,
      },
      OR: orConditions,
    },
    take: 3,
    include: {
      categoria: true,
      contraparte: true,
      respaldos: {
        where: { anulado: false },
      },
    },
    orderBy: { creadoEn: "desc" },
  });

  return candidatos.map((m) => ocultarDatosMovimiento(ctx, m));
}

/**
 * 4.3 y 3.11: Edita un movimiento existente respetando permisos, versiones y auditoría diff.
 */
export async function ejecutarEditarMovimiento(
  ctx: Contexto,
  id: string,
  cambios: {
    montoClp: number;
    fecha: string;
    fechaPago?: string | null;
    medioPago?: "transferencia" | "efectivo" | "otro" | null;
    estadoPago: "pagado" | "pendiente";
    categoriaId?: string | null;
    contraparteId?: string | null;
    pagadoPorId?: string | null;
    nombreOrigen?: string | null;
    descripcion?: string | null;
    observacion?: string | null;
    binomioId?: string | null;
    jineteId?: string | null;
    caballoId?: string | null;
    clubId?: string | null;
  },
  version: number
) {
  const mov = await db(ctx).movimiento.findUnique({
    where: { id },
    include: { categoria: true, contraparte: true },
  });

  if (!mov || mov.anulado) {
    return { exito: false, error: "El movimiento no existe o está anulado." };
  }

  if (mov.version !== version) {
    return {
      exito: false,
      error: "El movimiento fue modificado por otro usuario. Por favor recarga los datos.",
    };
  }

  // Verificación de permisos
  if (mov.estadoValidacion === "validado") {
    exigir(ctx, "editar_validado");
  } else {
    // por_validar u observado
    exigir(ctx, "editar_propio_no_validado");
    if (!esPropio(ctx, mov)) {
      return {
        exito: false,
        error: "Solo puedes editar movimientos propios pendientes de validación.",
      };
    }
  }

  // Validar referencias
  let categoria = mov.categoria;
  if (cambios.categoriaId && cambios.categoriaId !== mov.categoriaId) {
    await exigirDeLaOrganizacion(ctx, "categoria", cambios.categoriaId);
    categoria = await db(ctx).categoria.findUnique({
      where: { id: cambios.categoriaId },
    });
  }

  if (cambios.contraparteId && cambios.contraparteId !== mov.contraparteId) {
    await exigirDeLaOrganizacion(ctx, "contraparte", cambios.contraparteId);
  }

  if (cambios.caballoId && cambios.caballoId !== mov.caballoId) {
    await exigirDeLaOrganizacion(ctx, "caballo", cambios.caballoId);
  }
  if (cambios.jineteId && cambios.jineteId !== mov.jineteId) {
    await exigirDeLaOrganizacion(ctx, "jinete", cambios.jineteId);
  }
  if (cambios.clubId && cambios.clubId !== mov.clubId) {
    await exigirDeLaOrganizacion(ctx, "club", cambios.clubId);
  }
  if (cambios.binomioId && cambios.binomioId !== mov.binomioId) {
    await exigirDeLaOrganizacion(ctx, "binomio", cambios.binomioId);
  }

  const validado = movimientoEdicionSchema.safeParse({
    id,
    version,
    ...cambios,
  });

  if (!validado.success) {
    return {
      exito: false,
      error: validado.error.errors[0]?.message || "Datos inválidos.",
    };
  }

  // Si un ayudante edita un movimiento observado, pasa a por_validar
  let nuevoEstadoValidacion = mov.estadoValidacion;
  let enviadoAValidarPorId = mov.enviadoAValidarPorId;
  if (mov.estadoValidacion === "observado") {
    nuevoEstadoValidacion = "por_validar";
    enviadoAValidarPorId = ctx.usuario.id;
  }

  const antes = {
    montoClp: mov.montoClp,
    fecha: mov.fecha,
    fechaPago: mov.fechaPago,
    medioPago: mov.medioPago,
    estadoPago: mov.estadoPago,
    categoriaId: mov.categoriaId,
    contraparteId: mov.contraparteId,
    descripcion: mov.descripcion,
    observacion: mov.observacion,
    binomioId: mov.binomioId,
    jineteId: mov.jineteId,
    caballoId: mov.caballoId,
    clubId: mov.clubId,
  };

  const despues = {
    montoClp: cambios.montoClp,
    fecha: new Date(`${cambios.fecha}T00:00:00Z`),
    fechaPago: cambios.fechaPago ? new Date(`${cambios.fechaPago}T00:00:00Z`) : null,
    medioPago: cambios.medioPago || null,
    estadoPago: cambios.estadoPago,
    categoriaId: cambios.categoriaId || null,
    contraparteId: cambios.contraparteId || null,
    descripcion: cambios.descripcion || null,
    observacion: cambios.observacion || null,
    binomioId: cambios.binomioId !== undefined ? cambios.binomioId : mov.binomioId,
    jineteId: cambios.jineteId !== undefined ? cambios.jineteId : mov.jineteId,
    caballoId: cambios.caballoId !== undefined ? cambios.caballoId : mov.caballoId,
    clubId: cambios.clubId !== undefined ? cambios.clubId : mov.clubId,
  };

  const actualizado = await db(ctx).$transaction(async (tx) => {
    const res = await tx.movimiento.update({
      where: { id, organizacionId: ctx.organizacionId },
      data: {
        ...despues,
        estadoValidacion: nuevoEstadoValidacion,
        enviadoAValidarPorId,
        version: { increment: 1 },
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Movimiento",
        entidadId: id,
        accion: "modificar",
        antes: antes as unknown as Prisma.InputJsonValue,
        despues: despues as unknown as Prisma.InputJsonValue,
      },
    });

    return res;
  });

  revalidarRutaSegura("/movimientos");
  revalidarRutaSegura(`/movimientos/${id}`);

  return { exito: true, movimiento: ocultarDatosMovimiento(ctx, actualizado) };
}

/**
 * 4.3 y 3.4: Reenvía un movimiento observado a la bandeja de validación.
 */
export async function ejecutarReenviarMovimiento(ctx: Contexto, id: string, version: number) {
  exigir(ctx, "editar_propio_no_validado");

  const mov = await db(ctx).movimiento.findUnique({ where: { id } });
  if (!mov || mov.anulado) {
    return { exito: false, error: "Movimiento no encontrado." };
  }

  if (!esPropio(ctx, mov)) {
    return { exito: false, error: "Solo puedes reenviar movimientos propios." };
  }

  if (mov.estadoValidacion !== "observado") {
    return { exito: false, error: "El movimiento no está en estado observado." };
  }

  if (mov.version !== version) {
    return { exito: false, error: "El movimiento ha sido modificado por otro usuario." };
  }

  const actualizado = await db(ctx).$transaction(async (tx) => {
    const res = await tx.movimiento.update({
      where: { id, organizacionId: ctx.organizacionId },
      data: {
        estadoValidacion: "por_validar",
        enviadoAValidarPorId: ctx.usuario.id,
        version: { increment: 1 },
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Movimiento",
        entidadId: id,
        accion: "reenviar",
        despues: { estadoValidacion: "por_validar" },
      },
    });

    return res;
  });

  revalidarRutaSegura("/movimientos");
  revalidarRutaSegura(`/movimientos/${id}`);

  return { exito: true, movimiento: ocultarDatosMovimiento(ctx, actualizado) };
}

/**
 * 4.4 y 3.4: Valida un movimiento revisado. Bloquea la autovalidación de lo propio (exigirNoPropio).
 * Si es un abono, descuenta el saldo del movimiento original de forma atómica.
 */
export async function ejecutarValidarMovimiento(
  ctx: Contexto,
  id: string,
  version: number,
  cambios?: { categoriaId?: string; contraparteId?: string; montoClp?: number }
) {
  try {
    exigir(ctx, "validar");

    const mov = await db(ctx).movimiento.findUnique({
      where: { id },
      include: { abonoDe: true },
    });

    if (!mov || mov.anulado) {
      return { exito: false, error: "Movimiento no encontrado o anulado." };
    }

    if (mov.version !== version) {
      return { exito: false, error: "El movimiento fue modificado por otro usuario." };
    }

    exigirNoPropio(ctx, mov);

    if (mov.sinIdentificar || !mov.categoriaId) {
      return {
        exito: false,
        error: "Un movimiento sin identificar no puede validarse sin clasificar su categoría.",
      };
    }

    const actualizado = await db(ctx).$transaction(async (tx) => {
      // Si el movimiento es un abono pendiente de validar, descontar del original con bloqueo
      if (mov.abonoDeId) {
        const original = await tx.movimiento.findUnique({
          where: { id: mov.abonoDeId, organizacionId: ctx.organizacionId },
        });

        if (!original || original.anulado) {
          throw new Error("El movimiento original del abono no existe o fue anulado.");
        }

        if (original.estadoPago === "pagado") {
          throw new Error("El movimiento original ya se encuentra totalmente pagado.");
        }

        if (mov.montoClp >= original.montoClp) {
          throw new Error("El abono no puede ser igual o mayor al saldo total vigente del original.");
        }

        const nuevoSaldoOriginal = original.montoClp - mov.montoClp;

        await tx.movimiento.update({
          where: { id: original.id, organizacionId: ctx.organizacionId },
          data: {
            montoClp: nuevoSaldoOriginal,
            version: { increment: 1 },
          },
        });

        await tx.registroAuditoria.create({
          data: {
            organizacionId: ctx.organizacionId,
            usuarioId: ctx.usuario.id,
            entidad: "Movimiento",
            entidadId: original.id,
            accion: "aplicar_abono",
            antes: { montoClp: original.montoClp },
            despues: { montoClp: nuevoSaldoOriginal, abonoId: mov.id, montoAbono: mov.montoClp },
          },
        });
      }

      const dataActualizacion: Prisma.MovimientoUpdateInput = {
        estadoValidacion: "validado",
        validadoPor: { connect: { id: ctx.usuario.id } },
        validadoEn: new Date(),
        version: { increment: 1 },
      };

      if (cambios?.categoriaId) {
        dataActualizacion.categoria = { connect: { id: cambios.categoriaId } };
      }
      if (cambios?.contraparteId) {
        dataActualizacion.contraparte = { connect: { id: cambios.contraparteId } };
      }
      if (cambios?.montoClp) {
        dataActualizacion.montoClp = cambios.montoClp;
      }

      const res = await tx.movimiento.update({
        where: { id, organizacionId: ctx.organizacionId },
        data: dataActualizacion,
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Movimiento",
          entidadId: id,
          accion: "validar",
          despues: {
            estadoValidacion: "validado",
            validadoPorId: ctx.usuario.id,
            validadoEn: res.validadoEn,
          },
        },
      });

      return res;
    });

    revalidarRutaSegura("/movimientos");
    revalidarRutaSegura("/movimientos/validar");
    revalidarRutaSegura(`/movimientos/${id}`);

    return { exito: true, movimiento: ocultarDatosMovimiento(ctx, actualizado) };
  } catch (error: any) {
    return {
      exito: false,
      error: error?.message || "No se pudo validar el movimiento.",
    };
  }
}

/**
 * 4.4 y 3.4: Observa un movimiento devolviéndolo al autor con comentario obligatorio.
 */
export async function ejecutarObservarMovimiento(
  ctx: Contexto,
  id: string,
  comentario: string,
  version: number
) {
  exigir(ctx, "validar");

  if (!comentario || comentario.trim().length === 0) {
    return { exito: false, error: "El comentario de observación es obligatorio." };
  }

  if (comentario.length > 300) {
    return { exito: false, error: "El comentario no puede superar los 300 caracteres." };
  }

  const mov = await db(ctx).movimiento.findUnique({ where: { id } });
  if (!mov || mov.anulado) {
    return { exito: false, error: "Movimiento no encontrado." };
  }

  if (mov.version !== version) {
    return { exito: false, error: "El movimiento fue modificado por otro usuario." };
  }

  exigirNoPropio(ctx, mov);

  const actualizado = await db(ctx).$transaction(async (tx) => {
    const res = await tx.movimiento.update({
      where: { id, organizacionId: ctx.organizacionId },
      data: {
        estadoValidacion: "observado",
        comentarioObservacion: comentario.trim(),
        version: { increment: 1 },
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Movimiento",
        entidadId: id,
        accion: "observar",
        despues: {
          estadoValidacion: "observado",
          comentarioObservacion: comentario.trim(),
        },
      },
    });

    return res;
  });

  revalidarRutaSegura("/movimientos");
  revalidarRutaSegura("/movimientos/validar");
  revalidarRutaSegura(`/movimientos/${id}`);

  return { exito: true, movimiento: ocultarDatosMovimiento(ctx, actualizado) };
}

/**
 * 4.3 y 3.3: Clasifica un ingreso sin identificar asignándole categoría y contraparte.
 */
export async function ejecutarClasificarMovimiento(
  ctx: Contexto,
  id: string,
  categoriaId: string,
  contraparteId?: string | null,
  version?: number
) {
  exigir(ctx, "validar");

  const mov = await db(ctx).movimiento.findUnique({ where: { id } });
  if (!mov || mov.anulado) {
    return { exito: false, error: "Movimiento no encontrado o anulado." };
  }

  if (version !== undefined && mov.version !== version) {
    return { exito: false, error: "El movimiento fue modificado por otro usuario." };
  }

  await exigirDeLaOrganizacion(ctx, "categoria", categoriaId);
  const cat = await db(ctx).categoria.findUnique({ where: { id: categoriaId } });
  if (cat?.claveSistema === "inscripciones" || cat?.claveSistema === "devoluciones") {
    return { exito: false, error: "No se puede clasificar en una categoría de sistema." };
  }

  if (contraparteId) {
    await exigirDeLaOrganizacion(ctx, "contraparte", contraparteId);
  }

  const actualizado = await db(ctx).$transaction(async (tx) => {
    const res = await tx.movimiento.update({
      where: { id, organizacionId: ctx.organizacionId },
      data: {
        categoriaId,
        contraparteId: contraparteId || null,
        sinIdentificar: false,
        version: { increment: 1 },
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Movimiento",
        entidadId: id,
        accion: "clasificar",
        despues: { categoriaId, contraparteId, sinIdentificar: false },
      },
    });

    return res;
  });

  revalidarRutaSegura("/movimientos");
  revalidarRutaSegura(`/movimientos/${id}`);

  return { exito: true, movimiento: ocultarDatosMovimiento(ctx, actualizado) };
}

/**
 * 4.3 y 3.7: Anula un movimiento con motivo obligatorio.
 * Restituye saldo si era un abono validado, y ejecuta cascada a pagos/devoluciones si existieran.
 */
export async function ejecutarAnularMovimiento(
  ctx: Contexto,
  id: string,
  motivo: string,
  version: number
) {
  if (!motivo || motivo.trim().length === 0) {
    return { exito: false, error: "El motivo de anulación es obligatorio." };
  }
  if (motivo.length > 300) {
    return { exito: false, error: "El motivo de anulación no puede superar los 300 caracteres." };
  }

  const mov = await db(ctx).movimiento.findUnique({
    where: { id },
    include: { abonoDe: true, abonos: { where: { anulado: false } } },
  });

  if (!mov || mov.anulado) {
    return { exito: false, error: "El movimiento no existe o ya fue anulado." };
  }

  if (mov.version !== version) {
    return { exito: false, error: "El movimiento fue modificado por otro usuario." };
  }

  // Verificación de permisos:
  // Administrador -> puede anular cualquiera no anulado
  // Ayudante -> solo propio en por_validar que nunca fue validado
  if (ctx.rol === "administrador") {
    exigir(ctx, "anular");
  } else {
    exigir(ctx, "anular_propio_por_validar");
    if (mov.registradoPorId !== ctx.usuario.id) {
      return { exito: false, error: "Solo puedes anular movimientos que tú mismo registraste." };
    }
    if (mov.estadoValidacion !== "por_validar" || mov.validadoEn !== null) {
      return { exito: false, error: "Solo puedes anular movimientos propios que nunca hayan sido validados." };
    }
  }

  const anulado = await db(ctx).$transaction(async (tx) => {
    // Si es un abono validado, restituir el saldo al movimiento original
    if (mov.abonoDeId && mov.estadoValidacion === "validado") {
      const original = await tx.movimiento.findUnique({
        where: { id: mov.abonoDeId, organizacionId: ctx.organizacionId },
      });

      if (original) {
        if (original.estadoPago === "pagado") {
          throw new Error(
            "No se puede anular un abono cuyo movimiento original ya está pagado totalmente. Primero devuelve el original a pendiente."
          );
        }

        const saldoRestituido = original.montoClp + mov.montoClp;
        await tx.movimiento.update({
          where: { id: original.id, organizacionId: ctx.organizacionId },
          data: {
            montoClp: saldoRestituido,
            version: { increment: 1 },
          },
        });

        await tx.registroAuditoria.create({
          data: {
            organizacionId: ctx.organizacionId,
            usuarioId: ctx.usuario.id,
            entidad: "Movimiento",
            entidadId: original.id,
            accion: "restituir_saldo_abono",
            despues: { montoClp: saldoRestituido, abonoAnuladoId: mov.id },
          },
        });
      }
    }

    // Cascada a pagos o devoluciones asociados
    const pagosAsociados = await tx.pago.findMany({
      where: { movimientoId: id, organizacionId: ctx.organizacionId, anulado: false },
    });
    for (const p of pagosAsociados) {
      await tx.pago.update({
        where: { id: p.id },
        data: {
          anulado: true,
          motivoAnulacion: `Anulado por cascada de movimiento: ${motivo.trim()}`,
          anuladoPorId: ctx.usuario.id,
          anuladoEn: new Date(),
        },
      });
      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Pago",
          entidadId: p.id,
          accion: "anular_cascada",
          despues: { motivo: motivo.trim() },
        },
      });
    }

    const devolucionesAsociadas = await tx.devolucion.findMany({
      where: { movimientoId: id, organizacionId: ctx.organizacionId, anulado: false },
    });
    for (const d of devolucionesAsociadas) {
      await tx.devolucion.update({
        where: { id: d.id },
        data: {
          anulado: true,
          motivoAnulacion: `Anulada por cascada de movimiento: ${motivo.trim()}`,
          anuladoPorId: ctx.usuario.id,
          anuladoEn: new Date(),
        },
      });
      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Devolucion",
          entidadId: d.id,
          accion: "anular_cascada",
          despues: { motivo: motivo.trim() },
        },
      });
    }

    const res = await tx.movimiento.update({
      where: { id, organizacionId: ctx.organizacionId },
      data: {
        anulado: true,
        motivoAnulacion: motivo.trim(),
        anuladoPorId: ctx.usuario.id,
        anuladoEn: new Date(),
        version: { increment: 1 },
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Movimiento",
        entidadId: id,
        accion: "anular",
        despues: {
          anulado: true,
          motivoAnulacion: motivo.trim(),
          anuladoPorId: ctx.usuario.id,
          anuladoEn: res.anuladoEn,
        },
      },
    });

    return res;
  });

  revalidarRutaSegura("/movimientos");
  revalidarRutaSegura(`/movimientos/${id}`);

  return { exito: true, movimiento: ocultarDatosMovimiento(ctx, anulado) };
}

/**
 * 4.2 y 3.9: Agrega un respaldo a un movimiento existente.
 * Si el movimiento es validado y lo agrega un ayudante, queda marcado como 'esNuevo'.
 */
export async function ejecutarAgregarRespaldo(
  ctx: Contexto,
  movimientoId: string,
  archivo: ArchivoEntrada
) {
  exigir(ctx, "registrar");

  const mov = await db(ctx).movimiento.findUnique({
    where: { id: movimientoId },
  });

  if (!mov || mov.anulado) {
    return { exito: false, error: "El movimiento no existe o está anulado." };
  }

  const validacion = validarMagicBytesRespaldo(archivo.buffer);
  if (!validacion.valido || !validacion.tipoMime || !validacion.extension) {
    return { exito: false, error: validacion.error || "Archivo no válido." };
  }

  const esNuevo = ctx.rol === "ayudante" && mov.estadoValidacion === "validado";
  let rutaCreada = "";

  try {
    const respaldo = await db(ctx).$transaction(async (tx) => {
      const resp = await tx.respaldo.create({
        data: {
          organizacionId: ctx.organizacionId,
          movimientoId,
          ruta: "temporal",
          tipoMime: validacion.tipoMime!,
          bytes: archivo.buffer.length,
          esComprobantePago: archivo.esComprobantePago ?? false,
          esNuevo,
          subidoPorId: ctx.usuario.id,
        },
      });

      const rutaRelativa = construirRutaRelativaRespaldo(
        ctx.organizacionId,
        movimientoId,
        resp.id,
        validacion.extension!
      );

      await tx.respaldo.update({
        where: { id: resp.id },
        data: { ruta: rutaRelativa },
      });

      await guardarArchivoRespaldo(rutaRelativa, archivo.buffer);
      rutaCreada = rutaRelativa;

      // Si el movimiento estaba sinRespaldo, se quita la marca automáticamente
      if (mov.sinRespaldo) {
        await tx.movimiento.update({
          where: { id: movimientoId, organizacionId: ctx.organizacionId },
          data: { sinRespaldo: false },
        });
      }

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Respaldo",
          entidadId: resp.id,
          accion: "agregar_respaldo",
          despues: {
            movimientoId,
            esNuevo,
            bytes: archivo.buffer.length,
            tipoMime: validacion.tipoMime,
          },
        },
      });

      return resp;
    });

    revalidarRutaSegura(`/movimientos/${movimientoId}`);
    return { exito: true, respaldo };
  } catch (error: any) {
    if (rutaCreada) {
      await eliminarArchivoRespaldo(rutaCreada);
    }
    return { exito: false, error: error?.message || "No se pudo agregar el respaldo." };
  }
}

/**
 * 3.9: Anula un archivo de respaldo.
 * Exige mantener al menos un respaldo activo o marcar sinRespaldo con justificación.
 */
export async function ejecutarAnularRespaldo(
  ctx: Contexto,
  respaldoId: string,
  motivo: string,
  justificacionSinRespaldo?: string
) {
  if (!motivo || motivo.trim().length === 0) {
    return { exito: false, error: "El motivo de anulación es obligatorio." };
  }

  const respaldo = await db(ctx).respaldo.findUnique({
    where: { id: respaldoId },
    include: { movimiento: { include: { respaldos: { where: { anulado: false } } } } },
  });

  if (!respaldo || respaldo.anulado) {
    return { exito: false, error: "El respaldo no existe o ya fue anulado." };
  }

  const mov = respaldo.movimiento;
  if (!mov || mov.anulado) {
    return { exito: false, error: "El movimiento asociado no existe o está anulado." };
  }

  // Verificación de permisos
  if (ctx.rol === "administrador") {
    exigir(ctx, "anular");
  } else {
    // Ayudante: solo en movimientos propios por validar u observados
    if (mov.registradoPorId !== ctx.usuario.id || mov.estadoValidacion === "validado") {
      return { exito: false, error: "No tienes permiso para anular este respaldo." };
    }
  }

  // Si es el único respaldo activo
  const otrosRespaldos = mov.respaldos.filter((r) => r.id !== respaldoId);
  if (otrosRespaldos.length === 0 && !mov.sinRespaldo) {
    if (!justificacionSinRespaldo?.trim()) {
      return {
        exito: false,
        error: "Al anular el único respaldo, debes ingresar una justificación para marcar el movimiento 'Sin respaldo'.",
      };
    }
  }

  await db(ctx).$transaction(async (tx) => {
    await tx.respaldo.update({
      where: { id: respaldoId, organizacionId: ctx.organizacionId },
      data: {
        anulado: true,
        motivoAnulacion: motivo.trim(),
        anuladoPorId: ctx.usuario.id,
        anuladoEn: new Date(),
      },
    });

    if (otrosRespaldos.length === 0 && !mov.sinRespaldo && justificacionSinRespaldo) {
      await tx.movimiento.update({
        where: { id: mov.id, organizacionId: ctx.organizacionId },
        data: {
          sinRespaldo: true,
          observacion: justificacionSinRespaldo.trim(),
        },
      });
    }

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Respaldo",
        entidadId: respaldoId,
        accion: "anular_respaldo",
        despues: { motivo: motivo.trim() },
      },
    });
  });

  revalidarRutaSegura(`/movimientos/${mov.id}`);
  return { exito: true };
}

/**
 * 3.4: Marca como visto un respaldo nuevo agregado por un ayudante a un movimiento ya validado.
 */
export async function ejecutarMarcarRespaldoVisto(ctx: Contexto, respaldoId: string) {
  exigir(ctx, "validar");

  const respaldo = await db(ctx).respaldo.findUnique({ where: { id: respaldoId } });
  if (!respaldo || !respaldo.esNuevo) {
    return { exito: false, error: "Respaldo no encontrado o no está marcado como nuevo." };
  }

  await db(ctx).$transaction(async (tx) => {
    await tx.respaldo.update({
      where: { id: respaldoId, organizacionId: ctx.organizacionId },
      data: {
        esNuevo: false,
        vistoPorId: ctx.usuario.id,
        vistoEn: new Date(),
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Respaldo",
        entidadId: respaldoId,
        accion: "marcar_visto",
        despues: { vistoPorId: ctx.usuario.id, vistoEn: new Date() },
      },
    });
  });

  revalidarRutaSegura("/movimientos/validar");
  return { exito: true };
}

/**
 * 5.3: Resumen de pendientes de un usuario para advertencias de revocación y bloque 'Lo mío'.
 */
export async function resumenPendientesDe(ctx: Contexto, usuarioId: string) {
  if (ctx.usuario.id !== usuarioId) {
    exigir(ctx, "gestionar_accesos");
  }

  const [porValidar, observados, reembolsos] = await Promise.all([
    db(ctx).movimiento.count({
      where: {
        enviadoAValidarPorId: usuarioId,
        estadoValidacion: "por_validar",
        anulado: false,
      },
    }),
    db(ctx).movimiento.count({
      where: {
        enviadoAValidarPorId: usuarioId,
        estadoValidacion: "observado",
        anulado: false,
      },
    }),
    db(ctx).movimiento.findMany({
      where: {
        pagadoPorId: usuarioId,
        tipo: "gasto",
        estadoPago: "pendiente",
        anulado: false,
      },
      select: { montoClp: true },
    }),
  ]);

  const montoReembolsosPendientes = reembolsos.reduce((acc, curr) => acc + curr.montoClp, 0);

  return {
    porValidar,
    observados,
    reembolsosPendientes: reembolsos.length,
    montoReembolsosPendientes,
  };
}

/**
 * Consultas para listado general de movimientos con filtros y totales.
 */
export async function listarMovimientos(
  ctx: Contexto,
  filtros: {
    pestana?: "todos" | "por_validar" | "observados" | "por_cobrar" | "por_pagar" | "sin_respaldo" | "sin_identificar" | string;
    tipo?: "ingreso" | "gasto";
    categoriaId?: string;
    contraparteId?: string;
    medioPago?: "transferencia" | "efectivo" | "otro";
    fechaDesde?: string;
    fechaHasta?: string;
    registradoPorId?: string;
    pagadoPorId?: string;
    estadoPago?: "pagado" | "pendiente";
    estadoValidacion?: "validado" | "por_validar" | "observado";
    naturaleza?: "dinero" | "especie";
    mostrarAnulados?: boolean;
    soloMios?: boolean;
    caballoId?: string;
    jineteId?: string;
    clubId?: string;
    binomioId?: string;
  }
) {
  const where: Prisma.MovimientoWhereInput = {
    organizacionId: ctx.organizacionId,
  };

  if (!filtros.mostrarAnulados) {
    where.anulado = false;
  }

  // Pestañas (soportar tanto guiones bajos como guiones medios según dashboard.md §5.5)
  const pestanaNormalizada = (filtros.pestana || "todos").replace(/-/g, "_");
  switch (pestanaNormalizada) {
    case "por_validar":
      where.estadoValidacion = "por_validar";
      where.anulado = false;
      break;
    case "observados":
      where.estadoValidacion = "observado";
      where.anulado = false;
      break;
    case "por_cobrar":
      where.tipo = "ingreso";
      where.naturaleza = "dinero";
      where.estadoPago = "pendiente";
      where.estadoValidacion = "validado";
      where.anulado = false;
      break;
    case "por_pagar":
      where.tipo = "gasto";
      where.naturaleza = "dinero";
      where.estadoPago = "pendiente";
      where.estadoValidacion = "validado";
      where.anulado = false;
      break;
    case "sin_respaldo":
      where.sinRespaldo = true;
      where.anulado = false;
      break;
    case "sin_identificar":
      where.sinIdentificar = true;
      where.anulado = false;
      break;
    default:
      break;
  }

  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.categoriaId) where.categoriaId = filtros.categoriaId;
  if (filtros.contraparteId) where.contraparteId = filtros.contraparteId;
  if (filtros.medioPago) where.medioPago = filtros.medioPago;
  if (filtros.registradoPorId) where.registradoPorId = filtros.registradoPorId;
  if (filtros.pagadoPorId) where.pagadoPorId = filtros.pagadoPorId;
  if (filtros.estadoPago) where.estadoPago = filtros.estadoPago;
  if (filtros.estadoValidacion) where.estadoValidacion = filtros.estadoValidacion;
  if (filtros.naturaleza) where.naturaleza = filtros.naturaleza;
  if (filtros.soloMios) where.registradoPorId = ctx.usuario.id;
  if (filtros.caballoId) where.caballoId = filtros.caballoId;
  if (filtros.jineteId) where.jineteId = filtros.jineteId;
  if (filtros.clubId) where.clubId = filtros.clubId;
  if (filtros.binomioId) where.binomioId = filtros.binomioId;

  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.fecha = {};
    if (filtros.fechaDesde) {
      where.fecha.gte = new Date(`${filtros.fechaDesde}T00:00:00Z`);
    }
    if (filtros.fechaHasta) {
      where.fecha.lte = new Date(`${filtros.fechaHasta}T00:00:00Z`);
    }
  }

  const [movimientos, totalIngresos, totalGastos, totalPorValidar, totalEspecie] =
    await Promise.all([
      db(ctx).movimiento.findMany({
        where,
        include: {
          categoria: true,
          contraparte: true,
          pagadoPor: { select: { id: true, nombre: true } },
          registradoPor: { select: { id: true, nombre: true } },
          respaldos: { where: { anulado: false } },
          caballo: true,
          jinete: true,
          club: true,
          binomio: {
            include: {
              jinete: true,
              caballo: true,
              club: true,
            },
          },
          prueba: true,
        },
        orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
      }),
      // Ingresos validados en dinero
      db(ctx).movimiento.aggregate({
        where: {
          ...filtroSumable(),
          tipo: "ingreso",
          estadoValidacion: "validado",
          estadoPago: "pagado",
        },
        _sum: { montoClp: true },
      }),
      // Gastos pagados validados en dinero
      db(ctx).movimiento.aggregate({
        where: {
          ...filtroSumable(),
          tipo: "gasto",
          estadoValidacion: "validado",
          estadoPago: "pagado",
        },
        _sum: { montoClp: true },
      }),
      // Total por validar
      db(ctx).movimiento.aggregate({
        where: {
          anulado: false,
          estadoValidacion: "por_validar",
        },
        _sum: { montoClp: true },
      }),
      // Total valor estimado en especie
      db(ctx).movimiento.aggregate({
        where: {
          anulado: false,
          naturaleza: "especie",
        },
        _sum: { montoClp: true },
      }),
    ]);

  const totalIngresosClp = totalIngresos._sum.montoClp || 0;
  const totalGastosClp = totalGastos._sum.montoClp || 0;
  const saldoCajaClp = totalIngresosClp - totalGastosClp;
  const totalPorValidarClp = totalPorValidar._sum.montoClp || 0;
  const totalEspecieClp = totalEspecie._sum.montoClp || 0;

  return {
    movimientos: movimientos.map((m) => ocultarDatosMovimiento(ctx, m)),
    totales: {
      totalIngresosClp,
      totalGastosClp,
      saldoCajaClp,
      totalPorValidarClp,
      totalEspecieClp,
    },
  };
}

/**
 * Consulta la ficha completa de un movimiento por ID.
 */
export async function obtenerMovimiento(ctx: Contexto, id: string) {
  const mov = await db(ctx).movimiento.findUnique({
    where: { id },
    include: {
      categoria: true,
      contraparte: true,
      pagadoPor: { select: { id: true, nombre: true, correo: true } },
      registradoPor: { select: { id: true, nombre: true } },
      enviadoAValidarPor: { select: { id: true, nombre: true } },
      validadoPor: { select: { id: true, nombre: true } },
      anuladoPor: { select: { id: true, nombre: true } },
      respaldos: {
        orderBy: { creadoEn: "asc" },
        include: {
          subidoPor: { select: { id: true, nombre: true } },
        },
      },
      abonoDe: {
        select: {
          id: true,
          montoClp: true,
          montoOriginalClp: true,
          descripcion: true,
          fecha: true,
          tipo: true,
          estadoPago: true,
        },
      },
      abonos: {
        where: { anulado: false },
        orderBy: { fecha: "asc" },
        include: {
          validadoPor: { select: { id: true, nombre: true } },
        },
      },
    },
  });

  if (!mov) return null;
  return ocultarDatosMovimiento(ctx, mov);
}

/**
 * Consulta la bandeja de validación para administradores:
 * movimientos por_validar ordenados de más antiguo a más reciente,
 * y lista de respaldos nuevos para marcar como vistos.
 */
export async function bandejaPorValidar(ctx: Contexto) {
  exigir(ctx, "validar");

  const [movimientos, respaldosNuevos] = await Promise.all([
    db(ctx).movimiento.findMany({
      where: {
        estadoValidacion: "por_validar",
        anulado: false,
      },
      include: {
        categoria: true,
        contraparte: true,
        enviadoAValidarPor: { select: { id: true, nombre: true } },
        registradoPor: { select: { id: true, nombre: true } },
        pagadoPor: { select: { id: true, nombre: true } },
        respaldos: {
          where: { anulado: false },
          include: { subidoPor: { select: { id: true, nombre: true } } },
        },
      },
      orderBy: { creadoEn: "asc" },
    }),
    db(ctx).respaldo.findMany({
      where: {
        esNuevo: true,
        anulado: false,
        movimiento: { estadoValidacion: "validado", anulado: false },
      },
      include: {
        subidoPor: { select: { id: true, nombre: true } },
        movimiento: {
          select: {
            id: true,
            tipo: true,
            montoClp: true,
            descripcion: true,
            fecha: true,
          },
        },
      },
      orderBy: { creadoEn: "asc" },
    }),
  ]);

  return {
    movimientos: movimientos.map((m) => ocultarDatosMovimiento(ctx, m)),
    respaldosNuevos,
  };
}

/**
 * Contador de movimientos por validar para el menú y el dashboard.
 */
export async function contadorPorValidar(ctx: Contexto): Promise<number> {
  if (ctx.rol !== "administrador") return 0;
  return db(ctx).movimiento.count({
    where: {
      estadoValidacion: "por_validar",
      anulado: false,
    },
  });
}

/**
 * Consulta la línea de tiempo de auditoría para una entidad.
 */
export async function lineaDeTiempo(ctx: Contexto, entidad: string, entidadId: string) {
  if (ctx.rol === "observador") {
    return [];
  }

  if (ctx.rol === "ayudante") {
    if (entidad === "Movimiento") {
      const mov = await db(ctx).movimiento.findUnique({
        where: { id: entidadId },
        select: { registradoPorId: true },
      });
      if (!mov || mov.registradoPorId !== ctx.usuario.id) {
        return [];
      }
    } else {
      return [];
    }
  }

  const registros = await db(ctx).registroAuditoria.findMany({
    where: {
      entidad,
      entidadId,
    },
    include: {
      usuario: { select: { id: true, nombre: true, correo: true } },
    },
    orderBy: { creadoEn: "asc" },
  });

  return registros;
}

/**
 * Pantalla general de auditoría (/auditoria), solo para administradores.
 */
export async function listarAuditoria(
  ctx: Contexto,
  filtros: {
    usuarioId?: string;
    entidad?: string;
    accion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }
) {
  exigir(ctx, "ver_auditoria");

  const where: Prisma.RegistroAuditoriaWhereInput = {
    organizacionId: ctx.organizacionId,
  };

  if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
  if (filtros.entidad) where.entidad = filtros.entidad;
  if (filtros.accion) where.accion = filtros.accion;

  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.creadoEn = {};
    if (filtros.fechaDesde) {
      where.creadoEn.gte = new Date(`${filtros.fechaDesde}T00:00:00Z`);
    }
    if (filtros.fechaHasta) {
      where.creadoEn.lte = new Date(`${filtros.fechaHasta}T23:59:59Z`);
    }
  }

  const registros = await db(ctx).registroAuditoria.findMany({
    where,
    include: {
      usuario: { select: { id: true, nombre: true, correo: true } },
    },
    orderBy: { creadoEn: "desc" },
    take: 100,
  });

  return registros;
}

export interface MovimientoSistemaInput {
  claveSistema: "inscripciones" | "devoluciones";
  tipo: "ingreso" | "gasto";
  montoClp: number;
  fecha: string;
  fechaPago?: string | null;
  medioPago?: MedioPago | null;
  nombreOrigen?: string | null;
  observacion?: string | null;
  sinRespaldo?: boolean;
  claveCliente: string;
  descripcion?: string | null;
}

/**
 * 5.6: Registra un movimiento de sistema (inscripciones o devoluciones) dentro de una transacción.
 * No pasa por el selector libre de categorías y asegura idempotencia mediante claveCliente.
 */
export async function registrarMovimientoSistema(
  tx: any,
  ctx: Contexto,
  datos: MovimientoSistemaInput,
  archivos: ArchivoEntrada[] = []
) {
  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    throw new Error("No hay un evento abierto vigente para registrar movimientos.");
  }

  // Idempotencia por claveCliente
  const existente = await tx.movimiento.findUnique({
    where: {
      organizacionId_claveCliente: {
        organizacionId: ctx.organizacionId,
        claveCliente: datos.claveCliente,
      },
    },
    include: { respaldos: true },
  });

  if (existente) {
    if (existente.registradoPorId === ctx.usuario.id) {
      return existente;
    }
    throw new Error("La clave de transacción ya fue utilizada por otro usuario.");
  }

  // Obtener categoría de sistema
  const categoria = await tx.categoria.findFirst({
    where: {
      organizacionId: ctx.organizacionId,
      claveSistema: datos.claveSistema,
    },
  });

  if (!categoria) {
    throw new Error(`No se encontró la categoría de sistema '${datos.claveSistema}'.`);
  }

  // Validación de respaldos o sinRespaldo
  if (!datos.sinRespaldo && archivos.length === 0) {
    throw new Error("Debes adjuntar al menos un comprobante o marcar 'Sin respaldo' con observación.");
  }
  if (datos.sinRespaldo && (!datos.observacion || datos.observacion.trim().length === 0)) {
    throw new Error("Si marcas 'Sin respaldo', la observación es obligatoria.");
  }

  // Validar magic bytes de los archivos
  const archivosValidados: {
    buffer: Buffer;
    tipoMime: "image/jpeg" | "image/png" | "application/pdf";
    extension: "jpg" | "png" | "pdf";
    esComprobantePago?: boolean;
  }[] = [];

  for (const arch of archivos) {
    const validacion = validarMagicBytesRespaldo(arch.buffer);
    if (!validacion.valido || !validacion.tipoMime || !validacion.extension) {
      throw new Error(validacion.error || `Archivo '${arch.nombre}' no válido.`);
    }
    archivosValidados.push({
      buffer: arch.buffer,
      tipoMime: validacion.tipoMime,
      extension: validacion.extension,
      esComprobantePago: arch.esComprobantePago,
    });
  }

  // Validación por rol:
  // Administrador -> validado de inmediato
  // Ayudante en ingreso de inscripciones -> por_validar
  const puedeAutoValidar = puede(ctx, "validar");
  const estadoValidacion = puedeAutoValidar ? "validado" : "por_validar";

  const mov = await tx.movimiento.create({
    data: {
      organizacionId: ctx.organizacionId,
      eventoId: ctx.evento.id,
      tipo: datos.tipo,
      naturaleza: "dinero",
      montoClp: datos.montoClp,
      montoOriginalClp: datos.montoClp,
      fecha: new Date(`${datos.fecha}T00:00:00Z`),
      fechaPago: datos.fechaPago ? new Date(`${datos.fechaPago}T00:00:00Z`) : new Date(`${datos.fecha}T00:00:00Z`),
      medioPago: datos.medioPago || "transferencia",
      estadoPago: "pagado",
      categoriaId: categoria.id,
      sinIdentificar: false,
      nombreOrigen: datos.tipo === "ingreso" ? datos.nombreOrigen || null : null,
      descripcion: datos.descripcion || null,
      observacion: datos.observacion || null,
      sinRespaldo: Boolean(datos.sinRespaldo),
      estadoValidacion,
      enviadoAValidarPorId: estadoValidacion === "por_validar" ? ctx.usuario.id : null,
      validadoPorId: estadoValidacion === "validado" ? ctx.usuario.id : null,
      validadoEn: estadoValidacion === "validado" ? new Date() : null,
      registradoPorId: ctx.usuario.id,
      claveCliente: datos.claveCliente,
    },
  });

  for (const arch of archivosValidados) {
    const respaldo = await tx.respaldo.create({
      data: {
        organizacionId: ctx.organizacionId,
        movimientoId: mov.id,
        ruta: "temporal",
        tipoMime: arch.tipoMime,
        bytes: arch.buffer.length,
        esComprobantePago: arch.esComprobantePago ?? false,
        subidoPorId: ctx.usuario.id,
      },
    });

    const rutaRelativa = construirRutaRelativaRespaldo(
      ctx.organizacionId,
      mov.id,
      respaldo.id,
      arch.extension
    );

    await tx.respaldo.update({
      where: { id: respaldo.id },
      data: { ruta: rutaRelativa },
    });

    await guardarArchivoRespaldo(rutaRelativa, arch.buffer);
  }

  await tx.registroAuditoria.create({
    data: {
      organizacionId: ctx.organizacionId,
      usuarioId: ctx.usuario.id,
      entidad: "Movimiento",
      entidadId: mov.id,
      accion: "crear_sistema",
      despues: {
        id: mov.id,
        tipo: mov.tipo,
        montoClp: mov.montoClp,
        claveSistema: datos.claveSistema,
        estadoValidacion: mov.estadoValidacion,
      } as Prisma.InputJsonValue,
    },
  });

  return mov;
}

