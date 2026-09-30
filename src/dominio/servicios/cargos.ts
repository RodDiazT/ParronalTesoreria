"use server";

import { Prisma, MedioPago } from "@prisma/client";
import { db, exigirDeLaOrganizacion, obtenerContexto } from "@/lib/contexto";
import { Contexto, exigir, puede } from "@/lib/permisos";
import { revalidatePath } from "next/cache";
import { registrarMovimientoSistema } from "@/dominio/movimientos/acciones";
import { esPagoVigente } from "@/dominio/inscripciones/binomios/reglas";

function revalidarRutasServicios() {
  try {
    revalidatePath("/servicios");
    revalidatePath("/participantes");
    revalidatePath("/inscripciones");
    revalidatePath("/movimientos");
  } catch {
    // Entorno sin Next.js router
  }
}

export interface CrearCargoInput {
  categoriaId: string;
  caballoId?: string | null;
  jineteId?: string | null;
  clubId?: string | null;
  binomioId?: string | null;
  cantidad?: number;
  tarifaClp?: number;
  descripcion?: string | null;
  motivoAjuste?: string | null;
  claveCliente?: string;
  pagoInmediato?: {
    medioPago: "transferencia" | "efectivo" | "otro";
    fecha?: string;
    nombreOrigen?: string | null;
    observacion?: string | null;
  } | null;
}

export interface EditarCargoInput {
  id: string;
  version: number;
  cantidad?: number;
  tarifaClp?: number;
  descripcion?: string | null;
  motivoAjuste?: string | null;
}

export type EstadoCargo = "pendiente" | "parcial" | "pagado" | "anulado";

export interface CargoDTO {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  sujetoTipo: "caballo" | "jinete" | "club" | "binomio";
  sujetoId: string;
  sujetoNombre: string;
  sujetoDetalle?: string | null;
  cantidad: number;
  tarifaClp: number;
  montoClp: number;
  pagadoClp: number;
  saldoClp: number;
  estado: EstadoCargo;
  descripcion?: string | null;
  motivoAjuste?: string | null;
  anulado: boolean;
  version: number;
  creadoEn: string;
}

/**
 * Registra un cargo o servicio operativo (ej. Pensión, Pesebrera)
 * asociado a un caballo, jinete, club o binomio.
 */
export async function crearCargo(datos: CrearCargoInput) {
  const ctx = await obtenerContexto();
  return ejecutarCrearCargo(ctx, datos);
}

