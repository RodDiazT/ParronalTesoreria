"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RelacionApoderado } from "@prisma/client";
import {
  obtenerContexto,
  db,
  exigirDeLaOrganizacion,
  registrarAuditoria,
} from "@/lib/contexto";
import { Contexto, exigir } from "@/lib/permisos";
import {
  normalizarNombre,
  normalizarTelefono,
  validarRut,
  fechaReferenciaEdadEfectiva,
} from "@/lib/utilidades";
import {
  buscarParecidos,
  edadEnEvento,
  extraerPartesFecha,
  ParecidoCoincidencia,
} from "./reglas";
import { reasignarPorFusion } from "@/dominio/inscripciones/binomios/acciones";

function revalidarRutasSeguras() {
  try {
    revalidatePath("/participantes");
  } catch {
    // Entorno de pruebas sin contexto de renderizado estático
  }
}

// -------------------------------------------------------------
// Esquemas Zod
// -------------------------------------------------------------

export const clubSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "Máximo 120 caracteres."),
  contacto: z.string().trim().max(100, "Máximo 100 caracteres.").optional().nullable(),
  rut: z.string().trim().optional().nullable(),
  confirmarAunqueParecido: z.boolean().default(false),
});

export type ClubInput = z.input<typeof clubSchema>;

export const apoderadoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "Máximo 120 caracteres."),
  telefono: z
    .string()
    .trim()
    .min(8, "El teléfono de emergencia es obligatorio (mínimo 8 dígitos).")
    .max(30, "Máximo 30 caracteres."),
  confirmarAunqueParecido: z.boolean().default(false),
});

export type ApoderadoInput = z.input<typeof apoderadoSchema>;

export const caballoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(80, "Máximo 80 caracteres."),
  clubId: z.string().min(1, "El club es obligatorio."),
  confirmarAunqueParecido: z.boolean().default(false),
});

export type CaballoInput = z.input<typeof caballoSchema>;

export const jineteSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "Máximo 120 caracteres."),
  clubId: z.string().min(1, "El club es obligatorio."),
  fechaNacimiento: z.string().trim().optional().nullable(),
  contacto: z.string().trim().max(100, "Máximo 100 caracteres.").optional().nullable(),
  rut: z.string().trim().optional().nullable(),
  autorizacionFecha: z.string().trim().optional().nullable(),
  confirmarAunqueParecido: z.boolean().default(false),
  apoderados: z
    .array(
      z.object({
        apoderadoId: z.string().optional(),
        nuevoApoderado: z
          .object({
            nombre: z.string().trim().min(2),
            telefono: z.string().trim().min(8),
          })
          .optional(),
        relacion: z.nativeEnum(RelacionApoderado),
      })
    )
    .optional(),
});

export type JineteInput = z.input<typeof jineteSchema>;

