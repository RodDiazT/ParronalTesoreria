"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, TipoCategoria } from "@prisma/client";
import { obtenerContexto, db, registrarAuditoria } from "@/lib/contexto";
import { Contexto, exigir } from "@/lib/permisos";
import { normalizarNombre } from "@/lib/utilidades";

const crearCategoriaSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(100, "Máximo 100 caracteres."),
  tipo: z.enum(["ingreso", "gasto"]),
  exigeContraparte: z.boolean().optional(),
  sujetoAsociado: z.enum(["caballo", "jinete", "binomio", "club", "prueba"]).nullable().optional(),
  exigeSujeto: z.boolean().optional(),
});

export type CrearCategoriaInput = z.infer<typeof crearCategoriaSchema>;

export async function ejecutarCrearCategoria(ctx: Contexto, datos: CrearCategoriaInput) {
  exigir(ctx, "configurar");

  const validado = crearCategoriaSchema.safeParse(datos);
  if (!validado.success) {
    return { exito: false, error: validado.error.errors[0]?.message || "Datos inválidos." };
  }

  const { nombre, tipo, exigeContraparte = false, sujetoAsociado = null, exigeSujeto = false } = validado.data;
  const nombreNorm = normalizarNombre(nombre);

  const existente = await db(ctx).categoria.findFirst({
    where: {
      tipo,
      nombreNormalizado: nombreNorm,
    },
  });

  if (existente) {
    if (!existente.activa) {
      return {
        exito: false,
        existeDesactivada: true,
        categoriaId: existente.id,
        nombre: existente.nombre,
        error: `Existe una categoría «${existente.nombre}» desactivada. Puedes reactivarla en lugar de crear una nueva.`,
      };
    }
    return {
      exito: false,
      error: `Ya existe una categoría activa llamada «${existente.nombre}» en ${tipo}s.`,
    };
  }

  const maxOrden = await db(ctx).categoria.aggregate({
    where: { tipo },
    _max: { orden: true },
  });
  const nuevoOrden = (maxOrden._max.orden ?? 0) + 1;

  const nueva = await db(ctx).categoria.create({
    data: {
      organizacionId: ctx.organizacionId,
      nombre,
      nombreNormalizado: nombreNorm,
      tipo,
      exigeContraparte,
      sujetoAsociado: sujetoAsociado || null,
      exigeSujeto: Boolean(exigeSujeto),
      activa: true,
      orden: nuevoOrden,
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "categoria",
    entidadId: nueva.id,
    accion: "crear",
    despues: {
      nombre: nueva.nombre,
      tipo: nueva.tipo,
      exigeContraparte: nueva.exigeContraparte,
      orden: nueva.orden,
    },
  });

  return { exito: true, categoria: nueva };
}

export async function crearCategoria(datos: CrearCategoriaInput) {
  const ctx = await obtenerContexto();
  const res = await ejecutarCrearCategoria(ctx, datos);
  if (res.exito) {
    revalidatePath("/configuracion/categorias");
  }
  return res;
}

export async function ejecutarRenombrarCategoria(ctx: Contexto, id: string, nuevoNombre: string, version: number) {
  exigir(ctx, "configurar");

  const nombreLimpio = nuevoNombre.trim();
  if (nombreLimpio.length < 2 || nombreLimpio.length > 100) {
    return { exito: false, error: "El nombre debe tener entre 2 y 100 caracteres." };
  }

  const catActual = await db(ctx).categoria.findUnique({
    where: { id },
  });

  if (!catActual) {
    return { exito: false, error: "La categoría no existe." };
  }

  if (catActual.version !== version) {
    return { exito: false, error: "Alguien cambió esta categoría. Por favor recarga." };
  }

  const nombreNorm = normalizarNombre(nombreLimpio);

  const choque = await db(ctx).categoria.findFirst({
    where: {
      tipo: catActual.tipo,
      nombreNormalizado: nombreNorm,
      id: { not: id },
    },
  });

  if (choque) {
    return {
      exito: false,
      error: `Ya existe otra categoría llamada «${choque.nombre}» en ${catActual.tipo}s.`,
    };
  }

  const catActualizada = await db(ctx).categoria.update({
    where: { id, version },
    data: {
      nombre: nombreLimpio,
      nombreNormalizado: nombreNorm,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "categoria",
    entidadId: id,
    accion: "editar",
    antes: { nombre: catActual.nombre },
    despues: { nombre: catActualizada.nombre },
  });

  return { exito: true, categoria: catActualizada };
}

export async function renombrarCategoria(id: string, nuevoNombre: string, version: number) {
  const ctx = await obtenerContexto();
  const res = await ejecutarRenombrarCategoria(ctx, id, nuevoNombre, version);
  if (res.exito) {
    revalidatePath("/configuracion/categorias");
  }
  return res;
}

export async function ejecutarCambiarTipoCategoria(ctx: Contexto, id: string, nuevoTipo: TipoCategoria, version: number) {
  exigir(ctx, "configurar");

  const catActual = await db(ctx).categoria.findUnique({
    where: { id },
  });

  if (!catActual) {
    return { exito: false, error: "La categoría no existe." };
  }

  if (catActual.claveSistema) {
    return { exito: false, error: "Las categorías de sistema no pueden cambiar de tipo." };
  }

  if (catActual.version !== version) {
    return { exito: false, error: "La categoría fue modificada por otro usuario. Por favor recarga." };
  }

  const countMovimientos = await db(ctx).movimiento.count({
    where: { categoriaId: id },
  });

  if (countMovimientos > 0) {
    return {
      exito: false,
      error: "No se puede cambiar el tipo de una categoría que ya tiene movimientos registrados.",
    };
  }

  const choque = await db(ctx).categoria.findFirst({
    where: {
      tipo: nuevoTipo,
      nombreNormalizado: catActual.nombreNormalizado,
      id: { not: id },
    },
  });

  if (choque) {
    return {
      exito: false,
      error: `Ya existe una categoría llamada «${choque.nombre}» en ${nuevoTipo}s.`,
    };
  }

  const maxOrden = await db(ctx).categoria.aggregate({
    where: { tipo: nuevoTipo },
    _max: { orden: true },
  });
  const nuevoOrden = (maxOrden._max.orden ?? 0) + 1;

  const catActualizada = await db(ctx).categoria.update({
    where: { id, version },
    data: {
      tipo: nuevoTipo,
      orden: nuevoOrden,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "categoria",
    entidadId: id,
    accion: "editar",
    antes: { tipo: catActual.tipo },
    despues: { tipo: catActualizada.tipo },
  });

  return { exito: true, categoria: catActualizada };
}

export async function cambiarTipoCategoria(id: string, nuevoTipo: TipoCategoria, version: number) {
  const ctx = await obtenerContexto();
  const res = await ejecutarCambiarTipoCategoria(ctx, id, nuevoTipo, version);
  if (res.exito) {
    revalidatePath("/configuracion/categorias");
  }
  return res;
}

export async function ejecutarConmutarExigeContraparte(ctx: Contexto, id: string, exigeContraparte: boolean, version: number) {
  exigir(ctx, "configurar");

  const catActual = await db(ctx).categoria.findUnique({
    where: { id },
  });

  if (!catActual) {
    return { exito: false, error: "La categoría no existe." };
  }

  if (catActual.version !== version) {
    return { exito: false, error: "La categoría fue modificada previamente. Por favor recarga." };
  }

  const catActualizada = await db(ctx).categoria.update({
    where: { id, version },
    data: {
      exigeContraparte,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "categoria",
    entidadId: id,
    accion: "editar",
    antes: { exigeContraparte: catActual.exigeContraparte },
    despues: { exigeContraparte: catActualizada.exigeContraparte },
  });

  return { exito: true, categoria: catActualizada };
}

export async function conmutarExigeContraparte(id: string, exigeContraparte: boolean, version: number) {
  const ctx = await obtenerContexto();
  const res = await ejecutarConmutarExigeContraparte(ctx, id, exigeContraparte, version);
  if (res.exito) {
    revalidatePath("/configuracion/categorias");
  }
  return res;
}

const actualizarCategoriaSchema = z.object({
  id: z.string(),
  version: z.number(),
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(100, "Máximo 100 caracteres."),
  exigeContraparte: z.boolean().optional(),
  sujetoAsociado: z.enum(["caballo", "jinete", "binomio", "club", "prueba"]).nullable().optional(),
  exigeSujeto: z.boolean().optional(),
});

export type ActualizarCategoriaInput = z.infer<typeof actualizarCategoriaSchema>;

export async function ejecutarActualizarCategoria(ctx: Contexto, datos: ActualizarCategoriaInput) {
  exigir(ctx, "configurar");

  const validado = actualizarCategoriaSchema.safeParse(datos);
  if (!validado.success) {
    return { exito: false, error: validado.error.errors[0]?.message || "Datos inválidos." };
  }

  const { id, version, nombre, exigeContraparte = false, sujetoAsociado = null, exigeSujeto = false } = validado.data;
  const nombreNorm = normalizarNombre(nombre);

  const catActual = await db(ctx).categoria.findUnique({
    where: { id },
  });

  if (!catActual) {
    return { exito: false, error: "La categoría no existe." };
  }

  if (catActual.version !== version) {
    return { exito: false, error: "La categoría fue modificada previamente. Por favor recarga." };
  }

  const choque = await db(ctx).categoria.findFirst({
    where: {
      tipo: catActual.tipo,
      nombreNormalizado: nombreNorm,
      id: { not: id },
    },
  });

  if (choque) {
    return {
      exito: false,
      error: `Ya existe otra categoría llamada «${choque.nombre}» en ${catActual.tipo}s.`,
    };
  }

  const catActualizada = await db(ctx).categoria.update({
    where: { id, version },
    data: {
      nombre: catActual.claveSistema ? catActual.nombre : nombre,
      nombreNormalizado: catActual.claveSistema ? catActual.nombreNormalizado : nombreNorm,
      exigeContraparte,
      sujetoAsociado: sujetoAsociado || null,
      exigeSujeto: Boolean(exigeSujeto),
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "categoria",
    entidadId: id,
    accion: "editar",
    antes: {
      nombre: catActual.nombre,
      exigeContraparte: catActual.exigeContraparte,
      sujetoAsociado: catActual.sujetoAsociado,
      exigeSujeto: catActual.exigeSujeto,
    },
    despues: {
      nombre: catActualizada.nombre,
      exigeContraparte: catActualizada.exigeContraparte,
      sujetoAsociado: catActualizada.sujetoAsociado,
      exigeSujeto: catActualizada.exigeSujeto,
    },
  });

  return { exito: true, categoria: catActualizada };
}

export async function actualizarCategoria(datos: ActualizarCategoriaInput) {
  const ctx = await obtenerContexto();
  const res = await ejecutarActualizarCategoria(ctx, datos);
  if (res.exito) {
    revalidatePath("/configuracion/categorias");
  }
  return res;
}

export async function ejecutarDesactivarCategoria(ctx: Contexto, id: string, version: number) {
  exigir(ctx, "configurar");

  const catActual = await db(ctx).categoria.findUnique({
    where: { id },
  });

  if (!catActual) {
    return { exito: false, error: "La categoría no existe." };
  }

  if (catActual.claveSistema) {
    return {
      exito: false,
      error: "Las categorías de sistema no se pueden desactivar.",
    };
  }

  if (catActual.version !== version) {
    return { exito: false, error: "La categoría cambió. Por favor recarga." };
  }

  const catActualizada = await db(ctx).categoria.update({
    where: { id, version },
    data: {
      activa: false,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "categoria",
    entidadId: id,
    accion: "desactivar",
    antes: { activa: true },
    despues: { activa: false },
  });

  return { exito: true, categoria: catActualizada };
}

export async function desactivarCategoria(id: string, version: number) {
  const ctx = await obtenerContexto();
  const res = await ejecutarDesactivarCategoria(ctx, id, version);
  if (res.exito) {
    revalidatePath("/configuracion/categorias");
  }
  return res;
}

export async function ejecutarReactivarCategoria(ctx: Contexto, id: string, version: number) {
  exigir(ctx, "configurar");

  const catActual = await db(ctx).categoria.findUnique({
    where: { id },
  });

  if (!catActual) {
    return { exito: false, error: "La categoría no existe." };
  }

  if (catActual.version !== version) {
    return { exito: false, error: "La categoría cambió. Por favor recarga." };
  }

  const catActualizada = await db(ctx).categoria.update({
    where: { id, version },
    data: {
      activa: true,
      version: { increment: 1 },
    },
  });

  await registrarAuditoria(ctx, {
    entidad: "categoria",
    entidadId: id,
    accion: "reactivar",
    antes: { activa: false },
    despues: { activa: true },
  });

  return { exito: true, categoria: catActualizada };
}

export async function reactivarCategoria(id: string, version: number) {
  const ctx = await obtenerContexto();
  const res = await ejecutarReactivarCategoria(ctx, id, version);
  if (res.exito) {
    revalidatePath("/configuracion/categorias");
  }
  return res;
}

export async function ejecutarReordenarCategoria(ctx: Contexto, id: string, direccion: "subir" | "bajar") {
  exigir(ctx, "configurar");

  const actual = await db(ctx).categoria.findUnique({
    where: { id },
  });

  if (!actual) return { exito: false, error: "Categoría no encontrada." };

  const todas = await db(ctx).categoria.findMany({
    where: { tipo: actual.tipo },
    orderBy: { orden: "asc" },
  });

  const idxActual = todas.findIndex((c) => c.id === id);
  if (idxActual === -1) return { exito: false, error: "Categoría no encontrada." };

  const idxObjetivo = direccion === "subir" ? idxActual - 1 : idxActual + 1;
  if (idxObjetivo < 0 || idxObjetivo >= todas.length) {
    return { exito: true };
  }

  const objetivo = todas[idxObjetivo];

  await db(ctx).$transaction([
    db(ctx).categoria.update({
      where: { id: actual.id },
      data: { orden: objetivo.orden },
    }),
    db(ctx).categoria.update({
      where: { id: objetivo.id },
      data: { orden: actual.orden },
    }),
  ]);

  return { exito: true };
}

export async function reordenarCategoria(id: string, direccion: "subir" | "bajar") {
  const ctx = await obtenerContexto();
  const res = await ejecutarReordenarCategoria(ctx, id, direccion);
  if (res.exito) {
    revalidatePath("/configuracion/categorias");
  }
  return res;
}

export async function ejecutarObtenerCategoriasSelector(
  ctx: Contexto,
  tipo: TipoCategoria,
  opciones?: { incluirInscripciones?: boolean }
) {
  const claveSistemaExcluidas: string[] = ["devoluciones"];
  if (opciones?.incluirInscripciones === false || tipo === "gasto") {
    claveSistemaExcluidas.push("inscripciones");
  }

  const categorias = await db(ctx).categoria.findMany({
    where: {
      tipo,
      activa: true,
      OR: [
        { claveSistema: null },
        { claveSistema: { notIn: claveSistemaExcluidas } },
      ],
    },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      exigeContraparte: true,
      sujetoAsociado: true,
      exigeSujeto: true,
      claveSistema: true,
      orden: true,
    },
    orderBy: { orden: "asc" },
  });

  return categorias.map((c) => {
    if (c.claveSistema === "inscripciones") {
      return {
        ...c,
        sujetoAsociado: c.sujetoAsociado || "binomio",
        exigeSujeto: true,
      };
    }
    return c;
  });
}

export async function obtenerCategoriasSelector(
  tipo: TipoCategoria,
  opciones?: { incluirInscripciones?: boolean }
) {
  const ctx = await obtenerContexto();
  return ejecutarObtenerCategoriasSelector(ctx, tipo, opciones);
}

export async function ejecutarEliminarCategoria(
  ctx: Contexto,
  id: string,
  reasignarAId?: string
) {
  if (ctx.rol !== "administrador") {
    throw new Error("Permiso denegado: rol administrador requerido");
  }

  const categoria = await db(ctx).categoria.findUnique({
    where: { id },
  });

  if (!categoria || categoria.organizacionId !== ctx.organizacionId) {
    return { exito: false, error: "Categoría no encontrada." };
  }

  if (categoria.claveSistema !== null) {
    return {
      exito: false,
      error: "Las categorías del sistema están protegidas y no pueden ser eliminadas.",
    };
  }

  const movimientosCount = await db(ctx).movimiento.count({
    where: { categoriaId: id },
  });

  if (movimientosCount === 0) {
    await db(ctx).$transaction(async (tx) => {
      await tx.categoria.delete({ where: { id } });
      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Categoria",
          entidadId: id,
          accion: "eliminar",
          antes: categoria as unknown as Prisma.InputJsonValue,
        },
      });
    });

    try {
      revalidatePath("/configuracion/categorias");
    } catch {
      // Test environment
    }
    return { exito: true };
  }

  // Caso B: >0 movimientos registrados
  if (!reasignarAId) {
    return {
      exito: false,
      error: `La categoría tiene ${movimientosCount} movimientos asociados. Debes seleccionar una categoría de destino para reasignarlos.`,
    };
  }

  if (reasignarAId === id) {
    return {
      exito: false,
      error: "La categoría de destino debe ser distinta a la categoría a eliminar.",
    };
  }

  const destino = await db(ctx).categoria.findUnique({
    where: { id: reasignarAId },
  });

  if (!destino || destino.organizacionId !== ctx.organizacionId) {
    return {
      exito: false,
      error: "La categoría de destino no existe o no pertenece a la organización.",
    };
  }

  if (destino.tipo !== categoria.tipo) {
    return {
      exito: false,
      error: `La categoría de destino debe ser del mismo tipo (${categoria.tipo}).`,
    };
  }

  if (!destino.activa) {
    return {
      exito: false,
      error: "La categoría de destino debe estar activa.",
    };
  }

  await db(ctx).$transaction([
    db(ctx).movimiento.updateMany({
      where: { categoriaId: id },
      data: { categoriaId: reasignarAId },
    }),
    db(ctx).categoria.delete({ where: { id } }),
    db(ctx).registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Categoria",
        entidadId: id,
        accion: "eliminar",
        antes: categoria as unknown as Prisma.InputJsonValue,
        despues: { reasignadoAId: reasignarAId } as unknown as Prisma.InputJsonValue,
      },
    }),
  ]);

  try {
    revalidatePath("/configuracion/categorias");
  } catch {
    // Test environment
  }
  return { exito: true };
}

export async function eliminarCategoria(id: string, reasignarAId?: string) {
  const ctx = await obtenerContexto();
  const res = await ejecutarEliminarCategoria(ctx, id, reasignarAId);
  if (res.exito) {
    revalidatePath("/configuracion/categorias");
  }
  return res;
}

