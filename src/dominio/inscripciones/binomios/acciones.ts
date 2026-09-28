"use server";

import { Prisma } from "@prisma/client";
import { db, exigirDeLaOrganizacion, obtenerContexto } from "@/lib/contexto";
import { Contexto, exigir, puede } from "@/lib/permisos";
import { normalizarNombre } from "@/lib/utilidades";
import { revalidatePath } from "next/cache";
import {
  tarifaSchema,
  cantidadSchema,
  ConflictoBinomios,
  DetalleConflictoBinomio,
  estadoItem,
  esPagoVigente,
} from "./reglas";
import { textoEstadoCuenta } from "./consultas";

function revalidarRutasSeguras() {
  try {
    revalidatePath("/inscripciones");
    revalidatePath("/configuracion/pruebas");
    revalidatePath("/configuracion/page");
    revalidatePath("/participantes");
    revalidatePath("/movimientos");
    revalidatePath("/movimientos/validar");
  } catch {
    // Fuera de contexto Next.js (ej. tests)
  }
}

// -------------------------------------------------------------
// Paso 6.1: Configuración de Pruebas
// -------------------------------------------------------------

export interface CrearPruebaInput {
  nombre: string;
  tarifaClp: number;
  edadMinima?: number | null;
  edadMaxima?: number | null;
  orden?: number;
}

export async function ejecutarCrearPrueba(ctx: Contexto, datos: CrearPruebaInput) {
  exigir(ctx, "configurar");

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return { exito: false, error: "El evento debe estar abierto para configurar pruebas." };
  }

  const nombreLimpio = datos.nombre.trim();
  if (nombreLimpio.length < 2 || nombreLimpio.length > 80) {
    return { exito: false, error: "El nombre de la prueba debe tener entre 2 y 80 caracteres." };
  }

  const tarifaVal = tarifaSchema.safeParse(datos.tarifaClp);
  if (!tarifaVal.success) {
    return { exito: false, error: "La tarifa debe ser un entero mayor o igual a 0." };
  }

  if (
    datos.edadMinima !== undefined &&
    datos.edadMaxima !== undefined &&
    datos.edadMinima !== null &&
    datos.edadMaxima !== null &&
    datos.edadMinima > datos.edadMaxima
  ) {
    return { exito: false, error: "La edad mínima no puede ser mayor que la edad máxima." };
  }

  const nombreNormalizado = normalizarNombre(nombreLimpio);

  const existente = await db(ctx).prueba.findUnique({
    where: {
      eventoId_nombreNormalizado: {
        eventoId: ctx.evento.id,
        nombreNormalizado,
      },
    },
  });

  if (existente) {
    return { exito: false, error: "Ya existe una prueba con este nombre en el evento." };
  }

  let orden = datos.orden;
  if (orden === undefined) {
    const maxOrden = await db(ctx).prueba.aggregate({
      where: { eventoId: ctx.evento.id },
      _max: { orden: true },
    });
    orden = (maxOrden._max.orden ?? 0) + 1;
  }

  const nueva = await db(ctx).$transaction(async (tx) => {
    const p = await tx.prueba.create({
      data: {
        organizacionId: ctx.organizacionId,
        eventoId: ctx.evento!.id,
        nombre: nombreLimpio,
        nombreNormalizado,
        tarifaClp: datos.tarifaClp,
        edadMinima: datos.edadMinima ?? null,
        edadMaxima: datos.edadMaxima ?? null,
        orden,
        creadoPorId: ctx.usuario.id,
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Prueba",
        entidadId: p.id,
        accion: "crear",
        despues: p as unknown as Prisma.InputJsonValue,
      },
    });

    return p;
  });

  revalidarRutasSeguras();
  return { exito: true, prueba: nueva };
}

export async function crearPrueba(datos: CrearPruebaInput) {
  const ctx = await obtenerContexto();
  return ejecutarCrearPrueba(ctx, datos);
}

export async function ejecutarEditarPrueba(
  ctx: Contexto,
  id: string,
  datos: Partial<CrearPruebaInput> & { activa?: boolean },
  version: number
) {
  exigir(ctx, "configurar");
  await exigirDeLaOrganizacion(ctx, "prueba", id);

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return { exito: false, error: "El evento debe estar abierto para modificar pruebas." };
  }

  const actual = await db(ctx).prueba.findUnique({ where: { id } });
  if (!actual) return { exito: false, error: "La prueba no existe." };

  if (actual.version !== version) {
    return { exito: false, error: "La prueba fue modificada por otro usuario." };
  }

  const dataUpdate: Prisma.PruebaUpdateInput = {
    version: actual.version + 1,
  };

  if (datos.nombre !== undefined) {
    const nombreLimpio = datos.nombre.trim();
    if (nombreLimpio.length < 2 || nombreLimpio.length > 80) {
      return { exito: false, error: "El nombre debe tener entre 2 y 80 caracteres." };
    }
    const nombreNormalizado = normalizarNombre(nombreLimpio);
    const existente = await db(ctx).prueba.findFirst({
      where: {
        eventoId: ctx.evento.id,
        nombreNormalizado,
        id: { not: id },
      },
    });
    if (existente) {
      return { exito: false, error: "Ya existe otra prueba con este nombre." };
    }
    dataUpdate.nombre = nombreLimpio;
    dataUpdate.nombreNormalizado = nombreNormalizado;
  }

  if (datos.tarifaClp !== undefined) {
    const tVal = tarifaSchema.safeParse(datos.tarifaClp);
    if (!tVal.success) return { exito: false, error: "Tarifa no válida." };
    dataUpdate.tarifaClp = datos.tarifaClp;
  }

  if (datos.edadMinima !== undefined) dataUpdate.edadMinima = datos.edadMinima;
  if (datos.edadMaxima !== undefined) dataUpdate.edadMaxima = datos.edadMaxima;
  if (datos.orden !== undefined) dataUpdate.orden = datos.orden;
  if (datos.activa !== undefined) dataUpdate.activa = datos.activa;

  const actualizada = await db(ctx).$transaction(async (tx) => {
    const p = await tx.prueba.update({
      where: { id },
      data: dataUpdate,
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Prueba",
        entidadId: id,
        accion: "modificar",
        antes: actual as unknown as Prisma.InputJsonValue,
        despues: p as unknown as Prisma.InputJsonValue,
      },
    });

    return p;
  });

  revalidarRutasSeguras();
  return { exito: true, prueba: actualizada };
}

export async function editarPrueba(
  id: string,
  datos: Partial<CrearPruebaInput> & { activa?: boolean },
  version: number
) {
  const ctx = await obtenerContexto();
  return ejecutarEditarPrueba(ctx, id, datos, version);
}

// -------------------------------------------------------------
// Paso 6.1: Configuración de Conceptos Adicionales
// -------------------------------------------------------------

export interface CrearConceptoInput {
  nombre: string;
  aplicaA: "binomio" | "participante";
  tarifaClp: number;
  unidad?: string | null;
  categoriaReferenciaId?: string | null;
  orden?: number;
}

