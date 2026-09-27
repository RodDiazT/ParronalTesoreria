"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obtenerContexto, db, registrarAuditoria } from "@/lib/contexto";
import { Contexto, exigirRol } from "@/lib/permisos";
import { normalizarNombre, validarRut, sonNombresParecidos, ocultarDatosContraparte } from "@/lib/utilidades";

const contraparteSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(120, "Máximo 120 caracteres."),
  esAuspiciador: z.boolean().default(false),
  esProveedor: z.boolean().default(false),
  contacto: z.string().trim().max(100, "Máximo 100 caracteres.").optional().nullable(),
  rut: z.string().trim().optional().nullable(),
});

export type ContraparteInput = z.input<typeof contraparteSchema>;

export interface ContraparteDTO {
  id: string;
  nombre: string;
  nombreNormalizado: string;
  esAuspiciador: boolean;
  esProveedor: boolean;
  contacto: string | null;
  rut: string | null;
  activa: boolean;
  fusionadaEnId: string | null;
  creadoPorId: string;
  version: number;
  creadoEn: Date;
  movimientosCount?: number;
}



export async function ejecutarBuscarParecidosContrapartes(ctx: Contexto, nombre: string): Promise<{ id: string; nombre: string }[]> {
  const activas = await db(ctx).contraparte.findMany({
    where: { activa: true },
    select: { id: true, nombre: true },
  });

  return activas
    .filter((c) => sonNombresParecidos(nombre, c.nombre))
    .slice(0, 3);
}

export async function buscarParecidosContrapartes(nombre: string): Promise<{ id: string; nombre: string }[]> {
  const ctx = await obtenerContexto();
  return ejecutarBuscarParecidosContrapartes(ctx, nombre);
}

