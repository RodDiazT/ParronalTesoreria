import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MedioPago } from "@prisma/client";
import { db, registrarAuditoria } from "@/lib/contexto";
import { Contexto, exigir } from "@/lib/permisos";
import {
  validarMagicBytesRespaldo,
  construirRutaRelativaTraspaso,
  guardarArchivoRespaldo,
} from "@/lib/archivos/almacenamiento";

function revalidarRutaSegura(ruta: string) {
  try {
    revalidatePath(ruta);
  } catch {
    // Silencioso fuera de entorno Next.js (ej: Vitest)
  }
}

export const traspasoRegistroSchema = z.object({
  desde: z.enum(["transferencia", "efectivo", "otro"]),
  hacia: z.enum(["transferencia", "efectivo", "otro"]),
  montoClp: z
    .number()
    .int("El monto debe ser un entero.")
    .min(1, "El monto debe ser mayor a 0.")
    .max(999_999_999, "El monto no puede superar $999.999.999."),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (AAAA-MM-DD)."),
  observacion: z.string().trim().max(500, "Máximo 500 caracteres.").optional().nullable(),
  claveCliente: z.string().min(5, "Clave de idempotencia requerida."),
});

export type TraspasoRegistroInput = z.infer<typeof traspasoRegistroSchema>;

export interface ArchivoTraspaso {
  buffer: Buffer;
  nombre: string;
  tipoMime?: string;
}

/**
 * Valida las reglas de dominio para el registro de traspasos:
 * - Medio desde debe ser distinto de hacia
 * - Si no hay comprobante, la observación es obligatoria
 * (docs/dashboard/dashboard.md §3.4)
 */
export function validarReglasTraspaso(
  datos: TraspasoRegistroInput,
  tieneArchivo: boolean
): { valido: boolean; error?: string } {
  if (datos.desde === datos.hacia) {
    return {
      valido: false,
      error: "El medio de origen y destino deben ser distintos.",
    };
  }

  if (!tieneArchivo && (!datos.observacion || datos.observacion.trim().length === 0)) {
    return {
      valido: false,
      error: "Debes adjuntar un comprobante o ingresar una observación explicativa.",
    };
  }

  return { valido: true };
}

/**
 * Oculta datos protegidos (observación y ruta del comprobante) a usuarios con rol observador.
 * (docs/dashboard/dashboard.md §3.4 y §4)
 */
export function ocultarDatosTraspaso<T extends Record<string, any>>(ctx: Contexto, t: T): T {
  if (ctx.rol !== "observador") return t;
  const copia: any = { ...t };
  delete copia.observacion;
  delete copia.archivoRuta;
  delete copia.archivoTipoMime;
  return copia as T;
}

/**
 * Registra un nuevo traspaso entre medios de pago (Banco, Efectivo, Otro).
 * Operación exclusiva para administradores. Idempotente por claveCliente.
 * (docs/dashboard/dashboard.md §3.4 y §5.3)
 */