export async function ejecutarCrearConcepto(ctx: Contexto, datos: CrearConceptoInput) {
  exigir(ctx, "configurar");

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return { exito: false, error: "El evento debe estar abierto para configurar conceptos." };
  }

  const nombreLimpio = datos.nombre.trim();
  if (nombreLimpio.length < 2 || nombreLimpio.length > 80) {
    return { exito: false, error: "El nombre del concepto debe tener entre 2 y 80 caracteres." };
  }

  const tarifaVal = tarifaSchema.safeParse(datos.tarifaClp);
  if (!tarifaVal.success) {
    return { exito: false, error: "La tarifa debe ser un entero mayor o igual a 0." };
  }

  const nombreNormalizado = normalizarNombre(nombreLimpio);

  const existente = await db(ctx).concepto.findUnique({
    where: {
      eventoId_nombreNormalizado: {
        eventoId: ctx.evento.id,
        nombreNormalizado,
      },
    },
  });

  if (existente) {
    return { exito: false, error: "Ya existe un concepto con este nombre en el evento." };
  }

  if (datos.categoriaReferenciaId) {
    await exigirDeLaOrganizacion(ctx, "categoria", datos.categoriaReferenciaId);
  }

  let orden = datos.orden;
  if (orden === undefined) {
    const maxOrden = await db(ctx).concepto.aggregate({
      where: { eventoId: ctx.evento.id },
      _max: { orden: true },
    });
    orden = (maxOrden._max.orden ?? 0) + 1;
  }

  const nuevo = await db(ctx).$transaction(async (tx) => {
    const c = await tx.concepto.create({
      data: {
        organizacionId: ctx.organizacionId,
        eventoId: ctx.evento!.id,
        nombre: nombreLimpio,
        nombreNormalizado,
        aplicaA: datos.aplicaA,
        tarifaClp: datos.tarifaClp,
        unidad: datos.unidad?.trim() || null,
        categoriaReferenciaId: datos.categoriaReferenciaId || null,
        orden,
        creadoPorId: ctx.usuario.id,
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Concepto",
        entidadId: c.id,
        accion: "crear",
        despues: c as unknown as Prisma.InputJsonValue,
      },
    });

    return c;
  });

  revalidarRutasSeguras();
  return { exito: true, concepto: nuevo };
}

export async function crearConcepto(datos: CrearConceptoInput) {
  const ctx = await obtenerContexto();
  return ejecutarCrearConcepto(ctx, datos);
}

export async function ejecutarEditarConcepto(
  ctx: Contexto,
  id: string,
  datos: Partial<CrearConceptoInput> & { activo?: boolean },
  version: number
) {
  exigir(ctx, "configurar");
  await exigirDeLaOrganizacion(ctx, "concepto", id);

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return { exito: false, error: "El evento debe estar abierto para modificar conceptos." };
  }

  const actual = await db(ctx).concepto.findUnique({
    where: { id },
    include: { cargos: { where: { anulado: false } } },
  });
  if (!actual) return { exito: false, error: "El concepto no existe." };

  if (actual.version !== version) {
    return { exito: false, error: "El concepto fue modificado por otro usuario." };
  }

  // Si ya tiene cargos, no se puede cambiar 'aplicaA' (docs §3.1)
  if (datos.aplicaA && datos.aplicaA !== actual.aplicaA && actual.cargos.length > 0) {
    return { exito: false, error: "No se puede cambiar el tipo de cobro ('Se cobra a') de un concepto que ya tiene cargos." };
  }

  const dataUpdate: Prisma.ConceptoUpdateInput = {
    version: actual.version + 1,
  };

  if (datos.nombre !== undefined) {
    const nombreLimpio = datos.nombre.trim();
    if (nombreLimpio.length < 2 || nombreLimpio.length > 80) {
      return { exito: false, error: "El nombre debe tener entre 2 y 80 caracteres." };
    }
    const nombreNormalizado = normalizarNombre(nombreLimpio);
    const existente = await db(ctx).concepto.findFirst({
      where: {
        eventoId: ctx.evento.id,
        nombreNormalizado,
        id: { not: id },
      },
    });
    if (existente) {
      return { exito: false, error: "Ya existe otro concepto con este nombre." };
    }
    dataUpdate.nombre = nombreLimpio;
    dataUpdate.nombreNormalizado = nombreNormalizado;
  }

  if (datos.tarifaClp !== undefined) {
    const tVal = tarifaSchema.safeParse(datos.tarifaClp);
    if (!tVal.success) return { exito: false, error: "Tarifa no válida." };
    dataUpdate.tarifaClp = datos.tarifaClp;
  }

  if (datos.aplicaA !== undefined) dataUpdate.aplicaA = datos.aplicaA;
  if (datos.unidad !== undefined) dataUpdate.unidad = datos.unidad?.trim() || null;
  if (datos.orden !== undefined) dataUpdate.orden = datos.orden;
  if (datos.activo !== undefined) dataUpdate.activo = datos.activo;
  if (datos.categoriaReferenciaId !== undefined) {
    if (datos.categoriaReferenciaId) {
      await exigirDeLaOrganizacion(ctx, "categoria", datos.categoriaReferenciaId);
    }
    dataUpdate.categoriaReferencia = datos.categoriaReferenciaId
      ? { connect: { id: datos.categoriaReferenciaId } }
      : { disconnect: true };
  }

  const actualizado = await db(ctx).$transaction(async (tx) => {
    const c = await tx.concepto.update({
      where: { id },
      data: dataUpdate,
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Concepto",
        entidadId: id,
        accion: "modificar",
        antes: actual as unknown as Prisma.InputJsonValue,
        despues: c as unknown as Prisma.InputJsonValue,
      },
    });

    return c;
  });

  revalidarRutasSeguras();
  return { exito: true, concepto: actualizado };
}

export async function editarConcepto(
  id: string,
  datos: Partial<CrearConceptoInput> & { activo?: boolean },
  version: number
) {
  const ctx = await obtenerContexto();
  return ejecutarEditarConcepto(ctx, id, datos, version);
}

// -------------------------------------------------------------
// Paso 6.2: Inscripción de Binomios en Terreno
// -------------------------------------------------------------

export interface ItemPruebaInscripcionInput {
  pruebaId: string;
  montoClp?: number;
  motivoAjuste?: string;
}

export interface InscribirInput {
  jineteId: string;
  caballoId: string;
  clubId?: string;
  pruebas: ItemPruebaInscripcionInput[];
  claveCliente: string;
  importacionId?: string;
}