export async function ejecutarCrearContraparte(ctx: Contexto, datos: ContraparteInput) {
  if (ctx.rol === "observador") {
    return { exito: false, error: "El rol observador no tiene permiso para crear contrapartes." };
  }

  const validado = contraparteSchema.safeParse(datos);
  if (!validado.success) {
    return { exito: false, error: validado.error.errors[0]?.message || "Datos inválidos." };
  }

  const { nombre, esAuspiciador, esProveedor, contacto } = validado.data;
  let rutNormalizado: string | null = null;

  if (validado.data.rut && validado.data.rut.trim() !== "") {
    const valRut = validarRut(validado.data.rut);
    if (!valRut.valido || !valRut.rutNormalizado) {
      return { exito: false, error: valRut.error || "RUT inválido." };
    }
    rutNormalizado = valRut.rutNormalizado;

    const existenteRut = await db(ctx).contraparte.findFirst({
      where: {
        rut: rutNormalizado,
        activa: true,
      },
    });

    if (existenteRut) {
      return {
        exito: false,
        error: `El RUT ${rutNormalizado} ya está registrado en la contraparte activa «${existenteRut.nombre}».`,
      };
    }
  }

  const nombreNorm = normalizarNombre(nombre);

  const nueva = await db(ctx).contraparte.create({
    data: {
      organizacionId: ctx.organizacionId,
      nombre,
      nombreNormalizado: nombreNorm,
      esAuspiciador,
      esProveedor,
      contacto: contacto || null,
      rut: rutNormalizado,
      activa: true,
      creadoPorId: ctx.usuario.id,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "contraparte",
    entidadId: nueva.id,
    accion: "crear",
    despues: {
      nombre: nueva.nombre,
      esAuspiciador: nueva.esAuspiciador,
      esProveedor: nueva.esProveedor,
      contacto: nueva.contacto,
      rut: nueva.rut,
    },
  });

  return { exito: true, contraparte: nueva };
}

export async function crearContraparte(datos: ContraparteInput) {
  const ctx = await obtenerContexto();
  const res = await ejecutarCrearContraparte(ctx, datos);
  if (res.exito) {
    revalidatePath("/contrapartes");
  }
  return res;
}

export async function ejecutarEditarContraparte(ctx: Contexto, id: string, datos: ContraparteInput, version: number) {
  exigirRol(ctx, "administrador");

  const validado = contraparteSchema.safeParse(datos);
  if (!validado.success) {
    return { exito: false, error: validado.error.errors[0]?.message || "Datos inválidos." };
  }

  const actual = await db(ctx).contraparte.findUnique({
    where: { id },
  });

  if (!actual) return { exito: false, error: "Contraparte no encontrada." };

  if (actual.version !== version) {
    return { exito: false, error: "La contraparte fue modificada por otro usuario. Por favor recarga." };
  }

  let rutNormalizado: string | null = null;
  if (validado.data.rut && validado.data.rut.trim() !== "") {
    const valRut = validarRut(validado.data.rut);
    if (!valRut.valido || !valRut.rutNormalizado) {
      return { exito: false, error: valRut.error || "RUT inválido." };
    }
    rutNormalizado = valRut.rutNormalizado;

    const choqueRut = await db(ctx).contraparte.findFirst({
      where: {
        rut: rutNormalizado,
        activa: true,
        id: { not: id },
      },
    });

    if (choqueRut) {
      return {
        exito: false,
        error: `El RUT ${rutNormalizado} ya existe en otra contraparte activa («${choqueRut.nombre}»).`,
      };
    }
  }

  const nombreNorm = normalizarNombre(validado.data.nombre);

  const actualizada = await db(ctx).contraparte.update({
    where: { id, version },
    data: {
      nombre: validado.data.nombre,
      nombreNormalizado: nombreNorm,
      esAuspiciador: validado.data.esAuspiciador,
      esProveedor: validado.data.esProveedor,
      contacto: validado.data.contacto || null,
      rut: rutNormalizado,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "contraparte",
    entidadId: id,
    accion: "editar",
    antes: {
      nombre: actual.nombre,
      esAuspiciador: actual.esAuspiciador,
      esProveedor: actual.esProveedor,
      contacto: actual.contacto,
      rut: actual.rut,
    },
    despues: {
      nombre: actualizada.nombre,
      esAuspiciador: actualizada.esAuspiciador,
      esProveedor: actualizada.esProveedor,
      contacto: actualizada.contacto,
      rut: actualizada.rut,
    },
  });

  return { exito: true, contraparte: actualizada };
}

export async function editarContraparte(id: string, datos: ContraparteInput, version: number) {
  const ctx = await obtenerContexto();
  const res = await ejecutarEditarContraparte(ctx, id, datos, version);
  if (res.exito) {
    revalidatePath("/contrapartes");
    revalidatePath(`/contrapartes/${id}`);
  }
  return res;
}

export async function ejecutarDesactivarContraparte(ctx: Contexto, id: string, version: number) {
  exigirRol(ctx, "administrador");

  const actual = await db(ctx).contraparte.findUnique({ where: { id } });
  if (!actual) return { exito: false, error: "Contraparte no encontrada." };
  if (actual.version !== version) return { exito: false, error: "Datos desactualizados. Recarga la página." };

  const actualizada = await db(ctx).contraparte.update({
    where: { id, version },
    data: {
      activa: false,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "contraparte",
    entidadId: id,
    accion: "desactivar",
    antes: { activa: true },
    despues: { activa: false },
  });

  return { exito: true, contraparte: actualizada };
}

export async function desactivarContraparte(id: string, version: number) {
  const ctx = await obtenerContexto();
  const res = await ejecutarDesactivarContraparte(ctx, id, version);
  if (res.exito) {
    revalidatePath("/contrapartes");
    revalidatePath(`/contrapartes/${id}`);
  }
  return res;
}

export async function ejecutarReactivarContraparte(ctx: Contexto, id: string, version: number) {
  exigirRol(ctx, "administrador");

  const actual = await db(ctx).contraparte.findUnique({ where: { id } });
  if (!actual) return { exito: false, error: "Contraparte no encontrada." };
  if (actual.version !== version) return { exito: false, error: "Datos desactualizados. Recarga la página." };

  const actualizada = await db(ctx).contraparte.update({
    where: { id, version },
    data: {
      activa: true,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "contraparte",
    entidadId: id,
    accion: "reactivar",
    antes: { activa: false },
    despues: { activa: true },
  });

  return { exito: true, contraparte: actualizada };
}

export async function reactivarContraparte(id: string, version: number) {
  const ctx = await obtenerContexto();
  const res = await ejecutarReactivarContraparte(ctx, id, version);
  if (res.exito) {
    revalidatePath("/contrapartes");
    revalidatePath(`/contrapartes/${id}`);
  }
  return res;
}

export async function ejecutarFusionarContrapartes(ctx: Contexto, idConservada: string, idDuplicado: string) {
  exigirRol(ctx, "administrador");

  if (idConservada === idDuplicado) {
    return { exito: false, error: "No puedes fusionar una contraparte consigo misma." };
  }

  const [conservada, duplicado] = await Promise.all([
    db(ctx).contraparte.findUnique({ where: { id: idConservada } }),
    db(ctx).contraparte.findUnique({ where: { id: idDuplicado } }),
  ]);

  if (!conservada || !duplicado) {
    return { exito: false, error: "Una de las contrapartes no existe." };
  }

  const resultado = await db(ctx).$transaction(async (tx) => {
    const movimientosReasignados = await tx.movimiento.updateMany({
      where: { contraparteId: idDuplicado },
      data: {
        contraparteId: idConservada,
        version: { increment: 1 },
      },
    });

    const nuevoContacto = conservada.contacto || duplicado.contacto || null;
    const nuevoRut = conservada.rut || duplicado.rut || null;
    const esAuspiciador = conservada.esAuspiciador || duplicado.esAuspiciador;
    const esProveedor = conservada.esProveedor || duplicado.esProveedor;

    await tx.contraparte.update({
      where: { id: idConservada },
      data: {
        contacto: nuevoContacto,
        rut: nuevoRut,
        esAuspiciador,
        esProveedor,
        version: { increment: 1 },
      },
    });

    await tx.contraparte.update({
      where: { id: idDuplicado },
      data: {
        activa: false,
        fusionadaEnId: idConservada,
        version: { increment: 1 },
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "contraparte",
        entidadId: idConservada,
        accion: "fusionar",
        despues: {
          contraparteConservadaId: idConservada,
          contraparteDuplicadaId: idDuplicado,
          movimientosReasignados: movimientosReasignados.count,
        },
      },
    });

    return { movimientosReasignados: movimientosReasignados.count };
  });

  return { exito: true, movimientosReasignados: resultado.movimientosReasignados };
}

export async function fusionarContrapartes(idConservada: string, idDuplicado: string) {
  const ctx = await obtenerContexto();
  const res = await ejecutarFusionarContrapartes(ctx, idConservada, idDuplicado);
  if (res.exito) {
    revalidatePath("/contrapartes");
    revalidatePath(`/contrapartes/${idConservada}`);
    revalidatePath(`/contrapartes/${idDuplicado}`);
  }
  return res;
}

export async function ejecutarSuprimirDatosContraparte(ctx: Contexto, id: string, version: number) {
  exigirRol(ctx, "administrador");

  const actual = await db(ctx).contraparte.findUnique({ where: { id } });
  if (!actual) return { exito: false, error: "Contraparte no encontrada." };
  if (actual.version !== version) return { exito: false, error: "Datos desactualizados. Recarga la página." };

  const actualizada = await db(ctx).contraparte.update({
    where: { id, version },
    data: {
      contacto: null,
      rut: null,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "contraparte",
    entidadId: id,
    accion: "suprimir_datos",
    despues: { motivo: "Ejercicio de derechos de privacidad del titular" },
  });

  return { exito: true, contraparte: actualizada };
}

export async function suprimirDatosContraparte(id: string, version: number) {
  const ctx = await obtenerContexto();
  const res = await ejecutarSuprimirDatosContraparte(ctx, id, version);
  if (res.exito) {
    revalidatePath("/contrapartes");
    revalidatePath(`/contrapartes/${id}`);
  }
  return res;
}

export async function ejecutarObtenerContrapartes(
  ctx: Contexto,
  filtros?: {
    tipo?: "todos" | "auspiciador" | "proveedor" | "otro";
    estado?: "activas" | "desactivadas" | "todas";
    busqueda?: string;
  }
): Promise<ContraparteDTO[]> {
  const where: any = {};

  if (filtros?.estado === "activas") {
    where.activa = true;
  } else if (filtros?.estado === "desactivadas") {
    where.activa = false;
  }

  if (filtros?.tipo === "auspiciador") {
    where.esAuspiciador = true;
  } else if (filtros?.tipo === "proveedor") {
    where.esProveedor = true;
  } else if (filtros?.tipo === "otro") {
    where.esAuspiciador = false;
    where.esProveedor = false;
  }

  if (filtros?.busqueda && filtros.busqueda.trim() !== "") {
    const norm = normalizarNombre(filtros.busqueda);
    where.OR = [
      { nombreNormalizado: { contains: norm } },
      { rut: { contains: filtros.busqueda.trim() } },
    ];
  }

  const contrapartes = await db(ctx).contraparte.findMany({
    where,
    orderBy: [
      { activa: "desc" },
      { nombre: "asc" },
    ],
  });

  return contrapartes.map((c) =>
    ocultarDatosContraparte(ctx, {
      id: c.id,
      nombre: c.nombre,
      nombreNormalizado: c.nombreNormalizado,
      esAuspiciador: c.esAuspiciador,
      esProveedor: c.esProveedor,
      contacto: c.contacto,
      rut: c.rut,
      activa: c.activa,
      fusionadaEnId: c.fusionadaEnId,
      creadoPorId: c.creadoPorId,
      version: c.version,
      creadoEn: c.creadoEn,
    })
  );
}

export async function obtenerContrapartes(filtros?: {
  tipo?: "todos" | "auspiciador" | "proveedor" | "otro";
  estado?: "activas" | "desactivadas" | "todas";
  busqueda?: string;
}): Promise<ContraparteDTO[]> {
  const ctx = await obtenerContexto();
  return ejecutarObtenerContrapartes(ctx, filtros);
}

export async function ejecutarObtenerContraparteDetalle(ctx: Contexto, id: string): Promise<ContraparteDTO | null> {
  const c = await db(ctx).contraparte.findUnique({
    where: { id },
  });

  if (!c) return null;

  const countMov = await db(ctx).movimiento.count({
    where: { contraparteId: id },
  });

  return ocultarDatosContraparte(ctx, {
    id: c.id,
    nombre: c.nombre,
    nombreNormalizado: c.nombreNormalizado,
    esAuspiciador: c.esAuspiciador,
    esProveedor: c.esProveedor,
    contacto: c.contacto,
    rut: c.rut,
    activa: c.activa,
    fusionadaEnId: c.fusionadaEnId,
    creadoPorId: c.creadoPorId,
    version: c.version,
    creadoEn: c.creadoEn,
    movimientosCount: countMov,
  });
}

export async function obtenerContraparteDetalle(id: string): Promise<ContraparteDTO | null> {
  const ctx = await obtenerContexto();
  return ejecutarObtenerContraparteDetalle(ctx, id);
}
