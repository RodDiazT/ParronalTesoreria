"use server";

import path from "node:path";
import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obtenerContexto, db, registrarAuditoria } from "@/lib/contexto";
import { Contexto, exigir } from "@/lib/permisos";
import { normalizarNombre, validarMagicBytesImagen } from "@/lib/utilidades";

const eventoSchema = z.object({
  id: z.string(),
  nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres.").max(120, "Máximo 120 caracteres."),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)"),
  fechaTermino: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)"),
  fechaReferenciaEdad: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)").optional().or(z.literal("")),
  lugar: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
  version: z.number().int().positive(),
});

export type EventoFormData = z.infer<typeof eventoSchema>;

export async function ejecutarActualizarEvento(ctx: Contexto, datos: EventoFormData) {
  exigir(ctx, "configurar");

  const validado = eventoSchema.safeParse(datos);
  if (!validado.success) {
    return {
      exito: false,
      error: validado.error.errors[0]?.message || "Datos del evento inválidos.",
    };
  }

  const { id, nombre, fechaInicio, fechaTermino, fechaReferenciaEdad, lugar, version } = validado.data;

  // Validación de fechas de negocio
  const fInicio = new Date(`${fechaInicio}T00:00:00Z`);
  const fTermino = new Date(`${fechaTermino}T00:00:00Z`);

  if (fTermino < fInicio) {
    return {
      exito: false,
      error: "La fecha de término no puede ser anterior a la fecha de inicio.",
    };
  }

  const fRefEdad = fechaReferenciaEdad ? new Date(`${fechaReferenciaEdad}T00:00:00Z`) : null;

  // Verificar que el evento pertenezca a la organización y esté abierto
  const eventoActual = await db(ctx).evento.findUnique({
    where: { id },
  });

  if (!eventoActual) {
    return { exito: false, error: "El evento no existe." };
  }

  if (eventoActual.estado !== "abierto") {
    return {
      exito: false,
      error: "El evento no está abierto. Solo se puede editar mientras está abierto.",
    };
  }

  if (eventoActual.version !== version) {
    return {
      exito: false,
      error: "Alguien cambió la configuración de este evento mientras lo editabas. Por favor recarga la página.",
    };
  }

  const eventoActualizado = await db(ctx).evento.update({
    where: { id, version },
    data: {
      nombre,
      fechaInicio: fInicio,
      fechaTermino: fTermino,
      fechaReferenciaEdad: fRefEdad,
      lugar: lugar || null,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "evento",
    entidadId: id,
    accion: "editar",
    antes: {
      nombre: eventoActual.nombre,
      fechaInicio: eventoActual.fechaInicio,
      fechaTermino: eventoActual.fechaTermino,
      fechaReferenciaEdad: eventoActual.fechaReferenciaEdad,
      lugar: eventoActual.lugar,
    },
    despues: {
      nombre: eventoActualizado.nombre,
      fechaInicio: eventoActualizado.fechaInicio,
      fechaTermino: eventoActualizado.fechaTermino,
      fechaReferenciaEdad: eventoActualizado.fechaReferenciaEdad,
      lugar: eventoActualizado.lugar,
    },
  });

  return { exito: true, evento: eventoActualizado };
}

export async function actualizarEvento(datos: EventoFormData) {
  const ctx = await obtenerContexto();
  const res = await ejecutarActualizarEvento(ctx, datos);
  if (res.exito) {
    revalidatePath("/configuracion/evento");
    revalidatePath("/");
  }
  return res;
}

const organizacionSchema = z.object({
  id: z.string(),
  nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres.").max(120, "Máximo 120 caracteres."),
  version: z.number().int().positive(),
});

export async function ejecutarActualizarOrganizacion(ctx: Contexto, datos: z.infer<typeof organizacionSchema>) {
  exigir(ctx, "configurar");

  const validado = organizacionSchema.safeParse(datos);
  if (!validado.success) {
    return {
      exito: false,
      error: validado.error.errors[0]?.message || "Datos de organización inválidos.",
    };
  }

  const { id, nombre, version } = validado.data;
  const nombreNorm = normalizarNombre(nombre);

  const orgActual = await db(ctx).organizacion.findUnique({
    where: { id },
  });

  if (!orgActual) {
    return { exito: false, error: "La organización no existe." };
  }

  if (orgActual.version !== version) {
    return {
      exito: false,
      error: "Alguien cambió los datos de la organización mientras los editabas. Por favor recarga.",
    };
  }

  const orgActualizada = await db(ctx).organizacion.update({
    where: { id, version },
    data: {
      nombre,
      nombreNormalizado: nombreNorm,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "organizacion",
    entidadId: id,
    accion: "editar",
    antes: { nombre: orgActual.nombre },
    despues: { nombre: orgActualizada.nombre },
  });

  return { exito: true, organizacion: orgActualizada };
}

export async function actualizarOrganizacion(datos: z.infer<typeof organizacionSchema>) {
  const ctx = await obtenerContexto();
  const res = await ejecutarActualizarOrganizacion(ctx, datos);
  if (res.exito) {
    revalidatePath("/configuracion/organizacion");
    revalidatePath("/");
  }
  return res;
}

export async function ejecutarSubirLogoOrganizacion(ctx: Contexto, buffer: Buffer, version?: number) {
  exigir(ctx, "configurar");

  if (buffer.length > 1024 * 1024) {
    return { exito: false, error: "El logo no puede superar 1 MB de tamaño." };
  }

  const verificacion = validarMagicBytesImagen(buffer);
  if (!verificacion.valido || !verificacion.tipoMime || !verificacion.extension) {
    return { exito: false, error: verificacion.error || "Formato de imagen inválido." };
  }

  const orgActual = await db(ctx).organizacion.findUnique({
    where: { id: ctx.organizacionId },
  });

  if (!orgActual) {
    return { exito: false, error: "Organización no encontrada." };
  }

  if (version !== undefined && orgActual.version !== version) {
    return {
      exito: false,
      error: "La información de la organización fue actualizada previamente. Por favor recarga.",
    };
  }

  const rutaBase = path.resolve(process.env.RUTA_RESPALDOS || "./scratch/respaldos");
  const dirOrganizacion = path.join(rutaBase, "organizacion", ctx.organizacionId);
  await fs.mkdir(dirOrganizacion, { recursive: true });

  const nombreArchivo = `logo-${Date.now()}.${verificacion.extension}`;
  const rutaAbsoluta = path.join(dirOrganizacion, nombreArchivo);
  const rutaRelativa = path.join("organizacion", ctx.organizacionId, nombreArchivo);

  await fs.writeFile(rutaAbsoluta, buffer);

  const orgActualizada = await db(ctx).organizacion.update({
    where: { id: ctx.organizacionId },
    data: {
      logoRuta: rutaRelativa,
      logoTipoMime: verificacion.tipoMime,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "organizacion",
    entidadId: ctx.organizacionId,
    accion: "editar",
    antes: { logoRuta: orgActual.logoRuta },
    despues: { logoRuta: orgActualizada.logoRuta },
  });

  return { exito: true, logoRuta: rutaRelativa };
}

export async function subirLogoOrganizacion(formData: FormData) {
  const ctx = await obtenerContexto();
  const archivo = formData.get("logo") as File | null;
  const versionStr = formData.get("version") as string | null;
  const version = versionStr ? parseInt(versionStr, 10) : undefined;

  if (!archivo || archivo.size === 0) {
    return { exito: false, error: "Debes seleccionar un archivo de imagen." };
  }

  const arrayBuffer = await archivo.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const res = await ejecutarSubirLogoOrganizacion(ctx, buffer, version);
  if (res.exito) {
    revalidatePath("/configuracion/organizacion");
    revalidatePath("/");
  }
  return res;
}

export async function ejecutarQuitarLogoOrganizacion(ctx: Contexto, version: number) {
  exigir(ctx, "configurar");

  const orgActual = await db(ctx).organizacion.findUnique({
    where: { id: ctx.organizacionId },
  });

  if (!orgActual) {
    return { exito: false, error: "Organización no encontrada." };
  }

  if (orgActual.version !== version) {
    return {
      exito: false,
      error: "La información de la organización cambió. Por favor recarga.",
    };
  }

  await db(ctx).organizacion.update({
    where: { id: ctx.organizacionId },
    data: {
      logoRuta: null,
      logoTipoMime: null,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "organizacion",
    entidadId: ctx.organizacionId,
    accion: "editar",
    antes: { logoRuta: orgActual.logoRuta },
    despues: { logoRuta: null },
  });

  return { exito: true };
}

export async function quitarLogoOrganizacion(version: number) {
  const ctx = await obtenerContexto();
  const res = await ejecutarQuitarLogoOrganizacion(ctx, version);
  if (res.exito) {
    revalidatePath("/configuracion/organizacion");
    revalidatePath("/");
  }
  return res;
}