export async function ejecutarInscribir(
  ctx: Contexto,
  datos: InscribirInput,
  opciones?: { tx?: any; auditar?: boolean }
) {
  exigir(ctx, "inscripciones.inscribir");

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return { exito: false, error: "El evento debe estar abierto para registrar inscripciones." };
  }

  if (datos.pruebas.length === 0) {
    return { exito: false, error: "Debes seleccionar al menos una prueba para inscribir." };
  }

  await exigirDeLaOrganizacion(ctx, "jinete", datos.jineteId);
  await exigirDeLaOrganizacion(ctx, "caballo", datos.caballoId);
  if (datos.clubId) {
    await exigirDeLaOrganizacion(ctx, "club", datos.clubId);
  }
  for (const item of datos.pruebas) {
    await exigirDeLaOrganizacion(ctx, "prueba", item.pruebaId);
  }

  const operacion = async (tx: any) => {
    const jinete = await tx.jinete.findUnique({
      where: { id: datos.jineteId },
      include: { club: true },
    });
    if (!jinete || !jinete.activo) {
      throw new Error("El jinete seleccionado no existe o está inactivo.");
    }

    const caballo = await tx.caballo.findUnique({
      where: { id: datos.caballoId },
    });
    if (!caballo || !caballo.activo) {
      throw new Error("El caballo seleccionado no existe o está inactivo.");
    }

    const clubIdFinal = datos.clubId || jinete.clubId;

    // 1. Idempotencia: Verificar si ya se procesó con esta claveCliente
    const inscripcionesExistentesClave = await tx.inscripcion.findMany({
      where: {
        organizacionId: ctx.organizacionId,
        claveCliente: datos.claveCliente,
      },
      include: { binomio: true, prueba: true },
    });

    if (inscripcionesExistentesClave.length > 0) {
      const primera = inscripcionesExistentesClave[0];
      if (primera.registradoPorId === ctx.usuario.id) {
        return {
          reintento: true,
          binomioId: primera.binomioId,
          binomio: primera.binomio,
          inscripciones: inscripcionesExistentesClave,
        };
      }
      throw new Error("La clave de cliente ya fue utilizada en otra operación.");
    }

    // 2. Obtener o crear Binomio
    let binomio = await tx.binomio.findFirst({
      where: {
        organizacionId: ctx.organizacionId,
        eventoId: ctx.evento!.id,
        jineteId: datos.jineteId,
        caballoId: datos.caballoId,
        anulado: false,
      },
    });

    if (!binomio) {
      binomio = await tx.binomio.create({
        data: {
          organizacionId: ctx.organizacionId,
          eventoId: ctx.evento!.id,
          jineteId: datos.jineteId,
          caballoId: datos.caballoId,
          clubId: clubIdFinal,
          importacionId: datos.importacionId || null,
          creadoPorId: ctx.usuario.id,
        },
      });

      if (opciones?.auditar !== false) {
        await tx.registroAuditoria.create({
          data: {
            organizacionId: ctx.organizacionId,
            usuarioId: ctx.usuario.id,
            entidad: "Binomio",
            entidadId: binomio.id,
            accion: "crear",
            despues: binomio as unknown as Prisma.InputJsonValue,
          },
        });
      }
    } else if (datos.clubId && binomio.clubId !== datos.clubId) {
      // Actualizar club del binomio si se especificó uno diferente para este evento
      binomio = await tx.binomio.update({
        where: { id: binomio.id },
        data: {
          clubId: datos.clubId,
          version: binomio.version + 1,
        },
      });
    }

    // 3. Cuota por binomio automática (Conceptos con aplicaA === 'binomio')
    const conceptosBinomio = await tx.concepto.findMany({
      where: {
        organizacionId: ctx.organizacionId,
        eventoId: ctx.evento!.id,
        aplicaA: "binomio",
        activo: true,
      },
    });

    for (const c of conceptosBinomio) {
      const cargoExistente = await tx.cargo.findFirst({
        where: {
          organizacionId: ctx.organizacionId,
          eventoId: ctx.evento!.id,
          binomioId: binomio.id,
          conceptoId: c.id,
          anulado: false,
        },
      });

      if (!cargoExistente) {
        const nuevoCargo = await tx.cargo.create({
          data: {
            organizacionId: ctx.organizacionId,
            eventoId: ctx.evento!.id,
            conceptoId: c.id,
            binomioId: binomio.id,
            automatico: true,
            cantidad: 1,
            tarifaClp: c.tarifaClp,
            precioUnitarioClp: c.tarifaClp,
            montoClp: c.tarifaClp,
            claveCliente: `${datos.claveCliente}_cuota_${c.id}`,
            registradoPorId: ctx.usuario.id,
          },
        });

        if (opciones?.auditar !== false) {
          await tx.registroAuditoria.create({
            data: {
              organizacionId: ctx.organizacionId,
              usuarioId: ctx.usuario.id,
              entidad: "Cargo",
              entidadId: nuevoCargo.id,
              accion: "crear_automatico",
              despues: nuevoCargo as unknown as Prisma.InputJsonValue,
            },
          });
        }
      }
    }

    // 4. Crear cada inscripción en prueba seleccionada
    const inscripcionesCreadas = [];

    for (const item of datos.pruebas) {
      const prueba = await tx.prueba.findUnique({ where: { id: item.pruebaId } });
      if (!prueba || !prueba.activa) {
        throw new Error(`La prueba con id '${item.pruebaId}' no existe o no está activa.`);
      }

      // Validar si ya está inscrito
      const yaInscrito = await tx.inscripcion.findFirst({
        where: {
          binomioId: binomio.id,
          pruebaId: item.pruebaId,
          anulado: false,
        },
      });

      if (yaInscrito) {
        throw new Error(`El binomio ya se encuentra inscrito en la prueba '${prueba.nombre}'.`);
      }

      const tarifaClp = prueba.tarifaClp;
      const montoClp = item.montoClp !== undefined ? item.montoClp : tarifaClp;

      const tVal = tarifaSchema.safeParse(montoClp);
      if (!tVal.success) {
        throw new Error(`Monto no válido para la prueba '${prueba.nombre}'.`);
      }

      const huboAjuste = montoClp !== tarifaClp;
      if (huboAjuste && (!item.motivoAjuste || item.motivoAjuste.trim().length === 0)) {
        throw new Error(`El motivo de ajuste es obligatorio para la prueba '${prueba.nombre}'.`);
      }

      // Si quien ajusta es un ayudante, genera aviso "Visto" pendiente
      const avisoPendiente = huboAjuste && !puede(ctx, "inscripciones.administrar");

      const inscripcion = await tx.inscripcion.create({
        data: {
          organizacionId: ctx.organizacionId,
          eventoId: ctx.evento!.id,
          binomioId: binomio.id,
          pruebaId: item.pruebaId,
          tarifaClp,
          montoClp,
          motivoAjuste: huboAjuste ? item.motivoAjuste?.trim() || null : null,
          avisoPendiente,
          claveCliente: datos.claveCliente,
          importacionId: datos.importacionId || null,
          registradoPorId: ctx.usuario.id,
        },
      });

      if (opciones?.auditar !== false) {
        await tx.registroAuditoria.create({
          data: {
            organizacionId: ctx.organizacionId,
            usuarioId: ctx.usuario.id,
            entidad: "Inscripcion",
            entidadId: inscripcion.id,
            accion: "inscribir",
            despues: inscripcion as unknown as Prisma.InputJsonValue,
          },
        });
      }

      inscripcionesCreadas.push(inscripcion);
    }

    return {
      reintento: false,
      binomioId: binomio.id,
      binomio,
      inscripciones: inscripcionesCreadas,
    };
  };

  try {
    let resultado;
    if (opciones?.tx) {
      resultado = await operacion(opciones.tx);
    } else {
      resultado = await db(ctx).$transaction(operacion, { maxWait: 15000, timeout: 30000 });
    }

    revalidarRutasSeguras();
    return { exito: true as const, ...resultado };
  } catch (error: any) {
    return { exito: false as const, error: error?.message || "No se pudo registrar la inscripción." };
  }
}