export async function ejecutarRegistrarTraspaso(
  ctx: Contexto,
  datos: TraspasoRegistroInput,
  archivo?: ArchivoTraspaso | null
) {
  exigir(ctx, "registrar_traspaso");

  if (!ctx.evento) {
    throw new Error("No hay un evento activo configurado para la organización.");
  }

  const validacion = validarReglasTraspaso(datos, Boolean(archivo));
  if (!validacion.valido) {
    throw new Error(validacion.error || "Datos de traspaso inválidos.");
  }

  // Idempotencia por (organizacionId, claveCliente)
  const existente = await db(ctx).traspaso.findUnique({
    where: {
      organizacionId_claveCliente: {
        organizacionId: ctx.organizacionId,
        claveCliente: datos.claveCliente,
      },
    },
    include: {
      registradoPor: { select: { id: true, nombre: true } },
    },
  });

  if (existente) {
    return { traspaso: ocultarDatosTraspaso(ctx, existente), nuevo: false };
  }

  // Si el evento está cerrado o posterior, se marca posteriorAlCierre
  const posteriorAlCierre = ctx.evento.estado === "cerrado" || ctx.evento.estado === "rendido";

  let archivoRuta: string | null = null;
  let archivoTipoMime: string | null = null;

  if (archivo) {
    const validacionArchivo = validarMagicBytesRespaldo(archivo.buffer);
    if (!validacionArchivo.valido || !validacionArchivo.extension || !validacionArchivo.tipoMime) {
      throw new Error(validacionArchivo.error || "Archivo de comprobante no válido.");
    }

    const tempId = crypto.randomUUID();
    const rutaRelativa = construirRutaRelativaTraspaso(
      ctx.organizacionId,
      tempId,
      validacionArchivo.extension
    );

    await guardarArchivoRespaldo(rutaRelativa, archivo.buffer);
    archivoRuta = rutaRelativa;
    archivoTipoMime = validacionArchivo.tipoMime;
  }

  const fechaObj = new Date(`${datos.fecha}T00:00:00Z`);

  const nuevoTraspaso = await db(ctx).traspaso.create({
    data: {
      organizacionId: ctx.organizacionId,
      eventoId: ctx.evento.id,
      fecha: fechaObj,
      desde: datos.desde as MedioPago,
      hacia: datos.hacia as MedioPago,
      montoClp: datos.montoClp,
      observacion: datos.observacion?.trim() || null,
      archivoRuta,
      archivoTipoMime,
      claveCliente: datos.claveCliente,
      posteriorAlCierre,
      registradoPorId: ctx.usuario.id,
    },
    include: {
      registradoPor: { select: { id: true, nombre: true } },
    },
  });

  // Registrar auditoría inmutable
  await registrarAuditoria(ctx, {
    entidad: "Traspaso",
    entidadId: nuevoTraspaso.id,
    accion: "crear",
    despues: nuevoTraspaso,
  });

  revalidarRutaSegura("/");
  revalidarRutaSegura("/traspasos");

  return { traspaso: ocultarDatosTraspaso(ctx, nuevoTraspaso), nuevo: true };
}

/**
 * Anula un traspaso con motivo obligatorio y control de concurrencia optimista.
 * (docs/dashboard/dashboard.md §3.4 y §5.3)
 */
export async function ejecutarAnularTraspaso(
  ctx: Contexto,
  id: string,
  motivo: string,
  version: number
) {
  exigir(ctx, "registrar_traspaso");

  if (!motivo || motivo.trim().length < 3) {
    throw new Error("El motivo de anulación es obligatorio (mínimo 3 caracteres).");
  }

  const actual = await db(ctx).traspaso.findFirst({
    where: {
      id,
      organizacionId: ctx.organizacionId,
    },
  });

  if (!actual) {
    throw new Error("Traspaso no encontrado.");
  }

  if (actual.anulado) {
    throw new Error("El traspaso ya se encuentra anulado.");
  }

  if (actual.version !== version) {
    throw new Error("El registro fue modificado concurrentemente por otro usuario. Por favor recarga la página.");
  }

  const anulado = await db(ctx).traspaso.update({
    where: { id },
    data: {
      anulado: true,
      anuladoMotivo: motivo.trim(),
      anuladoPorId: ctx.usuario.id,
      anuladoEn: new Date(),
      version: { increment: 1 },
    },
    include: {
      registradoPor: { select: { id: true, nombre: true } },
      anuladoPor: { select: { id: true, nombre: true } },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Traspaso",
    entidadId: id,
    accion: "anular",
    antes: actual,
    despues: anulado,
  });

  revalidarRutaSegura("/");
  revalidarRutaSegura("/traspasos");

  return ocultarDatosTraspaso(ctx, anulado);
}

/**
 * Consulta el listado de traspasos del evento.
 * (docs/dashboard/dashboard.md §3.4 y §3.11)
 */
export async function ejecutarListarTraspasos(
  ctx: Contexto,
  eventoId: string,
  opciones: { incluirAnulados?: boolean } = {}
) {
  const where: any = {
    organizacionId: ctx.organizacionId,
    eventoId,
  };

  if (!opciones.incluirAnulados) {
    where.anulado = false;
  }

  const traspasos = await db(ctx).traspaso.findMany({
    where,
    include: {
      registradoPor: { select: { id: true, nombre: true } },
      anuladoPor: { select: { id: true, nombre: true } },
    },
    orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
  });

  return traspasos.map((t) => ocultarDatosTraspaso(ctx, t));
}