export async function ejecutarCrearCargo(ctx: Contexto, datos: CrearCargoInput) {
  exigir(ctx, "inscripciones.inscribir");

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return { exito: false, error: "El evento debe estar abierto para registrar servicios." };
  }

  await exigirDeLaOrganizacion(ctx, "categoria", datos.categoriaId);
  const categoria = await db(ctx).categoria.findUnique({
    where: { id: datos.categoriaId },
  });

  if (!categoria || !categoria.activa || categoria.tipo !== "ingreso") {
    return { exito: false, error: "La categoría no es válida para registrar servicios." };
  }

  // Validar y resolver el sujeto
  let sujetoTipo: "caballo" | "jinete" | "club" | "binomio" = "caballo";
  if (categoria.sujetoAsociado === "jinete") sujetoTipo = "jinete";
  else if (categoria.sujetoAsociado === "club") sujetoTipo = "club";
  else if (categoria.sujetoAsociado === "binomio") sujetoTipo = "binomio";

  if (sujetoTipo === "caballo") {
    if (!datos.caballoId) return { exito: false, error: "Debes seleccionar un caballo para este servicio." };
    await exigirDeLaOrganizacion(ctx, "caballo", datos.caballoId);
  } else if (sujetoTipo === "jinete") {
    if (!datos.jineteId) return { exito: false, error: "Debes seleccionar un jinete para este servicio." };
    await exigirDeLaOrganizacion(ctx, "jinete", datos.jineteId);
  } else if (sujetoTipo === "club") {
    if (!datos.clubId) return { exito: false, error: "Debes seleccionar un club para este servicio." };
    await exigirDeLaOrganizacion(ctx, "club", datos.clubId);
  } else if (sujetoTipo === "binomio") {
    if (!datos.binomioId) return { exito: false, error: "Debes seleccionar un binomio para este servicio." };
    await exigirDeLaOrganizacion(ctx, "binomio", datos.binomioId);
  }

  const cantidad = Math.max(1, Math.floor(datos.cantidad ?? 1));
  const tarifaClp = datos.tarifaClp !== undefined ? Math.max(0, Math.floor(datos.tarifaClp)) : (categoria.tarifaBaseClp || 0);
  const montoClp = cantidad * tarifaClp;

  const claveCliente = datos.claveCliente || `cargo-${ctx.evento.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    const resultado = await db(ctx).$transaction(async (tx) => {
      // Idempotencia
      const existente = await tx.cargo.findUnique({
        where: {
          organizacionId_claveCliente: {
            organizacionId: ctx.organizacionId,
            claveCliente,
          },
        },
      });

      if (existente) {
        return { cargo: existente, reintento: true };
      }

      const nuevoCargo = await tx.cargo.create({
        data: {
          organizacionId: ctx.organizacionId,
          eventoId: ctx.evento!.id,
          categoriaId: categoria.id,
          caballoId: datos.caballoId || null,
          jineteId: datos.jineteId || null,
          clubId: datos.clubId || null,
          binomioId: datos.binomioId || null,
          descripcion: datos.descripcion?.trim() || null,
          cantidad,
          tarifaClp,
          montoClp,
          motivoAjuste: datos.motivoAjuste?.trim() || null,
          claveCliente,
          registradoPorId: ctx.usuario.id,
        },
      });

      // Si se indicó pago inmediato
      if (datos.pagoInmediato && montoClp > 0) {
        const fechaObj = datos.pagoInmediato.fecha ? new Date(datos.pagoInmediato.fecha) : new Date();
        const mov = await tx.movimiento.create({
          data: {
            organizacionId: ctx.organizacionId,
            eventoId: ctx.evento!.id,
            categoriaId: categoria.id,
            tipo: "ingreso",
            montoClp,
            montoOriginalClp: montoClp,
            fecha: fechaObj,
            fechaPago: fechaObj,
            medioPago: datos.pagoInmediato.medioPago || "transferencia",
            estadoPago: "pagado",
            nombreOrigen: datos.pagoInmediato.nombreOrigen || null,
            observacion: datos.pagoInmediato.observacion || `Pago inmediato de ${categoria.nombre}`,
            sinRespaldo: true,
            claveCliente: `pago-${claveCliente}`,
            registradoPorId: ctx.usuario.id,
            estadoValidacion: ctx.rol === "administrador" ? "validado" : "por_validar",
            caballoId: datos.caballoId || null,
            jineteId: datos.jineteId || null,
            clubId: datos.clubId || null,
            binomioId: datos.binomioId || null,
          },
        });

        await tx.pago.create({
          data: {
            organizacionId: ctx.organizacionId,
            movimientoId: mov.id,
            cargoId: nuevoCargo.id,
            montoClp,
            creadoPorId: ctx.usuario.id,
          },
        });
      }

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Cargo",
          entidadId: nuevoCargo.id,
          accion: "crear",
          despues: nuevoCargo as unknown as Prisma.InputJsonValue,
        },
      });

      return { cargo: nuevoCargo, reintento: false };
    });

    revalidarRutasServicios();
    return { exito: true, cargo: resultado.cargo, reintento: resultado.reintento };
  } catch (e: any) {
    return { exito: false, error: e?.message || "No fue posible registrar el servicio." };
  }
}

/**
 * Modifica un cargo existente (tarifa, cantidad, descripción).
 */
export async function editarCargo(datos: EditarCargoInput) {
  const ctx = await obtenerContexto();
  return ejecutarEditarCargo(ctx, datos);
}

export async function ejecutarEditarCargo(ctx: Contexto, datos: EditarCargoInput) {
  exigir(ctx, "inscripciones.inscribir");

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return { exito: false, error: "El evento debe estar abierto para modificar servicios." };
  }

  await exigirDeLaOrganizacion(ctx, "cargo", datos.id);
  const cargoActual = await db(ctx).cargo.findUnique({
    where: { id: datos.id },
    include: {
      pagos: { where: { anulado: false } },
    },
  });

  if (!cargoActual || cargoActual.anulado) {
    return { exito: false, error: "El servicio no existe o está anulado." };
  }

  if (cargoActual.version !== datos.version) {
    return { exito: false, error: "El servicio fue modificado concurrentemente por otro usuario." };
  }

  const pagado = cargoActual.pagos.reduce((acc, p) => acc + p.montoClp, 0);
  const nuevaCantidad = datos.cantidad !== undefined ? Math.max(1, Math.floor(datos.cantidad)) : cargoActual.cantidad;
  const nuevaTarifa = datos.tarifaClp !== undefined ? Math.max(0, Math.floor(datos.tarifaClp)) : cargoActual.tarifaClp;
  const nuevoMonto = nuevaCantidad * nuevaTarifa;

  if (nuevoMonto < pagado) {
    return {
      exito: false,
      error: `El nuevo monto ($${nuevoMonto.toLocaleString("es-CL")}) no puede ser menor a lo ya pagado ($${pagado.toLocaleString("es-CL")}).`,
    };
  }

  try {
    const cargoActualizado = await db(ctx).$transaction(async (tx) => {
      const actualizado = await tx.cargo.update({
        where: { id: datos.id },
        data: {
          cantidad: nuevaCantidad,
          tarifaClp: nuevaTarifa,
          montoClp: nuevoMonto,
          descripcion: datos.descripcion !== undefined ? datos.descripcion?.trim() || null : cargoActual.descripcion,
          motivoAjuste: datos.motivoAjuste !== undefined ? datos.motivoAjuste?.trim() || null : cargoActual.motivoAjuste,
          version: { increment: 1 },
        },
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Cargo",
          entidadId: datos.id,
          accion: "editar",
          antes: cargoActual as unknown as Prisma.InputJsonValue,
          despues: actualizado as unknown as Prisma.InputJsonValue,
        },
      });

      return actualizado;
    });

    revalidarRutasServicios();
    return { exito: true, cargo: cargoActualizado };
  } catch (e: any) {
    return { exito: false, error: e?.message || "No fue posible actualizar el servicio." };
  }
}

/**
 * Anula un cargo. Solo permitido si no tiene pagos activos (deben desasignarse primero).
 */
export async function anularCargo(id: string, motivo: string, version: number) {
  const ctx = await obtenerContexto();
  return ejecutarAnularCargo(ctx, id, motivo, version);
}

export async function ejecutarAnularCargo(ctx: Contexto, id: string, motivo: string, version: number) {
  exigir(ctx, "inscripciones.inscribir");

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return { exito: false, error: "El evento debe estar abierto para anular servicios." };
  }

  if (!motivo.trim()) {
    return { exito: false, error: "Debes indicar un motivo de anulación." };
  }

  await exigirDeLaOrganizacion(ctx, "cargo", id);
  const cargoActual = await db(ctx).cargo.findUnique({
    where: { id },
    include: {
      pagos: { where: { anulado: false } },
    },
  });

  if (!cargoActual || cargoActual.anulado) {
    return { exito: false, error: "El servicio no existe o ya fue anulado." };
  }

  if (cargoActual.version !== version) {
    return { exito: false, error: "El servicio fue modificado por otro usuario." };
  }

  const pagado = cargoActual.pagos.reduce((acc, p) => acc + p.montoClp, 0);
  if (pagado > 0) {
    return {
      exito: false,
      error: "No se puede anular un servicio que tiene pagos asociados. Debes desasignar los pagos previamente.",
    };
  }

  try {
    const cargoAnulado = await db(ctx).$transaction(async (tx) => {
      const anulado = await tx.cargo.update({
        where: { id },
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
          entidad: "Cargo",
          entidadId: id,
          accion: "anular",
          antes: cargoActual as unknown as Prisma.InputJsonValue,
          despues: anulado as unknown as Prisma.InputJsonValue,
        },
      });

      return anulado;
    });

    revalidarRutasServicios();
    return { exito: true, cargo: cargoAnulado };
  } catch (e: any) {
    return { exito: false, error: e?.message || "No fue posible anular el servicio." };
  }
}

/**
 * Consulta la nómina de cargos del evento actual filtrada por una categoría específica.
 */
export async function listarCargosPorCategoria(ctx: Contexto, categoriaId: string) {
  if (!ctx.evento) {
    return { cargos: [], totales: { totalCargos: 0, totalRecaudado: 0, totalPorCobrar: 0, cantidadTotal: 0 } };
  }

  const cargosRaw = await db(ctx).cargo.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      eventoId: ctx.evento.id,
      categoriaId,
      anulado: false,
    },
    include: {
      categoria: true,
      caballo: { include: { club: true } },
      jinete: { include: { club: true } },
      club: true,
      binomio: { include: { jinete: true, caballo: true, club: true } },
      pagos: {
        where: { anulado: false },
        include: { movimiento: true },
      },
    },
    orderBy: { creadoEn: "asc" },
  });

  const cargos: CargoDTO[] = cargosRaw.map((c) => {
    const pagadoClp = c.pagos.reduce((acc, p) => acc + p.montoClp, 0);
    const saldoClp = Math.max(0, c.montoClp - pagadoClp);

    let estado: EstadoCargo = "pendiente";
    if (c.anulado) estado = "anulado";
    else if (saldoClp === 0 && c.montoClp > 0) estado = "pagado";
    else if (pagadoClp > 0) estado = "parcial";

    let sujetoTipo: "caballo" | "jinete" | "club" | "binomio" = "caballo";
    let sujetoId = "";
    let sujetoNombre = "Desconocido";
    let sujetoDetalle: string | null = null;

    if (c.caballo) {
      sujetoTipo = "caballo";
      sujetoId = c.caballo.id;
      sujetoNombre = c.caballo.nombre;
      sujetoDetalle = c.caballo.club?.nombre || null;
    } else if (c.jinete) {
      sujetoTipo = "jinete";
      sujetoId = c.jinete.id;
      sujetoNombre = c.jinete.nombre;
      sujetoDetalle = c.jinete.club?.nombre || null;
    } else if (c.club) {
      sujetoTipo = "club";
      sujetoId = c.club.id;
      sujetoNombre = c.club.nombre;
    } else if (c.binomio) {
      sujetoTipo = "binomio";
      sujetoId = c.binomio.id;
      sujetoNombre = `${c.binomio.jinete.nombre} · ${c.binomio.caballo.nombre}`;
      sujetoDetalle = c.binomio.club.nombre;
    }

    return {
      id: c.id,
      categoriaId: c.categoriaId,
      categoriaNombre: c.categoria.nombre,
      sujetoTipo,
      sujetoId,
      sujetoNombre,
      sujetoDetalle,
      cantidad: c.cantidad,
      tarifaClp: c.tarifaClp,
      montoClp: c.montoClp,
      pagadoClp,
      saldoClp,
      estado,
      descripcion: c.descripcion,
      motivoAjuste: c.motivoAjuste,
      anulado: c.anulado,
      version: c.version,
      creadoEn: c.creadoEn.toISOString(),
    };
  });

  const totalCargos = cargos.reduce((acc, c) => acc + c.montoClp, 0);
  const totalRecaudado = cargos.reduce((acc, c) => acc + c.pagadoClp, 0);
  const totalPorCobrar = cargos.reduce((acc, c) => acc + c.saldoClp, 0);

  return {
    cargos,
    totales: {
      totalCargos,
      totalRecaudado,
      totalPorCobrar,
      cantidadTotal: cargos.length,
    },
  };
}

/**
 * Obtiene los cargos asociados a un sujeto particular en el evento activo.
 */
export async function obtenerCargosPorSujeto(
  ctx: Contexto,
  filtros: { caballoId?: string; jineteId?: string; clubId?: string; binomioId?: string }
) {
  if (!ctx.evento) return [];

  const where: Prisma.CargoWhereInput = {
    organizacionId: ctx.organizacionId,
    eventoId: ctx.evento.id,
    anulado: false,
  };

  if (filtros.caballoId) where.caballoId = filtros.caballoId;
  if (filtros.jineteId) where.jineteId = filtros.jineteId;
  if (filtros.clubId) where.clubId = filtros.clubId;
  if (filtros.binomioId) where.binomioId = filtros.binomioId;

  const cargos = await db(ctx).cargo.findMany({
    where,
    include: {
      categoria: true,
      pagos: {
        where: { anulado: false },
        include: { movimiento: true },
      },
    },
    orderBy: { creadoEn: "desc" },
  });

  return cargos.map((c) => {
    const pagadoClp = c.pagos.reduce((acc, p) => acc + p.montoClp, 0);
    const saldoClp = Math.max(0, c.montoClp - pagadoClp);

    let estado: EstadoCargo = "pendiente";
    if (c.anulado) estado = "anulado";
    else if (saldoClp === 0 && c.montoClp > 0) estado = "pagado";
    else if (pagadoClp > 0) estado = "parcial";

    return {
      id: c.id,
      categoriaId: c.categoriaId,
      categoriaNombre: c.categoria.nombre,
      cantidad: c.cantidad,
      tarifaClp: c.tarifaClp,
      montoClp: c.montoClp,
      pagadoClp,
      saldoClp,
      estado,
      descripcion: c.descripcion,
      motivoAjuste: c.motivoAjuste,
      version: c.version,
      creadoEn: c.creadoEn.toISOString(),
      pagos: c.pagos.map((p) => ({
        id: p.id,
        montoClp: p.montoClp,
        medioPago: p.movimiento.medioPago,
        fecha: p.movimiento.fechaPago?.toISOString().split("T")[0] || p.movimiento.fecha.toISOString().split("T")[0],
      })),
    };
  });
}