export async function inscribir(datos: InscribirInput) {
  const ctx = await obtenerContexto();
  return ejecutarInscribir(ctx, datos);
}

// -------------------------------------------------------------
// Paso 6.2: Cargos Adicionales a Jinete o Club (Servicios)
// -------------------------------------------------------------

export interface AgregarCargoInput {
  conceptoId: string;
  binomioId?: string;
  jineteId?: string;
  clubId?: string;
  cantidad: number;
  precioUnitarioClp?: number;
  montoClp?: number;
  descripcion?: string;
  observaciones?: string;
  motivoAjuste?: string;
  claveCliente?: string;
}

export async function ejecutarAgregarCargo(ctx: Contexto, datos: AgregarCargoInput) {
  exigir(ctx, "inscripciones.inscribir");

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return { exito: false, error: "El evento debe estar abierto para registrar cobros." };
  }

  const cantidadVal = cantidadSchema.safeParse(datos.cantidad);
  if (!cantidadVal.success) {
    return { exito: false, error: "La cantidad debe ser un entero entre 1 y 999." };
  }

  // Exactamente uno de los tres destinatarios debe ser provisto
  const destinatarios = [datos.binomioId, datos.jineteId, datos.clubId].filter(Boolean);
  if (destinatarios.length !== 1) {
    return { exito: false, error: "El cargo debe estar asignado exactamente a un binomio, jinete o club." };
  }

  await exigirDeLaOrganizacion(ctx, "concepto", datos.conceptoId);

  const concepto = await db(ctx).concepto.findUnique({ where: { id: datos.conceptoId } });
  if (!concepto || !concepto.activo) {
    return { exito: false, error: "El concepto seleccionado no existe o está inactivo." };
  }

  if (datos.binomioId) await exigirDeLaOrganizacion(ctx, "binomio", datos.binomioId);
  if (datos.jineteId) await exigirDeLaOrganizacion(ctx, "jinete", datos.jineteId);
  if (datos.clubId) await exigirDeLaOrganizacion(ctx, "club", datos.clubId);

  const tarifaClp = concepto.tarifaClp;
  const precioUnitarioClp =
    datos.precioUnitarioClp !== undefined
      ? datos.precioUnitarioClp
      : datos.montoClp !== undefined
      ? Math.round(datos.montoClp / Math.max(1, datos.cantidad))
      : tarifaClp;

  const precioVal = tarifaSchema.safeParse(precioUnitarioClp);
  if (!precioVal.success) {
    return { exito: false, error: "Precio unitario no válido." };
  }

  const montoClp = datos.cantidad * precioUnitarioClp;
  const huboAjuste = precioUnitarioClp !== tarifaClp;

  if (huboAjuste && (!datos.motivoAjuste || datos.motivoAjuste.trim().length === 0)) {
    return { exito: false, error: "El motivo de ajuste es obligatorio si cambia el precio unitario." };
  }

  const avisoPendiente = huboAjuste && !puede(ctx, "inscripciones.administrar");
  const claveCliente =
    datos.claveCliente ||
    `cargo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const descripcion = (datos.descripcion || datos.observaciones)?.trim() || null;

  try {
    const nuevoCargo = await db(ctx).$transaction(async (tx) => {
      // Idempotencia
      const existente = await tx.cargo.findFirst({
        where: {
          organizacionId: ctx.organizacionId,
          claveCliente,
          conceptoId: datos.conceptoId,
        },
      });

      if (existente) {
        if (existente.registradoPorId === ctx.usuario.id) {
          return existente;
        }
        throw new Error("La clave de cliente ya fue utilizada en otro cargo.");
      }

      const c = await tx.cargo.create({
        data: {
          organizacionId: ctx.organizacionId,
          eventoId: ctx.evento!.id,
          conceptoId: datos.conceptoId,
          binomioId: datos.binomioId || null,
          jineteId: datos.jineteId || null,
          clubId: datos.clubId || null,
          automatico: false,
          cantidad: datos.cantidad,
          tarifaClp,
          precioUnitarioClp,
          montoClp,
          descripcion,
          motivoAjuste: huboAjuste ? datos.motivoAjuste?.trim() || null : null,
          avisoPendiente,
          claveCliente,
          registradoPorId: ctx.usuario.id,
        },
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Cargo",
          entidadId: c.id,
          accion: "crear",
          despues: c as unknown as Prisma.InputJsonValue,
        },
      });

      return c;
    });

    revalidarRutasSeguras();
    return { exito: true, cargo: nuevoCargo };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo registrar el cargo." };
  }
}

export async function agregarCargo(datos: AgregarCargoInput) {
  const ctx = await obtenerContexto();
  return ejecutarAgregarCargo(ctx, datos);
}

// -------------------------------------------------------------
// Paso 6.2 y 6.4: Ajustes, Avisos y Cambios Pre-concurso
// -------------------------------------------------------------

export async function ejecutarAjustarItem(
  ctx: Contexto,
  tipo: "inscripcion" | "cargo",
  id: string,
  datosOMonto:
    | number
    | {
        montoClp?: number;
        cantidad?: number;
        precioUnitarioClp?: number;
        motivo: string;
      },
  motivoOVersion?: string | number,
  versionOpcional?: number
) {
  exigir(ctx, "inscripciones.inscribir");
  await exigirDeLaOrganizacion(ctx, tipo, id);

  let datos: {
    montoClp?: number;
    cantidad?: number;
    precioUnitarioClp?: number;
    motivo: string;
  };
  let version: number | undefined;

  if (typeof datosOMonto === "number") {
    datos = {
      montoClp: datosOMonto,
      motivo: typeof motivoOVersion === "string" ? motivoOVersion : "",
    };
    version = typeof versionOpcional === "number" ? versionOpcional : undefined;
  } else {
    datos = datosOMonto;
    version = typeof motivoOVersion === "number" ? motivoOVersion : undefined;
  }

  if (!datos.motivo || datos.motivo.trim().length === 0) {
    return { exito: false, error: "El motivo del ajuste es obligatorio." };
  }
  if (datos.motivo.length > 200) {
    return { exito: false, error: "El motivo no puede superar los 200 caracteres." };
  }

  const avisoPendiente = !puede(ctx, "inscripciones.administrar");

  try {
    const itemActualizado = await db(ctx).$transaction(async (tx) => {
      if (tipo === "inscripcion") {
        const ins = await tx.inscripcion.findUnique({
          where: { id },
          include: { pagos: { where: { anulado: false } } },
        });
        if (!ins || ins.anulado) throw new Error("La inscripción no existe o está anulada.");
        if (version !== undefined && ins.version !== version) {
          throw new Error("La inscripción fue modificada por otro usuario.");
        }

        const pagado = ins.pagos.reduce((acc: number, p: any) => acc + p.montoClp, 0);
        const nuevoMonto = datos.montoClp !== undefined ? datos.montoClp : ins.montoClp;

        if (nuevoMonto < pagado) {
          throw new Error(`El monto no puede quedar bajo lo ya pagado ($${pagado}). Primero desasigna el excedente.`);
        }

        const res = await tx.inscripcion.update({
          where: { id },
          data: {
            montoClp: nuevoMonto,
            motivoAjuste: datos.motivo.trim(),
            avisoPendiente: avisoPendiente || ins.avisoPendiente,
            version: ins.version + 1,
          },
        });

        await tx.registroAuditoria.create({
          data: {
            organizacionId: ctx.organizacionId,
            usuarioId: ctx.usuario.id,
            entidad: "Inscripcion",
            entidadId: id,
            accion: "ajustar_monto",
            antes: { montoClp: ins.montoClp },
            despues: { montoClp: nuevoMonto, motivo: datos.motivo.trim() },
          },
        });

        return res;
      } else {
        const cargo = await tx.cargo.findUnique({
          where: { id },
          include: { pagos: { where: { anulado: false } } },
        });
        if (!cargo || cargo.anulado) throw new Error("El cargo no existe o está anulado.");
        if (version !== undefined && cargo.version !== version) {
          throw new Error("El cargo fue modificado por otro usuario.");
        }

        const pagado = cargo.pagos.reduce((acc: number, p: any) => acc + p.montoClp, 0);

        const nuevaCantidad = datos.cantidad !== undefined ? datos.cantidad : cargo.cantidad;
        const nuevoPrecio = datos.precioUnitarioClp !== undefined ? datos.precioUnitarioClp : cargo.precioUnitarioClp;
        const nuevoMonto = nuevaCantidad * nuevoPrecio;

        if (nuevoMonto < pagado) {
          throw new Error(`El monto no puede quedar bajo lo ya pagado ($${pagado}).`);
        }

        const res = await tx.cargo.update({
          where: { id },
          data: {
            cantidad: nuevaCantidad,
            precioUnitarioClp: nuevoPrecio,
            montoClp: nuevoMonto,
            motivoAjuste: datos.motivo.trim(),
            avisoPendiente: avisoPendiente || cargo.avisoPendiente,
            version: cargo.version + 1,
          },
        });

        await tx.registroAuditoria.create({
          data: {
            organizacionId: ctx.organizacionId,
            usuarioId: ctx.usuario.id,
            entidad: "Cargo",
            entidadId: id,
            accion: "ajustar_monto",
            antes: { montoClp: cargo.montoClp, cantidad: cargo.cantidad, precioUnitarioClp: cargo.precioUnitarioClp },
            despues: { montoClp: nuevoMonto, cantidad: nuevaCantidad, precioUnitarioClp: nuevoPrecio, motivo: datos.motivo.trim() },
          },
        });

        return res;
      }
    });

    revalidarRutasSeguras();
    return { exito: true, item: itemActualizado };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo realizar el ajuste." };
  }
}

export async function ajustarItem(
  tipo: "inscripcion" | "cargo",
  id: string,
  datosOMonto:
    | number
    | {
        montoClp?: number;
        cantidad?: number;
        precioUnitarioClp?: number;
        motivo: string;
      },
  motivoOVersion?: string | number,
  versionOpcional?: number
) {
  const ctx = await obtenerContexto();
  return ejecutarAjustarItem(ctx, tipo, id, datosOMonto, motivoOVersion, versionOpcional);
}

export async function ejecutarMarcarVisto(ctx: Contexto, tipo: "inscripcion" | "cargo", id: string) {
  try {
    exigir(ctx, "inscripciones.administrar");

    await (tipo === "inscripcion"
      ? db(ctx).inscripcion.update({
          where: { id, organizacionId: ctx.organizacionId },
          data: {
            avisoPendiente: false,
            avisoVistoPorId: ctx.usuario.id,
            avisoVistoEn: new Date(),
          },
        })
      : db(ctx).cargo.update({
          where: { id, organizacionId: ctx.organizacionId },
          data: {
            avisoPendiente: false,
            avisoVistoPorId: ctx.usuario.id,
            avisoVistoEn: new Date(),
          },
        }));

    await db(ctx).registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: tipo === "inscripcion" ? "Inscripcion" : "Cargo",
        entidadId: id,
        accion: "marcar_visto",
      },
    });

    revalidarRutasSeguras();
    return { exito: true as const };
  } catch (error: any) {
    return { exito: false as const, error: error?.message || "No se pudo marcar como visto." };
  }
}

export async function marcarVisto(tipo: "inscripcion" | "cargo", id: string) {
  const ctx = await obtenerContexto();
  return ejecutarMarcarVisto(ctx, tipo, id);
}

export async function ejecutarRevertirAjuste(
  ctx: Contexto,
  tipo: "inscripcion" | "cargo",
  id: string,
  versionOMotivo: number | string,
  motivoOpcional?: string
) {
  exigir(ctx, "inscripciones.administrar");
  await exigirDeLaOrganizacion(ctx, tipo, id);

  let version: number | undefined;
  let motivo: string;

  if (typeof versionOMotivo === "number") {
    version = versionOMotivo;
    motivo = motivoOpcional || "";
  } else {
    motivo = versionOMotivo || "";
  }

  if (!motivo || motivo.trim().length === 0) {
    return { exito: false, error: "El motivo de la reversión es obligatorio." };
  }

  try {
    await db(ctx).$transaction(async (tx) => {
      if (tipo === "inscripcion") {
        const ins = await tx.inscripcion.findUnique({
          where: { id, organizacionId: ctx.organizacionId },
          include: { prueba: true, pagos: { where: { anulado: false } } },
        });
        if (!ins) throw new Error("Inscripción no encontrada.");
        if (version !== undefined && ins.version !== version) {
          throw new Error("La inscripción fue modificada por otro usuario.");
        }
        const pagado = ins.pagos.reduce((a: number, p: any) => a + p.montoClp, 0);
        if (ins.tarifaClp < pagado) {
          throw new Error("No se puede revertir a la tarifa original porque el monto pagado la supera.");
        }

        await tx.inscripcion.update({
          where: { id },
          data: {
            montoClp: ins.tarifaClp,
            motivoAjuste: null,
            avisoPendiente: false,
            avisoVistoPorId: ctx.usuario.id,
            avisoVistoEn: new Date(),
            version: ins.version + 1,
          },
        });
      } else {
        const cargo = await tx.cargo.findUnique({
          where: { id, organizacionId: ctx.organizacionId },
          include: { concepto: true, pagos: { where: { anulado: false } } },
        });
        if (!cargo) throw new Error("Cargo no encontrado.");
        if (version !== undefined && cargo.version !== version) {
          throw new Error("El cargo fue modificado por otro usuario.");
        }
        const nuevoMonto = cargo.cantidad * cargo.tarifaClp;
        const pagado = cargo.pagos.reduce((a: number, p: any) => a + p.montoClp, 0);
        if (nuevoMonto < pagado) {
          throw new Error("No se puede revertir porque el monto pagado supera la tarifa original.");
        }

        await tx.cargo.update({
          where: { id },
          data: {
            precioUnitarioClp: cargo.tarifaClp,
            montoClp: nuevoMonto,
            motivoAjuste: null,
            avisoPendiente: false,
            avisoVistoPorId: ctx.usuario.id,
            avisoVistoEn: new Date(),
            version: cargo.version + 1,
          },
        });
      }

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: tipo === "inscripcion" ? "Inscripcion" : "Cargo",
          entidadId: id,
          accion: "revertir_ajuste",
          despues: { motivo: motivo.trim() },
        },
      });
    });

    revalidarRutasSeguras();
    return { exito: true };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo revertir el ajuste." };
  }
}

export async function revertirAjuste(
  tipo: "inscripcion" | "cargo",
  id: string,
  versionOMotivo: number | string,
  motivoOpcional?: string
) {
  const ctx = await obtenerContexto();
  return ejecutarRevertirAjuste(ctx, tipo, id, versionOMotivo, motivoOpcional);
}

// -------------------------------------------------------------
// Paso 6.4: Cambios Pre-Concurso (Prueba, Caballo, Jinete, Club)
// -------------------------------------------------------------

export async function ejecutarCambiarPrueba(
  ctx: Contexto,
  inscripcionId: string,
  nuevaPruebaId: string,
  ajustarTarifa: boolean = false,
  version?: number
) {
  exigir(ctx, "inscripciones.inscribir");
  await exigirDeLaOrganizacion(ctx, "inscripcion", inscripcionId);
  await exigirDeLaOrganizacion(ctx, "prueba", nuevaPruebaId);

  const nuevaPrueba = await db(ctx).prueba.findUnique({ where: { id: nuevaPruebaId } });
  if (!nuevaPrueba || !nuevaPrueba.activa) {
    return { exito: false, error: "La prueba de destino no está activa." };
  }

  try {
    const actualizada = await db(ctx).$transaction(async (tx) => {
      const ins = await tx.inscripcion.findUnique({ where: { id: inscripcionId } });
      if (!ins || ins.anulado) throw new Error("Inscripción no encontrada o anulada.");
      if (version !== undefined && ins.version !== version) {
        throw new Error("La inscripción fue modificada por otro usuario.");
      }

      // Validar si el binomio ya está en esa prueba
      const yaEnPrueba = await tx.inscripcion.findFirst({
        where: {
          binomioId: ins.binomioId,
          pruebaId: nuevaPruebaId,
          anulado: false,
          id: { not: inscripcionId },
        },
      });

      if (yaEnPrueba) {
        throw new Error("El binomio ya se encuentra inscrito en la prueba de destino.");
      }

      let montoClp = ins.montoClp;
      let tarifaClp = ins.tarifaClp;
      let motivo = ins.motivoAjuste;

      if (ajustarTarifa) {
        tarifaClp = nuevaPrueba.tarifaClp;
        montoClp = nuevaPrueba.tarifaClp;
        motivo = "Ajuste por cambio de prueba";
      }

      const avisoPendiente = !puede(ctx, "inscripciones.administrar");

      const res = await tx.inscripcion.update({
        where: { id: inscripcionId },
        data: {
          pruebaId: nuevaPruebaId,
          tarifaClp,
          montoClp,
          motivoAjuste: motivo,
          avisoPendiente: avisoPendiente || ins.avisoPendiente,
          version: ins.version + 1,
        },
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Inscripcion",
          entidadId: inscripcionId,
          accion: "cambiar_prueba",
          antes: { pruebaId: ins.pruebaId, montoClp: ins.montoClp },
          despues: { pruebaId: nuevaPruebaId, montoClp },
        },
      });

      return res;
    });

    revalidarRutasSeguras();
    return { exito: true, inscripcion: actualizada };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo cambiar de prueba." };
  }
}

export async function cambiarPrueba(
  inscripcionId: string,
  nuevaPruebaId: string,
  ajustarTarifa: boolean = false,
  version?: number
) {
  const ctx = await obtenerContexto();
  return ejecutarCambiarPrueba(ctx, inscripcionId, nuevaPruebaId, ajustarTarifa, version);
}

export async function ejecutarCambiarParBinomio(
  ctx: Contexto,
  binomioId: string,
  par: { jineteId?: string; caballoId?: string },
  version?: number
) {
  exigir(ctx, "inscripciones.inscribir");
  await exigirDeLaOrganizacion(ctx, "binomio", binomioId);

  try {
    const actualizado = await db(ctx).$transaction(async (tx) => {
      const b = await tx.binomio.findUnique({ where: { id: binomioId } });
      if (!b || b.anulado) throw new Error("Binomio no encontrado o anulado.");
      if (version !== undefined && b.version !== version) {
        throw new Error("El binomio fue modificado por otro usuario.");
      }

      const nuevoJineteId = par.jineteId || b.jineteId;
      const nuevoCaballoId = par.caballoId || b.caballoId;

      if (par.jineteId) await exigirDeLaOrganizacion(ctx, "jinete", par.jineteId);
      if (par.caballoId) await exigirDeLaOrganizacion(ctx, "caballo", par.caballoId);

      // Verificar que el par no exista ya en el evento
      const parExistente = await tx.binomio.findFirst({
        where: {
          eventoId: b.eventoId,
          jineteId: nuevoJineteId,
          caballoId: nuevoCaballoId,
          anulado: false,
          id: { not: binomioId },
        },
      });

      if (parExistente) {
        throw new Error("Ya existe un binomio con ese jinete y caballo en el evento. Mueve las pruebas individualmente.");
      }

      const res = await tx.binomio.update({
        where: { id: binomioId },
        data: {
          jineteId: nuevoJineteId,
          caballoId: nuevoCaballoId,
          version: b.version + 1,
        },
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Binomio",
          entidadId: binomioId,
          accion: "cambiar_par",
          antes: { jineteId: b.jineteId, caballoId: b.caballoId },
          despues: { jineteId: nuevoJineteId, caballoId: nuevoCaballoId },
        },
      });

      return res;
    });

    revalidarRutasSeguras();
    return { exito: true, binomio: actualizado };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo cambiar el jinete/caballo del binomio." };
  }
}

export async function cambiarParBinomio(
  binomioId: string,
  par: { jineteId?: string; caballoId?: string },
  version?: number
) {
  const ctx = await obtenerContexto();
  return ejecutarCambiarParBinomio(ctx, binomioId, par, version);
}

export async function ejecutarCambiarClubBinomio(
  ctx: Contexto,
  binomioId: string,
  clubId: string,
  version?: number
) {
  exigir(ctx, "inscripciones.inscribir");
  await exigirDeLaOrganizacion(ctx, "binomio", binomioId);
  await exigirDeLaOrganizacion(ctx, "club", clubId);

  try {
    const actualizado = await db(ctx).$transaction(async (tx) => {
      const b = await tx.binomio.findUnique({ where: { id: binomioId } });
      if (!b || b.anulado) throw new Error("Binomio no encontrado.");
      if (version !== undefined && b.version !== version) {
        throw new Error("El binomio fue modificado por otro usuario.");
      }

      const res = await tx.binomio.update({
        where: { id: binomioId },
        data: {
          clubId,
          version: b.version + 1,
        },
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Binomio",
          entidadId: binomioId,
          accion: "cambiar_club_binomio",
          antes: { clubId: b.clubId },
          despues: { clubId },
        },
      });

      return res;
    });

    revalidarRutasSeguras();
    return { exito: true, binomio: actualizado };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo cambiar el club del binomio." };
  }
}

export async function cambiarClubBinomio(
  binomioId: string,
  clubId: string,
  version?: number
) {
  const ctx = await obtenerContexto();
  return ejecutarCambiarClubBinomio(ctx, binomioId, clubId, version);
}

export async function ejecutarMoverInscripcion(
  ctx: Contexto,
  inscripcionId: string,
  binomioDestinoId: string,
  version?: number
) {
  exigir(ctx, "inscripciones.inscribir");
  await exigirDeLaOrganizacion(ctx, "inscripcion", inscripcionId);
  await exigirDeLaOrganizacion(ctx, "binomio", binomioDestinoId);

  try {
    const movida = await db(ctx).$transaction(async (tx) => {
      const ins = await tx.inscripcion.findUnique({ where: { id: inscripcionId } });
      if (!ins || ins.anulado) throw new Error("Inscripción no encontrada.");
      if (version !== undefined && ins.version !== version) {
        throw new Error("La inscripción fue modificada por otro usuario.");
      }

      const destino = await tx.binomio.findUnique({ where: { id: binomioDestinoId } });
      if (!destino || destino.anulado) throw new Error("El binomio de destino no existe o está anulado.");

      // Verificar que el destino no tenga ya esa prueba
      const yaExiste = await tx.inscripcion.findFirst({
        where: {
          binomioId: binomioDestinoId,
          pruebaId: ins.pruebaId,
          anulado: false,
        },
      });

      if (yaExiste) {
        throw new Error("El binomio de destino ya tiene inscrita esa prueba.");
      }

      const res = await tx.inscripcion.update({
        where: { id: inscripcionId },
        data: {
          binomioId: binomioDestinoId,
          version: ins.version + 1,
        },
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Inscripcion",
          entidadId: inscripcionId,
          accion: "mover_inscripcion",
          antes: { binomioId: ins.binomioId },
          despues: { binomioId: binomioDestinoId },
        },
      });

      return res;
    });

    revalidarRutasSeguras();
    return { exito: true, inscripcion: movida };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo mover la inscripción." };
  }
}

export async function moverInscripcion(
  inscripcionId: string,
  binomioDestinoId: string,
  version?: number
) {
  const ctx = await obtenerContexto();
  return ejecutarMoverInscripcion(ctx, inscripcionId, binomioDestinoId, version);
}

// -------------------------------------------------------------
// Paso 6.4: Anulación de Ítems y Binomio
// -------------------------------------------------------------

export async function ejecutarAnularItem(
  ctx: Contexto,
  tipo: "inscripcion" | "cargo",
  id: string,
  motivo: string,
  version?: number
) {
  if (!motivo || motivo.trim().length === 0) {
    return { exito: false, error: "El motivo de anulación es obligatorio." };
  }

  try {
    await db(ctx).$transaction(async (tx) => {
      if (tipo === "inscripcion") {
        await exigirDeLaOrganizacion(ctx, "inscripcion", id);
        const ins = await tx.inscripcion.findUnique({
          where: { id },
          include: { pagos: { where: { anulado: false } } },
        });
        if (!ins || ins.anulado) throw new Error("La inscripción no existe o ya está anulada.");
        if (version !== undefined && ins.version !== version) {
          throw new Error("La inscripción fue modificada por otro usuario.");
        }

        // Permisos: admin cualquiera sin pagos; ayudante solo propia sin pagos
        if (ctx.rol === "administrador") {
          exigir(ctx, "inscripciones.administrar");
        } else {
          exigir(ctx, "inscripciones.inscribir");
          if (ins.registradoPorId !== ctx.usuario.id) {
            throw new Error("Solo puedes anular inscripciones que tú mismo registraste.");
          }
        }

        const pagosVigentes = ins.pagos.filter((p: any) => !p.anulado);
        if (pagosVigentes.length > 0) {
          throw new Error("No se puede anular un ítem con pagos vigentes. Debes gestionarlo mediante Retiro.");
        }

        await tx.inscripcion.update({
          where: { id },
          data: {
            anulado: true,
            motivoAnulacion: motivo.trim(),
            anuladoPorId: ctx.usuario.id,
            anuladoEn: new Date(),
            version: ins.version + 1,
          },
        });

        // Regla 3.4: Si se anulan todas las pruebas del binomio y la cuota no tiene pagos,
        // la cuota se anula sola en la misma transacción.
        const otrasPruebasVigentes = await tx.inscripcion.count({
          where: {
            binomioId: ins.binomioId,
            anulado: false,
            id: { not: id },
          },
        });

        if (otrasPruebasVigentes === 0) {
          const cuotasSinPagos = await tx.cargo.findMany({
            where: {
              binomioId: ins.binomioId,
              automatico: true,
              anulado: false,
            },
            include: { pagos: { where: { anulado: false } } },
          });

          for (const c of cuotasSinPagos) {
            if (c.pagos.length === 0) {
              await tx.cargo.update({
                where: { id: c.id },
                data: {
                  anulado: true,
                  motivoAnulacion: "Anulación automática por quedar sin pruebas vigentes",
                  anuladoPorId: ctx.usuario.id,
                  anuladoEn: new Date(),
                  version: c.version + 1,
                },
              });
            }
          }
        }

        await tx.registroAuditoria.create({
          data: {
            organizacionId: ctx.organizacionId,
            usuarioId: ctx.usuario.id,
            entidad: "Inscripcion",
            entidadId: id,
            accion: "anular",
            despues: { motivo: motivo.trim() },
          },
        });
      } else {
        await exigirDeLaOrganizacion(ctx, "cargo", id);
        const cargo = await tx.cargo.findUnique({
          where: { id },
          include: { pagos: { where: { anulado: false } } },
        });
        if (!cargo || cargo.anulado) throw new Error("El cargo no existe o ya está anulado.");
        if (version !== undefined && cargo.version !== version) {
          throw new Error("El cargo fue modificado por otro usuario.");
        }

        if (ctx.rol === "administrador") {
          exigir(ctx, "inscripciones.administrar");
        } else {
          exigir(ctx, "inscripciones.inscribir");
          if (cargo.registradoPorId !== ctx.usuario.id) {
            throw new Error("Solo puedes anular cargos que tú mismo registraste.");
          }
        }

        const pagosVigentes = cargo.pagos.filter((p: any) => !p.anulado);
        if (pagosVigentes.length > 0) {
          throw new Error("No se puede anular un cargo con pagos vigentes.");
        }

        await tx.cargo.update({
          where: { id },
          data: {
            anulado: true,
            motivoAnulacion: motivo.trim(),
            anuladoPorId: ctx.usuario.id,
            anuladoEn: new Date(),
            version: cargo.version + 1,
          },
        });

        await tx.registroAuditoria.create({
          data: {
            organizacionId: ctx.organizacionId,
            usuarioId: ctx.usuario.id,
            entidad: "Cargo",
            entidadId: id,
            accion: "anular",
            despues: { motivo: motivo.trim() },
          },
        });
      }
    });

    revalidarRutasSeguras();
    return { exito: true };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo anular el ítem." };
  }
}

export async function anularItem(
  tipo: "inscripcion" | "cargo",
  id: string,
  motivo: string,
  version?: number
) {
  const ctx = await obtenerContexto();
  return ejecutarAnularItem(ctx, tipo, id, motivo, version);
}

export async function ejecutarAnularBinomio(
  ctx: Contexto,
  binomioId: string,
  motivo: string,
  version?: number
) {
  exigir(ctx, "inscripciones.administrar");
  await exigirDeLaOrganizacion(ctx, "binomio", binomioId);

  if (!motivo || motivo.trim().length === 0) {
    return { exito: false, error: "El motivo de anulación es obligatorio." };
  }

  try {
    await db(ctx).$transaction(async (tx) => {
      const b = await tx.binomio.findUnique({
        where: { id: binomioId },
        include: {
          inscripciones: { where: { anulado: false } },
          cargos: { where: { anulado: false } },
        },
      });

      if (!b || b.anulado) throw new Error("El binomio no existe o ya está anulado.");
      if (version !== undefined && b.version !== version) {
        throw new Error("El binomio fue modificado por otro usuario.");
      }

      if (b.inscripciones.length > 0 || b.cargos.length > 0) {
        throw new Error(
          "Para anular un binomio, primero debes anular o retirar todas sus pruebas y cargos."
        );
      }

      await tx.binomio.update({
        where: { id: binomioId },
        data: {
          anulado: true,
          motivoAnulacion: motivo.trim(),
          anuladoPorId: ctx.usuario.id,
          anuladoEn: new Date(),
          version: b.version + 1,
        },
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Binomio",
          entidadId: binomioId,
          accion: "anular_binomio",
          despues: { motivo: motivo.trim() },
        },
      });
    });

    revalidarRutasSeguras();
    return { exito: true };
  } catch (error: any) {
    return { exito: false, error: error?.message || "No se pudo anular el binomio." };
  }
}

export async function anularBinomio(
  binomioId: string,
  motivo: string,
  version?: number
) {
  const ctx = await obtenerContexto();
  return ejecutarAnularBinomio(ctx, binomioId, motivo, version);
}

// -------------------------------------------------------------
// Paso 6.4: Gancho de Fusión de Participantes (ConflictoBinomios)
// (docs/inscripciones/inscripcion-binomios.md §3.13)
// -------------------------------------------------------------

export async function reasignarPorFusion(
  tx: any,
  ctx: Contexto,
  entidad: "jinete" | "caballo" | "club",
  conservadoId: string,
  duplicadoId: string
) {
  if (entidad === "jinete") {
    // Buscar binomios activos del duplicado
    const binomiosDuplicado = await tx.binomio.findMany({
      where: {
        organizacionId: ctx.organizacionId,
        jineteId: duplicadoId,
        anulado: false,
      },
      include: { caballo: true },
    });

    const conflictos: DetalleConflictoBinomio[] = [];

    for (const b of binomiosDuplicado) {
      const parExistente = await tx.binomio.findFirst({
        where: {
          organizacionId: ctx.organizacionId,
          eventoId: b.eventoId,
          jineteId: conservadoId,
          caballoId: b.caballoId,
          anulado: false,
        },
      });

      if (parExistente) {
        conflictos.push({
          binomioConservadoId: parExistente.id,
          binomioDuplicadoId: b.id,
          detalle: `El jinete conservado ya tiene un binomio activo con el caballo '${b.caballo.nombre}'.`,
        });
      }
    }

    if (conflictos.length > 0) {
      throw new ConflictoBinomios(conflictos);
    }

    const bRes = await tx.binomio.updateMany({
      where: { jineteId: duplicadoId },
      data: { jineteId: conservadoId, version: { increment: 1 } },
    });

    const cRes = await tx.cargo.updateMany({
      where: { jineteId: duplicadoId },
      data: { jineteId: conservadoId, version: { increment: 1 } },
    });

    return { binomios: bRes.count, cargos: cRes.count };
  } else if (entidad === "caballo") {
    const binomiosDuplicado = await tx.binomio.findMany({
      where: {
        organizacionId: ctx.organizacionId,
        caballoId: duplicadoId,
        anulado: false,
      },
      include: { jinete: true },
    });

    const conflictos: DetalleConflictoBinomio[] = [];

    for (const b of binomiosDuplicado) {
      const parExistente = await tx.binomio.findFirst({
        where: {
          organizacionId: ctx.organizacionId,
          eventoId: b.eventoId,
          jineteId: b.jineteId,
          caballoId: conservadoId,
          anulado: false,
        },
      });

      if (parExistente) {
        conflictos.push({
          binomioConservadoId: parExistente.id,
          binomioDuplicadoId: b.id,
          detalle: `El caballo conservado ya tiene un binomio activo con el jinete '${b.jinete.nombre}'.`,
        });
      }
    }

    if (conflictos.length > 0) {
      throw new ConflictoBinomios(conflictos);
    }

    const bRes = await tx.binomio.updateMany({
      where: { caballoId: duplicadoId },
      data: { caballoId: conservadoId, version: { increment: 1 } },
    });

    return { binomios: bRes.count, cargos: 0 };
  } else if (entidad === "club") {
    const bRes = await tx.binomio.updateMany({
      where: { clubId: duplicadoId },
      data: { clubId: conservadoId, version: { increment: 1 } },
    });

    const cRes = await tx.cargo.updateMany({
      where: { clubId: duplicadoId },
      data: { clubId: conservadoId, version: { increment: 1 } },
    });

    return { binomios: bRes.count, cargos: cRes.count };
  }

  return { binomios: 0, cargos: 0 };
}

export async function copiarEstadoCuentaAction(sujeto: {
  binomioId?: string;
  jineteId?: string;
  clubId?: string;
}) {
  const ctx = await obtenerContexto();
  return textoEstadoCuenta(ctx, sujeto);
}