function parsearFechaDate(fechaStr: string | null | undefined): Date | null {
  if (!fechaStr || !fechaStr.trim()) return null;
  const [y, m, d] = extraerPartesFecha(fechaStr);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

// -------------------------------------------------------------
// Acciones: Club
// -------------------------------------------------------------

export async function ejecutarCrearClub(ctx: Contexto, datos: ClubInput) {
  exigir(ctx, "participantes.crear");

  const validado = clubSchema.safeParse(datos);
  if (!validado.success) {
    return { exito: false, error: validado.error.errors[0]?.message || "Datos inválidos." };
  }

  const { nombre, contacto, rut, confirmarAunqueParecido } = validado.data;

  // Validación de RUT si se incluye
  let rutNormalizado: string | null = null;
  if (rut && rut.trim()) {
    const resRut = validarRut(rut);
    if (!resRut.valido) {
      return { exito: false, error: resRut.error || "RUT inválido." };
    }
    rutNormalizado = resRut.rutNormalizado!;

    // RUT repetido bloquea
    const existenteConRut = await db(ctx).club.findFirst({
      where: { rut: rutNormalizado, activo: true },
      select: { id: true, nombre: true },
    });
    if (existenteConRut) {
      return {
        exito: false,
        error: `El RUT ya está registrado en el club activo: "${existenteConRut.nombre}".`,
        existenteId: existenteConRut.id,
      };
    }
  }

  // Detección de duplicados no bloqueante
  if (!confirmarAunqueParecido) {
    const parecidos = await buscarParecidos(ctx, "club", { nombre });
    if (parecidos.length > 0) {
      return {
        exito: false,
        requiereConfirmacion: true,
        parecidos,
        mensaje: "¿Es alguno de estos clubes?",
      };
    }
  }

  const club = await db(ctx).club.create({
    data: {
      organizacionId: ctx.organizacionId,
      nombre,
      nombreNormalizado: normalizarNombre(nombre),
      contacto: contacto?.trim() || null,
      rut: rutNormalizado,
      creadoPorId: ctx.usuario.id,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Club",
    entidadId: club.id,
    accion: "crear",
    despues: club as any,
  });

  revalidarRutasSeguras();
  return { exito: true, club };
}

export async function crearClub(datos: ClubInput) {
  const ctx = await obtenerContexto();
  return ejecutarCrearClub(ctx, datos);
}

export async function ejecutarEditarClub(
  ctx: Contexto,
  id: string,
  version: number,
  datos: { nombre: string; contacto?: string | null; rut?: string | null }
) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "club", id);

  const clubActual = await db(ctx).club.findFirst({ where: { id } });
  if (!clubActual) return { exito: false, error: "Club no encontrado." };
  if (clubActual.version !== version) {
    return {
      exito: false,
      error: "El club fue modificado por otro usuario. Por favor recarga los datos.",
    };
  }

  let rutNormalizado: string | null = null;
  if (datos.rut && datos.rut.trim()) {
    const resRut = validarRut(datos.rut);
    if (!resRut.valido) return { exito: false, error: resRut.error || "RUT inválido." };
    rutNormalizado = resRut.rutNormalizado!;

    const repetido = await db(ctx).club.findFirst({
      where: { rut: rutNormalizado, activo: true, id: { not: id } },
      select: { id: true, nombre: true },
    });
    if (repetido) {
      return {
        exito: false,
        error: `El RUT ya está registrado en el club: "${repetido.nombre}".`,
      };
    }
  }

  const clubActualizado = await db(ctx).club.update({
    where: { id },
    data: {
      nombre: datos.nombre.trim(),
      nombreNormalizado: normalizarNombre(datos.nombre),
      contacto: datos.contacto?.trim() || null,
      rut: rutNormalizado,
      version: clubActual.version + 1,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Club",
    entidadId: id,
    accion: "modificar",
    antes: clubActual as any,
    despues: clubActualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true, club: clubActualizado };
}

export async function editarClub(
  id: string,
  version: number,
  datos: { nombre: string; contacto?: string | null; rut?: string | null }
) {
  const ctx = await obtenerContexto();
  return ejecutarEditarClub(ctx, id, version, datos);
}

export async function ejecutarDesactivarClub(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "club", id);

  const club = await db(ctx).club.findFirst({ where: { id } });
  if (!club) return { exito: false, error: "Club no encontrado." };

  const actualizado = await db(ctx).club.update({
    where: { id },
    data: { activo: false, version: club.version + 1 },
  });

  await registrarAuditoria(ctx, {
    entidad: "Club",
    entidadId: id,
    accion: "desactivar",
    antes: club as any,
    despues: actualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function desactivarClub(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarDesactivarClub(ctx, id);
}

export async function ejecutarReactivarClub(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "club", id);

  const club = await db(ctx).club.findFirst({ where: { id } });
  if (!club) return { exito: false, error: "Club no encontrado." };

  const actualizado = await db(ctx).club.update({
    where: { id },
    data: { activo: true, version: club.version + 1 },
  });

  await registrarAuditoria(ctx, {
    entidad: "Club",
    entidadId: id,
    accion: "reactivar",
    antes: club as any,
    despues: actualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function reactivarClub(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarReactivarClub(ctx, id);
}

export async function ejecutarFusionarClubes(
  ctx: Contexto,
  conservadoId: string,
  duplicadoId: string
) {
  exigir(ctx, "participantes.administrar");
  if (conservadoId === duplicadoId) {
    return { exito: false, error: "No puedes fusionar un club consigo mismo." };
  }

  await exigirDeLaOrganizacion(ctx, "club", conservadoId);
  await exigirDeLaOrganizacion(ctx, "club", duplicadoId);

  const cliente = db(ctx);

  const resultado = await cliente.$transaction(async (tx) => {
    const conservado = await tx.club.findFirst({ where: { id: conservadoId } });
    const duplicado = await tx.club.findFirst({ where: { id: duplicadoId } });

    if (!conservado || !duplicado) {
      throw new Error("Uno o ambos clubes no existen.");
    }

    // Reasignar jinetes
    const jinetesReasignados = await tx.jinete.updateMany({
      where: { clubId: duplicadoId },
      data: { clubId: conservadoId, version: { increment: 1 } },
    });

    // Reasignar caballos
    const caballosReasignados = await tx.caballo.updateMany({
      where: { clubId: duplicadoId },
      data: { clubId: conservadoId, version: { increment: 1 } },
    });

    // Reasignar binomios y cargos de club
    const reasig = await reasignarPorFusion(tx, ctx, "club", conservadoId, duplicadoId);
    const binomiosReasignados = { count: reasig.binomios };

    // Completar datos vacíos del conservado
    const nuevoContacto = conservado.contacto || duplicado.contacto || null;
    const nuevoRut = conservado.rut || duplicado.rut || null;

    const conservadoActualizado = await tx.club.update({
      where: { id: conservadoId },
      data: {
        contacto: nuevoContacto,
        rut: nuevoRut,
        version: conservado.version + 1,
      },
    });

    // Desactivar duplicado
    await tx.club.update({
      where: { id: duplicadoId },
      data: {
        activo: false,
        fusionadoEnId: conservadoId,
        version: duplicado.version + 1,
      },
    });

    return {
      conservado: conservadoActualizado,
      jinetes: jinetesReasignados.count,
      caballos: caballosReasignados.count,
      binomios: binomiosReasignados.count,
    };
  });

  await registrarAuditoria(ctx, {
    entidad: "Club",
    entidadId: conservadoId,
    accion: "fusionar",
    antes: { duplicadoId },
    despues: {
      duplicadoId,
      jinetesReasignados: resultado.jinetes,
      caballosReasignados: resultado.caballos,
      binomiosReasignados: resultado.binomios,
    } as any,
  });

  revalidarRutasSeguras();
  return { exito: true, detalle: resultado };
}

export async function fusionarClubes(conservadoId: string, duplicadoId: string) {
  const ctx = await obtenerContexto();
  return ejecutarFusionarClubes(ctx, conservadoId, duplicadoId);
}

export async function ejecutarSuprimirDatosClub(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "club", id);

  const club = await db(ctx).club.findFirst({ where: { id } });
  if (!club) return { exito: false, error: "Club no encontrado." };

  await db(ctx).club.update({
    where: { id },
    data: {
      contacto: null,
      rut: null,
      version: club.version + 1,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Club",
    entidadId: id,
    accion: "suprimir_datos",
    antes: { estado: "datos_personales_eliminados" } as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function suprimirDatosClub(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarSuprimirDatosClub(ctx, id);
}

// -------------------------------------------------------------
// Acciones: Jinete
// -------------------------------------------------------------

export async function ejecutarCrearJinete(ctx: Contexto, datos: JineteInput) {
  exigir(ctx, "participantes.crear");

  const validado = jineteSchema.safeParse(datos);
  if (!validado.success) {
    return { exito: false, error: validado.error.errors[0]?.message || "Datos inválidos." };
  }

  const {
    nombre,
    clubId,
    fechaNacimiento,
    contacto,
    rut,
    autorizacionFecha,
    confirmarAunqueParecido,
    apoderados,
  } = validado.data;

  await exigirDeLaOrganizacion(ctx, "club", clubId);

  // Fecha de nacimiento no futura
  let fechaNacDate: Date | null = null;
  if (fechaNacimiento && fechaNacimiento.trim()) {
    fechaNacDate = parsearFechaDate(fechaNacimiento);
    if (fechaNacDate && fechaNacDate.getTime() > Date.now()) {
      return { exito: false, error: "La fecha de nacimiento no puede ser futura." };
    }
  }

  // Validación de RUT
  let rutNormalizado: string | null = null;
  if (rut && rut.trim()) {
    const resRut = validarRut(rut);
    if (!resRut.valido) return { exito: false, error: resRut.error || "RUT inválido." };
    rutNormalizado = resRut.rutNormalizado!;

    const repetido = await db(ctx).jinete.findFirst({
      where: { rut: rutNormalizado, activo: true },
      select: { id: true, nombre: true },
    });
    if (repetido) {
      return {
        exito: false,
        error: `El RUT ya está registrado en el jinete activo: "${repetido.nombre}".`,
        existenteId: repetido.id,
      };
    }
  }

  // Detección de duplicados
  if (!confirmarAunqueParecido) {
    const parecidos = await buscarParecidos(ctx, "jinete", {
      nombre,
      fechaNacimiento: fechaNacDate,
    });
    if (parecidos.length > 0) {
      return {
        exito: false,
        requiereConfirmacion: true,
        parecidos,
        mensaje: "¿Es alguno de estos jinetes?",
      };
    }
  }

  // Autorización fecha
  let autDate: Date | null = null;
  if (autorizacionFecha && autorizacionFecha.trim()) {
    autDate = parsearFechaDate(autorizacionFecha);
  }

  const cliente = db(ctx);

  const jinete = await cliente.$transaction(async (tx) => {
    const nuevoJinete = await tx.jinete.create({
      data: {
        organizacionId: ctx.organizacionId,
        nombre,
        nombreNormalizado: normalizarNombre(nombre),
        clubId,
        fechaNacimiento: fechaNacDate,
        contacto: contacto?.trim() || null,
        rut: rutNormalizado,
        autorizacionApoderadoFecha: autDate,
        autorizacionRegistradaPorId: autDate ? ctx.usuario.id : null,
        autorizacionRegistradaEn: autDate ? new Date() : null,
        creadoPorId: ctx.usuario.id,
      },
    });

    if (apoderados && apoderados.length > 0) {
      for (const item of apoderados) {
        let finalApoderadoId = item.apoderadoId;

        if (item.nuevoApoderado) {
          const telNorm = normalizarTelefono(item.nuevoApoderado.telefono);
          const nuevoAp = await tx.apoderado.create({
            data: {
              organizacionId: ctx.organizacionId,
              nombre: item.nuevoApoderado.nombre.trim(),
              nombreNormalizado: normalizarNombre(item.nuevoApoderado.nombre),
              telefono: item.nuevoApoderado.telefono.trim(),
              telefonoNormalizado: telNorm,
              creadoPorId: ctx.usuario.id,
            },
          });
          finalApoderadoId = nuevoAp.id;
        }

        if (finalApoderadoId) {
          await tx.jineteApoderado.create({
            data: {
              organizacionId: ctx.organizacionId,
              jineteId: nuevoJinete.id,
              apoderadoId: finalApoderadoId,
              relacion: item.relacion,
              creadoPorId: ctx.usuario.id,
            },
          });
        }
      }
    }

    return nuevoJinete;
  });

  await registrarAuditoria(ctx, {
    entidad: "Jinete",
    entidadId: jinete.id,
    accion: "crear",
    despues: jinete as any,
  });

  revalidarRutasSeguras();
  return { exito: true, jinete };
}

export async function crearJinete(datos: JineteInput) {
  const ctx = await obtenerContexto();
  return ejecutarCrearJinete(ctx, datos);
}

export async function ejecutarEditarJinete(
  ctx: Contexto,
  id: string,
  version: number,
  datos: {
    nombre: string;
    clubId: string;
    fechaNacimiento?: string | null;
    contacto?: string | null;
    rut?: string | null;
    autorizacionApoderadoFecha?: string | null;
  }
) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "jinete", id);
  await exigirDeLaOrganizacion(ctx, "club", datos.clubId);

  const jineteActual = await db(ctx).jinete.findFirst({ where: { id } });
  if (!jineteActual) return { exito: false, error: "Jinete no encontrado." };
  if (jineteActual.version !== version) {
    return {
      exito: false,
      error: "El jinete fue modificado por otro usuario. Por favor recarga los datos.",
    };
  }

  let rutNormalizado: string | null = null;
  if (datos.rut && datos.rut.trim()) {
    const resRut = validarRut(datos.rut);
    if (!resRut.valido) return { exito: false, error: resRut.error || "RUT inválido." };
    rutNormalizado = resRut.rutNormalizado!;

    const repetido = await db(ctx).jinete.findFirst({
      where: { rut: rutNormalizado, activo: true, id: { not: id } },
      select: { id: true, nombre: true },
    });
    if (repetido) {
      return {
        exito: false,
        error: `El RUT ya está registrado en el jinete: "${repetido.nombre}".`,
      };
    }
  }

  const fechaNacDate = parsearFechaDate(datos.fechaNacimiento);
  if (fechaNacDate && fechaNacDate.getTime() > Date.now()) {
    return { exito: false, error: "La fecha de nacimiento no puede ser futura." };
  }

  const autDate = parsearFechaDate(datos.autorizacionApoderadoFecha);

  const actualizado = await db(ctx).jinete.update({
    where: { id },
    data: {
      nombre: datos.nombre.trim(),
      nombreNormalizado: normalizarNombre(datos.nombre),
      clubId: datos.clubId,
      fechaNacimiento: fechaNacDate,
      contacto: datos.contacto?.trim() || null,
      rut: rutNormalizado,
      autorizacionApoderadoFecha: autDate,
      autorizacionRegistradaPorId: autDate ? ctx.usuario.id : null,
      autorizacionRegistradaEn: autDate ? new Date() : null,
      version: jineteActual.version + 1,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Jinete",
    entidadId: id,
    accion: "modificar",
    antes: jineteActual as any,
    despues: actualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true, jinete: actualizado };
}

export async function editarJinete(
  id: string,
  version: number,
  datos: {
    nombre: string;
    clubId: string;
    fechaNacimiento?: string | null;
    contacto?: string | null;
    rut?: string | null;
    autorizacionApoderadoFecha?: string | null;
  }
) {
  const ctx = await obtenerContexto();
  return ejecutarEditarJinete(ctx, id, version, datos);
}

export async function ejecutarVincularApoderado(
  ctx: Contexto,
  jineteId: string,
  datos: {
    apoderadoId?: string;
    nuevoApoderado?: { nombre: string; telefono: string };
    relacion: RelacionApoderado;
  }
): Promise<{ exito: boolean; vinculo?: any; error?: string }> {
  exigir(ctx, "participantes.completarMenor");
  await exigirDeLaOrganizacion(ctx, "jinete", jineteId);
  if (datos.apoderadoId) {
    await exigirDeLaOrganizacion(ctx, "apoderado", datos.apoderadoId);
  }

  const cliente = db(ctx);

  const vinculo = await cliente.$transaction(async (tx) => {
    let finalApoderadoId = datos.apoderadoId;

    if (datos.nuevoApoderado) {
      const telNorm = normalizarTelefono(datos.nuevoApoderado.telefono);
      const nuevo = await tx.apoderado.create({
        data: {
          organizacionId: ctx.organizacionId,
          nombre: datos.nuevoApoderado.nombre.trim(),
          nombreNormalizado: normalizarNombre(datos.nuevoApoderado.nombre),
          telefono: datos.nuevoApoderado.telefono.trim(),
          telefonoNormalizado: telNorm,
          creadoPorId: ctx.usuario.id,
        },
      });
      finalApoderadoId = nuevo.id;
    }

    if (!finalApoderadoId) {
      throw new Error("Debe indicarse un apoderado existente o nuevo.");
    }

    // Si ya existe vínculo (activo o inactivo), reactivar y actualizar relación
    const existente = await tx.jineteApoderado.findUnique({
      where: {
        jineteId_apoderadoId: {
          jineteId,
          apoderadoId: finalApoderadoId,
        },
      },
    });

    if (existente) {
      return tx.jineteApoderado.update({
        where: { id: existente.id },
        data: {
          activo: true,
          relacion: datos.relacion,
        },
      });
    }

    return tx.jineteApoderado.create({
      data: {
        organizacionId: ctx.organizacionId,
        jineteId,
        apoderadoId: finalApoderadoId,
        relacion: datos.relacion,
        creadoPorId: ctx.usuario.id,
      },
    });
  });

  await registrarAuditoria(ctx, {
    entidad: "Jinete",
    entidadId: jineteId,
    accion: "vincular_apoderado",
    despues: { apoderadoId: vinculo.apoderadoId, relacion: vinculo.relacion } as any,
  });

  revalidarRutasSeguras();
  return { exito: true, vinculo };
}

export async function vincularApoderado(
  jineteId: string,
  datos: {
    apoderadoId?: string;
    nuevoApoderado?: { nombre: string; telefono: string };
    relacion: RelacionApoderado;
  }
): Promise<{ exito: boolean; vinculo?: any; error?: string }> {
  const ctx = await obtenerContexto();
  return ejecutarVincularApoderado(ctx, jineteId, datos);
}

export async function ejecutarDesvincularApoderado(
  ctx: Contexto,
  jineteId: string,
  apoderadoId: string
) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "jinete", jineteId);
  await exigirDeLaOrganizacion(ctx, "apoderado", apoderadoId);

  const vinculo = await db(ctx).jineteApoderado.findUnique({
    where: {
      jineteId_apoderadoId: { jineteId, apoderadoId },
    },
  });

  if (!vinculo) return { exito: false, error: "Vínculo no encontrado." };

  await db(ctx).jineteApoderado.update({
    where: { id: vinculo.id },
    data: { activo: false },
  });

  await registrarAuditoria(ctx, {
    entidad: "Jinete",
    entidadId: jineteId,
    accion: "desvincular_apoderado",
    despues: { apoderadoId, activo: false } as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function desvincularApoderado(jineteId: string, apoderadoId: string) {
  const ctx = await obtenerContexto();
  return ejecutarDesvincularApoderado(ctx, jineteId, apoderadoId);
}

export async function ejecutarRegistrarAutorizacion(
  ctx: Contexto,
  jineteId: string,
  fecha: string | Date
) {
  exigir(ctx, "participantes.completarMenor");
  await exigirDeLaOrganizacion(ctx, "jinete", jineteId);

  const jinete = await db(ctx).jinete.findFirst({ where: { id: jineteId } });
  if (!jinete) return { exito: false, error: "Jinete no encontrado." };

  if (jinete.autorizacionApoderadoFecha) {
    return {
      exito: false,
      error: "El jinete ya tiene una fecha de autorización registrada. Para corregirla, usa la edición.",
    };
  }

  const autDate = typeof fecha === "string" ? parsearFechaDate(fecha) : fecha;
  if (!autDate) return { exito: false, error: "Fecha inválida." };

  const actualizado = await db(ctx).jinete.update({
    where: { id: jineteId },
    data: {
      autorizacionApoderadoFecha: autDate,
      autorizacionRegistradaPorId: ctx.usuario.id,
      autorizacionRegistradaEn: new Date(),
      version: jinete.version + 1,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Jinete",
    entidadId: jineteId,
    accion: "registrar_autorizacion",
    despues: { autorizacionApoderadoFecha: autDate } as any,
  });

  revalidarRutasSeguras();
  return { exito: true, jinete: actualizado };
}

export async function registrarAutorizacion(jineteId: string, fecha: string | Date) {
  const ctx = await obtenerContexto();
  return ejecutarRegistrarAutorizacion(ctx, jineteId, fecha);
}

export async function ejecutarDesactivarJinete(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "jinete", id);

  const jinete = await db(ctx).jinete.findFirst({ where: { id } });
  if (!jinete) return { exito: false, error: "Jinete no encontrado." };

  const actualizado = await db(ctx).jinete.update({
    where: { id },
    data: { activo: false, version: jinete.version + 1 },
  });

  await registrarAuditoria(ctx, {
    entidad: "Jinete",
    entidadId: id,
    accion: "desactivar",
    antes: jinete as any,
    despues: actualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function desactivarJinete(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarDesactivarJinete(ctx, id);
}

export async function ejecutarReactivarJinete(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "jinete", id);

  const jinete = await db(ctx).jinete.findFirst({ where: { id } });
  if (!jinete) return { exito: false, error: "Jinete no encontrado." };

  const actualizado = await db(ctx).jinete.update({
    where: { id },
    data: { activo: true, version: jinete.version + 1 },
  });

  await registrarAuditoria(ctx, {
    entidad: "Jinete",
    entidadId: id,
    accion: "reactivar",
    antes: jinete as any,
    despues: actualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function reactivarJinete(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarReactivarJinete(ctx, id);
}

export async function ejecutarFusionarJinetes(
  ctx: Contexto,
  conservadoId: string,
  duplicadoId: string,
  opciones?: { fechaNacimientoElegida?: string | null }
) {
  exigir(ctx, "participantes.administrar");
  if (conservadoId === duplicadoId) {
    return { exito: false, error: "No puedes fusionar un jinete consigo mismo." };
  }

  await exigirDeLaOrganizacion(ctx, "jinete", conservadoId);
  await exigirDeLaOrganizacion(ctx, "jinete", duplicadoId);

  const cliente = db(ctx);

  const resultado = await cliente.$transaction(async (tx) => {
    const conservado = await tx.jinete.findFirst({ where: { id: conservadoId } });
    const duplicado = await tx.jinete.findFirst({ where: { id: duplicadoId } });

    if (!conservado || !duplicado) {
      throw new Error("Uno o ambos jinetes no existen.");
    }

    // Reasignar apoderados sin duplicar
    const vinculosDuplicado = await tx.jineteApoderado.findMany({
      where: { jineteId: duplicadoId, activo: true },
    });

    for (const vd of vinculosDuplicado) {
      const existeEnConservado = await tx.jineteApoderado.findUnique({
        where: {
          jineteId_apoderadoId: {
            jineteId: conservadoId,
            apoderadoId: vd.apoderadoId,
          },
        },
      });

      if (!existeEnConservado) {
        await tx.jineteApoderado.create({
          data: {
            organizacionId: ctx.organizacionId,
            jineteId: conservadoId,
            apoderadoId: vd.apoderadoId,
            relacion: vd.relacion,
            creadoPorId: ctx.usuario.id,
          },
        });
      } else if (!existeEnConservado.activo) {
        await tx.jineteApoderado.update({
          where: { id: existeEnConservado.id },
          data: { activo: true },
        });
      }

      await tx.jineteApoderado.update({
        where: { id: vd.id },
        data: { activo: false },
      });
    }

    // Reasignar binomios y cargos de jinete con validación de conflictos
    const reasig = await reasignarPorFusion(tx, ctx, "jinete", conservadoId, duplicadoId);
    const binomiosReasignados = { count: reasig.binomios };
    const cargosReasignados = { count: reasig.cargos };

    // Determinar fecha de nacimiento
    let fnFinal = conservado.fechaNacimiento;
    if (opciones?.fechaNacimientoElegida !== undefined) {
      fnFinal = parsearFechaDate(opciones.fechaNacimientoElegida);
    } else if (!conservado.fechaNacimiento && duplicado.fechaNacimiento) {
      fnFinal = duplicado.fechaNacimiento;
    }

    // Autorización
    let autFecha = conservado.autorizacionApoderadoFecha;
    let autPor = conservado.autorizacionRegistradaPorId;
    let autEn = conservado.autorizacionRegistradaEn;
    if (!autFecha && duplicado.autorizacionApoderadoFecha) {
      autFecha = duplicado.autorizacionApoderadoFecha;
      autPor = duplicado.autorizacionRegistradaPorId;
      autEn = duplicado.autorizacionRegistradaEn;
    }

    const conservadoActualizado = await tx.jinete.update({
      where: { id: conservadoId },
      data: {
        contacto: conservado.contacto || duplicado.contacto || null,
        rut: conservado.rut || duplicado.rut || null,
        fechaNacimiento: fnFinal,
        autorizacionApoderadoFecha: autFecha,
        autorizacionRegistradaPorId: autPor,
        autorizacionRegistradaEn: autEn,
        version: conservado.version + 1,
      },
    });

    await tx.jinete.update({
      where: { id: duplicadoId },
      data: {
        activo: false,
        fusionadoEnId: conservadoId,
        version: duplicado.version + 1,
      },
    });

    return {
      conservado: conservadoActualizado,
      binomios: binomiosReasignados.count,
      cargos: cargosReasignados.count,
      vinculosReasignados: vinculosDuplicado.length,
    };
  });

  await registrarAuditoria(ctx, {
    entidad: "Jinete",
    entidadId: conservadoId,
    accion: "fusionar",
    antes: { duplicadoId },
    despues: {
      duplicadoId,
      ...resultado,
    } as any,
  });

  revalidarRutasSeguras();
  return { exito: true, detalle: resultado };
}

export async function fusionarJinetes(
  conservadoId: string,
  duplicadoId: string,
  opciones?: { fechaNacimientoElegida?: string | null }
) {
  const ctx = await obtenerContexto();
  return ejecutarFusionarJinetes(ctx, conservadoId, duplicadoId, opciones);
}

export async function ejecutarSuprimirDatosJinete(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "jinete", id);

  const jinete = await db(ctx).jinete.findFirst({ where: { id } });
  if (!jinete) return { exito: false, error: "Jinete no encontrado." };

  await db(ctx).jinete.update({
    where: { id },
    data: {
      contacto: null,
      rut: null,
      version: jinete.version + 1,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Jinete",
    entidadId: id,
    accion: "suprimir_datos",
    antes: { estado: "datos_personales_contacto_suprimidos" } as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function suprimirDatosJinete(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarSuprimirDatosJinete(ctx, id);
}

// -------------------------------------------------------------
// Acciones: Apoderado
// -------------------------------------------------------------

export async function ejecutarCrearApoderado(ctx: Contexto, datos: ApoderadoInput) {
  exigir(ctx, "participantes.crear");

  const validado = apoderadoSchema.safeParse(datos);
  if (!validado.success) {
    return { exito: false, error: validado.error.errors[0]?.message || "Datos inválidos." };
  }

  const { nombre, telefono, confirmarAunqueParecido } = validado.data;
  const telNorm = normalizarTelefono(telefono);

  if (!confirmarAunqueParecido) {
    const parecidos = await buscarParecidos(ctx, "apoderado", { nombre, telefono });
    if (parecidos.length > 0) {
      return {
        exito: false,
        requiereConfirmacion: true,
        parecidos,
        mensaje: "¿Es alguno de estos apoderados?",
      };
    }
  }

  const apoderado = await db(ctx).apoderado.create({
    data: {
      organizacionId: ctx.organizacionId,
      nombre,
      nombreNormalizado: normalizarNombre(nombre),
      telefono: telefono.trim(),
      telefonoNormalizado: telNorm,
      creadoPorId: ctx.usuario.id,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Apoderado",
    entidadId: apoderado.id,
    accion: "crear",
    despues: apoderado as any,
  });

  revalidarRutasSeguras();
  return { exito: true, apoderado };
}

export async function crearApoderado(datos: ApoderadoInput) {
  const ctx = await obtenerContexto();
  return ejecutarCrearApoderado(ctx, datos);
}

export async function ejecutarEditarApoderado(
  ctx: Contexto,
  id: string,
  version: number,
  datos: { nombre: string; telefono: string }
) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "apoderado", id);

  const apoderado = await db(ctx).apoderado.findFirst({ where: { id } });
  if (!apoderado) return { exito: false, error: "Apoderado no encontrado." };
  if (apoderado.version !== version) {
    return {
      exito: false,
      error: "El apoderado fue modificado por otro usuario. Por favor recarga los datos.",
    };
  }

  const telNorm = normalizarTelefono(datos.telefono);

  const actualizado = await db(ctx).apoderado.update({
    where: { id },
    data: {
      nombre: datos.nombre.trim(),
      nombreNormalizado: normalizarNombre(datos.nombre),
      telefono: datos.telefono.trim(),
      telefonoNormalizado: telNorm,
      version: apoderado.version + 1,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Apoderado",
    entidadId: id,
    accion: "modificar",
    antes: apoderado as any,
    despues: actualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true, apoderado: actualizado };
}

export async function editarApoderado(
  id: string,
  version: number,
  datos: { nombre: string; telefono: string }
) {
  const ctx = await obtenerContexto();
  return ejecutarEditarApoderado(ctx, id, version, datos);
}

export async function ejecutarDesactivarApoderado(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "apoderado", id);

  const apoderado = await db(ctx).apoderado.findFirst({ where: { id } });
  if (!apoderado) return { exito: false, error: "Apoderado no encontrado." };

  const actualizado = await db(ctx).apoderado.update({
    where: { id },
    data: { activo: false, version: apoderado.version + 1 },
  });

  await registrarAuditoria(ctx, {
    entidad: "Apoderado",
    entidadId: id,
    accion: "desactivar",
    antes: apoderado as any,
    despues: actualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function desactivarApoderado(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarDesactivarApoderado(ctx, id);
}

export async function ejecutarReactivarApoderado(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "apoderado", id);

  const apoderado = await db(ctx).apoderado.findFirst({ where: { id } });
  if (!apoderado) return { exito: false, error: "Apoderado no encontrado." };

  const actualizado = await db(ctx).apoderado.update({
    where: { id },
    data: { activo: true, version: apoderado.version + 1 },
  });

  await registrarAuditoria(ctx, {
    entidad: "Apoderado",
    entidadId: id,
    accion: "reactivar",
    antes: apoderado as any,
    despues: actualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function reactivarApoderado(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarReactivarApoderado(ctx, id);
}

export async function ejecutarFusionarApoderados(
  ctx: Contexto,
  conservadoId: string,
  duplicadoId: string
) {
  exigir(ctx, "participantes.administrar");
  if (conservadoId === duplicadoId) {
    return { exito: false, error: "No puedes fusionar un apoderado consigo mismo." };
  }

  await exigirDeLaOrganizacion(ctx, "apoderado", conservadoId);
  await exigirDeLaOrganizacion(ctx, "apoderado", duplicadoId);

  const cliente = db(ctx);

  const resultado = await cliente.$transaction(async (tx) => {
    const conservado = await tx.apoderado.findFirst({ where: { id: conservadoId } });
    const duplicado = await tx.apoderado.findFirst({ where: { id: duplicadoId } });

    if (!conservado || !duplicado) {
      throw new Error("Uno o ambos apoderados no existen.");
    }

    const vinculosDuplicado = await tx.jineteApoderado.findMany({
      where: { apoderadoId: duplicadoId, activo: true },
    });

    for (const vd of vinculosDuplicado) {
      const existeEnConservado = await tx.jineteApoderado.findUnique({
        where: {
          jineteId_apoderadoId: {
            jineteId: vd.jineteId,
            apoderadoId: conservadoId,
          },
        },
      });

      if (!existeEnConservado) {
        await tx.jineteApoderado.create({
          data: {
            organizacionId: ctx.organizacionId,
            jineteId: vd.jineteId,
            apoderadoId: conservadoId,
            relacion: vd.relacion,
            creadoPorId: ctx.usuario.id,
          },
        });
      }

      await tx.jineteApoderado.update({
        where: { id: vd.id },
        data: { activo: false },
      });
    }

    const conservadoActualizado = await tx.apoderado.update({
      where: { id: conservadoId },
      data: { version: conservado.version + 1 },
    });

    await tx.apoderado.update({
      where: { id: duplicadoId },
      data: {
        activo: false,
        fusionadoEnId: conservadoId,
        version: duplicado.version + 1,
      },
    });

    return {
      conservado: conservadoActualizado,
      vinculosReasignados: vinculosDuplicado.length,
    };
  });

  await registrarAuditoria(ctx, {
    entidad: "Apoderado",
    entidadId: conservadoId,
    accion: "fusionar",
    antes: { duplicadoId },
    despues: { duplicadoId, ...resultado } as any,
  });

  revalidarRutasSeguras();
  return { exito: true, detalle: resultado };
}

export async function fusionarApoderados(conservadoId: string, duplicadoId: string) {
  const ctx = await obtenerContexto();
  return ejecutarFusionarApoderados(ctx, conservadoId, duplicadoId);
}

export async function ejecutarSuprimirDatosApoderado(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "apoderado", id);

  const apoderado = await db(ctx).apoderado.findFirst({ where: { id } });
  if (!apoderado) return { exito: false, error: "Apoderado no encontrado." };

  await db(ctx).apoderado.update({
    where: { id },
    data: {
      telefono: null,
      telefonoNormalizado: null,
      version: apoderado.version + 1,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Apoderado",
    entidadId: id,
    accion: "suprimir_datos",
    antes: { estado: "telefono_suprimido" } as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function suprimirDatosApoderado(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarSuprimirDatosApoderado(ctx, id);
}

// -------------------------------------------------------------
// Acciones: Caballo
// -------------------------------------------------------------

export async function ejecutarCrearCaballo(ctx: Contexto, datos: CaballoInput) {
  exigir(ctx, "participantes.crear");

  const validado = caballoSchema.safeParse(datos);
  if (!validado.success) {
    return { exito: false, error: validado.error.errors[0]?.message || "Datos inválidos." };
  }

  const { nombre, clubId, confirmarAunqueParecido } = validado.data;
  await exigirDeLaOrganizacion(ctx, "club", clubId);

  if (!confirmarAunqueParecido) {
    const parecidos = await buscarParecidos(ctx, "caballo", { nombre });
    if (parecidos.length > 0) {
      return {
        exito: false,
        requiereConfirmacion: true,
        parecidos,
        mensaje: "¿Es alguno de estos caballos?",
      };
    }
  }

  const caballo = await db(ctx).caballo.create({
    data: {
      organizacionId: ctx.organizacionId,
      nombre,
      nombreNormalizado: normalizarNombre(nombre),
      clubId,
      creadoPorId: ctx.usuario.id,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Caballo",
    entidadId: caballo.id,
    accion: "crear",
    despues: caballo as any,
  });

  revalidarRutasSeguras();
  return { exito: true, caballo };
}

export async function crearCaballo(datos: CaballoInput) {
  const ctx = await obtenerContexto();
  return ejecutarCrearCaballo(ctx, datos);
}

export async function ejecutarEditarCaballo(
  ctx: Contexto,
  id: string,
  version: number,
  datos: { nombre: string; clubId: string }
) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "caballo", id);
  await exigirDeLaOrganizacion(ctx, "club", datos.clubId);

  const caballo = await db(ctx).caballo.findFirst({ where: { id } });
  if (!caballo) return { exito: false, error: "Caballo no encontrado." };
  if (caballo.version !== version) {
    return {
      exito: false,
      error: "El caballo fue modificado por otro usuario. Por favor recarga los datos.",
    };
  }

  const actualizado = await db(ctx).caballo.update({
    where: { id },
    data: {
      nombre: datos.nombre.trim(),
      nombreNormalizado: normalizarNombre(datos.nombre),
      clubId: datos.clubId,
      version: caballo.version + 1,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "Caballo",
    entidadId: id,
    accion: "modificar",
    antes: caballo as any,
    despues: actualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true, caballo: actualizado };
}

export async function editarCaballo(
  id: string,
  version: number,
  datos: { nombre: string; clubId: string }
) {
  const ctx = await obtenerContexto();
  return ejecutarEditarCaballo(ctx, id, version, datos);
}

export async function ejecutarDesactivarCaballo(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "caballo", id);

  const caballo = await db(ctx).caballo.findFirst({ where: { id } });
  if (!caballo) return { exito: false, error: "Caballo no encontrado." };

  const actualizado = await db(ctx).caballo.update({
    where: { id },
    data: { activo: false, version: caballo.version + 1 },
  });

  await registrarAuditoria(ctx, {
    entidad: "Caballo",
    entidadId: id,
    accion: "desactivar",
    antes: caballo as any,
    despues: actualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function desactivarCaballo(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarDesactivarCaballo(ctx, id);
}

export async function ejecutarReactivarCaballo(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, "caballo", id);

  const caballo = await db(ctx).caballo.findFirst({ where: { id } });
  if (!caballo) return { exito: false, error: "Caballo no encontrado." };

  const actualizado = await db(ctx).caballo.update({
    where: { id },
    data: { activo: true, version: caballo.version + 1 },
  });

  await registrarAuditoria(ctx, {
    entidad: "Caballo",
    entidadId: id,
    accion: "reactivar",
    antes: caballo as any,
    despues: actualizado as any,
  });

  revalidarRutasSeguras();
  return { exito: true };
}

export async function reactivarCaballo(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarReactivarCaballo(ctx, id);
}

export async function ejecutarFusionarCaballos(
  ctx: Contexto,
  conservadoId: string,
  duplicadoId: string
) {
  exigir(ctx, "participantes.administrar");
  if (conservadoId === duplicadoId) {
    return { exito: false, error: "No puedes fusionar un caballo consigo mismo." };
  }

  await exigirDeLaOrganizacion(ctx, "caballo", conservadoId);
  await exigirDeLaOrganizacion(ctx, "caballo", duplicadoId);

  const cliente = db(ctx);

  const resultado = await cliente.$transaction(async (tx) => {
    const conservado = await tx.caballo.findFirst({ where: { id: conservadoId } });
    const duplicado = await tx.caballo.findFirst({ where: { id: duplicadoId } });

    if (!conservado || !duplicado) {
      throw new Error("Uno o ambos caballos no existen.");
    }

    const reasig = await reasignarPorFusion(tx, ctx, "caballo", conservadoId, duplicadoId);
    const binomiosReasignados = { count: reasig.binomios };

    const conservadoActualizado = await tx.caballo.update({
      where: { id: conservadoId },
      data: { version: conservado.version + 1 },
    });

    await tx.caballo.update({
      where: { id: duplicadoId },
      data: {
        activo: false,
        fusionadoEnId: conservadoId,
        version: duplicado.version + 1,
      },
    });

    return {
      conservado: conservadoActualizado,
      binomiosReasignados: binomiosReasignados.count,
    };
  });

  await registrarAuditoria(ctx, {
    entidad: "Caballo",
    entidadId: conservadoId,
    accion: "fusionar",
    antes: { duplicadoId },
    despues: { duplicadoId, ...resultado } as any,
  });

  revalidarRutasSeguras();
  return { exito: true, detalle: resultado };
}

export async function fusionarCaballos(conservadoId: string, duplicadoId: string) {
  const ctx = await obtenerContexto();
  return ejecutarFusionarCaballos(ctx, conservadoId, duplicadoId);
}

// -------------------------------------------------------------
// Descarga CSV de Portabilidad (Ley 19.628 / 21.719)
// -------------------------------------------------------------

export async function ejecutarDescargarDatosParticipante(
  ctx: Contexto,
  entidad: "jinete" | "club" | "apoderado",
  id: string
): Promise<{ exito: boolean; contenidoCsv?: string; nombreArchivo?: string; error?: string }> {
  exigir(ctx, "participantes.administrar");
  await exigirDeLaOrganizacion(ctx, entidad, id);

  const cliente = db(ctx);

  if (entidad === "jinete") {
    const j = await cliente.jinete.findFirst({
      where: { id },
      include: {
        club: true,
        apoderados: {
          include: { apoderado: true },
        },
        binomios: {
          include: {
            caballo: true,
            evento: true,
          },
        },
      },
    });
    if (!j) return { exito: false, error: "Jinete no encontrado." };

    const filas: string[] = [];
    filas.push("TipoRegistro,ID,Nombre,RUT,Contacto,Club,FechaNacimiento,AutorizacionFecha");
    filas.push(
      `Jinete,"${j.id}","${j.nombre}","${j.rut || ""}","${j.contacto || ""}","${j.club?.nombre || ""}","${
        j.fechaNacimiento ? j.fechaNacimiento.toISOString().split("T")[0] : ""
      }","${
        j.autorizacionApoderadoFecha
          ? j.autorizacionApoderadoFecha.toISOString().split("T")[0]
          : ""
      }"`
    );

    filas.push("");
    filas.push("Apoderados_Vinculados");
    filas.push("ApoderadoID,Nombre,Telefono,Relacion,Activo");
    for (const v of j.apoderados) {
      filas.push(
        `"${v.apoderado.id}","${v.apoderado.nombre}","${v.apoderado.telefono || ""}","${
          v.relacion
        }",${v.activo}`
      );
    }

    filas.push("");
    filas.push("Binomios_Inscritos");
    filas.push("BinomioID,Evento,Caballo");
    for (const b of j.binomios) {
      filas.push(
        `"${b.id}","${b.evento.nombre}","${b.caballo.nombre}"`
      );
    }

    return {
      exito: true,
      contenidoCsv: filas.join("\n"),
      nombreArchivo: `datos_jinete_${j.id}.csv`,
    };
  }

  if (entidad === "club") {
    const c = await cliente.club.findFirst({ where: { id } });
    if (!c) return { exito: false, error: "Club no encontrado." };

    const filas: string[] = [];
    filas.push("TipoRegistro,ID,Nombre,RUT,Contacto,Activo");
    filas.push(
      `Club,"${c.id}","${c.nombre}","${c.rut || ""}","${c.contacto || ""}",${c.activo}`
    );

    return {
      exito: true,
      contenidoCsv: filas.join("\n"),
      nombreArchivo: `datos_club_${c.id}.csv`,
    };
  }

  if (entidad === "apoderado") {
    const a = await cliente.apoderado.findFirst({
      where: { id },
      include: {
        jinetes: { include: { jinete: true } },
      },
    });
    if (!a) return { exito: false, error: "Apoderado no encontrado." };

    const filas: string[] = [];
    filas.push("TipoRegistro,ID,Nombre,Telefono,Activo");
    filas.push(
      `Apoderado,"${a.id}","${a.nombre}","${a.telefono || ""}",${a.activo}`
    );

    filas.push("");
    filas.push("Jinetes_Vinculados");
    filas.push("JineteID,Nombre,Relacion");
    for (const v of a.jinetes) {
      filas.push(`"${v.jinete.id}","${v.jinete.nombre}","${v.relacion}"`);
    }

    return {
      exito: true,
      contenidoCsv: filas.join("\n"),
      nombreArchivo: `datos_apoderado_${a.id}.csv`,
    };
  }

  return { exito: false, error: "Entidad desconocida." };
}

export async function descargarDatosParticipante(
  entidad: "jinete" | "club" | "apoderado",
  id: string
) {
  const ctx = await obtenerContexto();
  return ejecutarDescargarDatosParticipante(ctx, entidad, id);
}

// -------------------------------------------------------------
// Detección de jinetes afectados por cambio de fecha del evento
// -------------------------------------------------------------

export async function ejecutarJinetesAfectadosPorCambioDeFecha(
  ctx: Contexto,
  eventoId: string,
  nuevaFechaReferencia: string | Date
) {
  exigir(ctx, "configurar");
  await exigirDeLaOrganizacion(ctx, "evento", eventoId);

  const evActual = await db(ctx).evento.findFirst({ where: { id: eventoId } });
  if (!evActual) return { exito: false, error: "Evento no encontrado." };

  const jinetesConBinomio = await db(ctx).jinete.findMany({
    where: {
      binomios: { some: { eventoId } },
      fechaNacimiento: { not: null },
    },
    include: {
      apoderados: { where: { activo: true }, include: { apoderado: true } },
    },
  });

  const afectados: {
    id: string;
    nombre: string;
    edadAnterior: number;
    edadNueva: number;
    cambio: "pasa_a_adulto" | "pasa_a_menor" | "cumple_14" | "menor_de_14";
  }[] = [];

  for (const j of jinetesConBinomio) {
    const edadVieja = edadEnEvento(j.fechaNacimiento, evActual);
    const edadNueva = edadEnEvento(j.fechaNacimiento, {
      fechaInicio: nuevaFechaReferencia,
      fechaReferenciaEdad: nuevaFechaReferencia,
    });

    if (edadVieja === null || edadNueva === null) continue;

    if (edadVieja < 18 && edadNueva >= 18) {
      afectados.push({
        id: j.id,
        nombre: j.nombre,
        edadAnterior: edadVieja,
        edadNueva,
        cambio: "pasa_a_adulto",
      });
    } else if (edadVieja >= 18 && edadNueva < 18) {
      afectados.push({
        id: j.id,
        nombre: j.nombre,
        edadAnterior: edadVieja,
        edadNueva,
        cambio: "pasa_a_menor",
      });
    } else if (edadVieja < 14 && edadNueva >= 14) {
      afectados.push({
        id: j.id,
        nombre: j.nombre,
        edadAnterior: edadVieja,
        edadNueva,
        cambio: "cumple_14",
      });
    } else if (edadVieja >= 14 && edadNueva < 14) {
      afectados.push({
        id: j.id,
        nombre: j.nombre,
        edadAnterior: edadVieja,
        edadNueva,
        cambio: "menor_de_14",
      });
    }
  }

  return { exito: true, afectados };
}

export async function jinetesAfectadosPorCambioDeFecha(
  eventoId: string,
  nuevaFechaReferencia: string | Date
) {
  const ctx = await obtenerContexto();
  return ejecutarJinetesAfectadosPorCambioDeFecha(ctx, eventoId, nuevaFechaReferencia);
}
