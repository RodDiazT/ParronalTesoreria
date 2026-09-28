import { db, obtenerContexto } from "@/lib/contexto";
import { Contexto, exigir, puede } from "@/lib/permisos";
import { formatearMonto } from "@/lib/presentacion/formato";
import {
  estadoItem,
  esPagoVigente,
  esDevolucionVigente,
  porAsignar,
  retiroItem,
  avisoEdadPrueba,
  ocultarDatosInscripcion,
} from "./reglas";
import { alertasJinete } from "@/dominio/inscripciones/participantes/reglas";

export interface FiltrosListadoBinomios {
  clubId?: string;
  pruebaId?: string;
  estado?: "pendiente" | "parcial" | "pagado" | "retirado";
  conAlertas?: boolean;
  busqueda?: string;
}

/**
 * 3.12: Listado principal de binomios con tarjetas de dos líneas y filtros.
 */
export async function listarBinomios(
  ctx: Contexto,
  filtros: FiltrosListadoBinomios = {}
) {
  exigir(ctx, "inscripciones.ver");

  if (!ctx.evento) return [];

  const where: any = {
    organizacionId: ctx.organizacionId,
    eventoId: ctx.evento.id,
    anulado: false,
  };

  if (filtros.clubId) {
    where.clubId = filtros.clubId;
  }

  if (filtros.pruebaId) {
    where.inscripciones = {
      some: {
        pruebaId: filtros.pruebaId,
        anulado: false,
      },
    };
  }

  if (filtros.busqueda && filtros.busqueda.trim().length > 0) {
    const q = filtros.busqueda.trim();
    where.OR = [
      { jinete: { nombre: { contains: q, mode: "insensitive" } } },
      { caballo: { nombre: { contains: q, mode: "insensitive" } } },
    ];
  }

  const binomios = await db(ctx).binomio.findMany({
    where,
    include: {
      jinete: {
        include: {
          apoderados: {
            where: { activo: true },
            include: { apoderado: true },
          },
        },
      },
      caballo: true,
      club: true,
      inscripciones: {
        where: { anulado: false },
        include: {
          prueba: true,
          pagos: {
            where: { anulado: false },
            include: { movimiento: true },
          },
        },
      },
    },
    orderBy: { creadoEn: "desc" },
  });

  const resultados = binomios.map((b) => {
    // Calcular estados de inscripciones
    const itemsInscripciones = b.inscripciones.map((ins) => {
      const calc = estadoItem(ins, ins.pagos);
      const avisoEdad = avisoEdadPrueba(b.jinete, ins.prueba, ctx.evento!);
      return {
        ...ins,
        calculo: calc,
        avisoEdad,
      };
    });

    const itemsCargos: any[] = [];
    const todosItems = [...itemsInscripciones];
    const totalMonto = todosItems.reduce((acc, i) => acc + i.calculo.monto, 0);
    const totalPagado = todosItems.reduce((acc, i) => acc + i.calculo.pagado, 0);
    const saldoTotal = Math.max(0, totalMonto - totalPagado);
    const hayPorValidar = todosItems.some((i) => i.calculo.porValidar);

    let estadoGeneral: "pendiente" | "parcial" | "pagado" = "pendiente";
    if (saldoTotal === 0 && totalMonto > 0) {
      estadoGeneral = "pagado";
    } else if (totalPagado > 0) {
      estadoGeneral = "parcial";
    }

    // Alertas de jinete (marco §9.3)
    const alertas = alertasJinete(b.jinete, ctx.evento!);

    const binomioDTO = {
      id: b.id,
      jinete: {
        id: b.jinete.id,
        nombre: b.jinete.nombre,
        contacto: b.jinete.contacto,
        rut: b.jinete.rut,
      },
      caballo: {
        id: b.caballo.id,
        nombre: b.caballo.nombre,
      },
      club: {
        id: b.club.id,
        nombre: b.club.nombre,
      },
      cantidadPruebas: b.inscripciones.length,
      totalMonto,
      totalPagado,
      saldoTotal,
      estadoGeneral,
      porValidar: hayPorValidar,
      alertas,
      creadoEn: b.creadoEn,
      inscripciones: itemsInscripciones,
      cargos: itemsCargos,
    };

    return ocultarDatosInscripcion(ctx, binomioDTO);
  });

  // Filtro posterior por estado
  let filtrados = resultados;
  if (filtros.estado) {
    filtrados = filtrados.filter((b) => b.estadoGeneral === filtros.estado);
  }

  // Filtro posterior por alertas
  if (filtros.conAlertas && puede(ctx, "inscripciones.verDatosPersonales")) {
    filtrados = filtrados.filter((b: any) => b.alertas && b.alertas.length > 0);
  }

  return filtrados;
}

/**
 * 3.12: Ficha detallada de un binomio.
 */
export async function fichaBinomio(ctx: Contexto, id: string) {
  exigir(ctx, "inscripciones.ver");

  const b = await db(ctx).binomio.findUnique({
    where: { id, organizacionId: ctx.organizacionId },
    include: {
      jinete: {
        include: {
          club: true,
          apoderados: {
            where: { activo: true },
            include: { apoderado: true },
          },
        },
      },
      caballo: { include: { club: true } },
      club: true,
      inscripciones: {
        include: {
          prueba: true,
          pagos: {
            include: { movimiento: true },
          },
          devoluciones: {
            include: { movimiento: true },
          },
        },
      },
      movimientos: {
        where: { anulado: false },
        include: {
          categoria: true,
          registradoPor: { select: { id: true, nombre: true } },
        },
        orderBy: { creadoEn: "desc" },
      },
    },
  });

  if (!b) return null;

  const auditorias = await db(ctx).registroAuditoria.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      entidad: { in: ["Binomio", "Inscripcion", "Pago", "Devolucion", "Movimiento"] },
      OR: [
        { entidadId: b.id },
        { entidadId: { in: b.inscripciones.map((i) => i.id) } },
        { entidadId: { in: b.movimientos.map((m) => m.id) } },
      ],
    },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { creadoEn: "desc" },
    take: 40,
  });

  const insConCalculo = b.inscripciones.map((ins) => {
    const calc = estadoItem(ins, ins.pagos);
    const ret = ins.retirado ? retiroItem(ins, ins.pagos, ins.devoluciones) : null;
    const avisoEdad = avisoEdadPrueba(b.jinete, ins.prueba, ctx.evento!);
    const ajuste = ins.montoClp !== ins.tarifaClp ? ins.montoClp - ins.tarifaClp : null;
    return ocultarDatosInscripcion(ctx, {
      ...ins,
      ajuste,
      calculo: calc,
      retiro: ret,
      avisoEdad,
    });
  });

  const cargosConCalculo: any[] = [];

  const alertas = alertasJinete(b.jinete, ctx.evento!);

  const binomioFicha = {
    ...b,
    alertas,
    inscripciones: insConCalculo,
    cargos: cargosConCalculo,
    auditorias,
  };

  return ocultarDatosInscripcion(ctx, binomioFicha);
}

/**
 * 3.12: Pestaña Por Prueba: resumen de inscritos y montos por cada prueba activa.
 */
export async function resumenPorPrueba(ctx: Contexto) {
  exigir(ctx, "inscripciones.ver");

  if (!ctx.evento) return [];

  const pruebas = await db(ctx).prueba.findMany({
    where: { organizacionId: ctx.organizacionId, eventoId: ctx.evento.id },
    include: {
      inscripciones: {
        where: { anulado: false },
        include: {
          pagos: {
            where: { anulado: false },
            include: { movimiento: true },
          },
        },
      },
    },
    orderBy: { orden: "asc" },
  });

  return pruebas.map((p) => {
    const totalInscritos = p.inscripciones.length;
    let montoTotal = 0;
    let pagadoTotal = 0;

    for (const ins of p.inscripciones) {
      const calc = estadoItem(ins, ins.pagos);
      montoTotal += calc.monto;
      pagadoTotal += calc.pagado;
    }

    return {
      id: p.id,
      nombre: p.nombre,
      tarifaClp: p.tarifaClp,
      edadMinima: p.edadMinima,
      edadMaxima: p.edadMaxima,
      activa: p.activa,
      totalInscritos,
      montoTotal,
      pagadoTotal,
      saldoTotal: Math.max(0, montoTotal - pagadoTotal),
    };
  });
}

/**
 * 3.12: Pestaña Cargos: deprecada, retorna lista vacía.
 */
export async function listarCargos(_ctx: Contexto, _conceptoId?: string) {
  return [];
}

/**
 * 3.12: Pestaña Por Cobrar: ítems con saldo agrupados por club y jinete.
 */
export async function listarPorCobrar(ctx: Contexto) {
  exigir(ctx, "inscripciones.ver");

  if (!ctx.evento) return { porClub: [], totalGeneralPorCobrar: 0 };

  const inscripciones = await db(ctx).inscripcion.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      eventoId: ctx.evento.id,
      anulado: false,
    },
    include: {
      prueba: true,
      binomio: {
        include: {
          jinete: true,
          caballo: true,
          club: true,
        },
      },
      pagos: {
        where: { anulado: false },
        include: { movimiento: true },
      },
    },
  });

  const mapaClubes: Record<
    string,
    {
      clubId: string;
      clubNombre: string;
      items: any[];
      totalPorCobrar: number;
    }
  > = {};

  let totalGeneral = 0;

  for (const ins of inscripciones) {
    const calc = estadoItem(ins, ins.pagos);
    if (calc.saldo > 0) {
      const clubId = ins.binomio.club.id;
      const clubNombre = ins.binomio.club.nombre;
      if (!mapaClubes[clubId]) {
        mapaClubes[clubId] = { clubId, clubNombre, items: [], totalPorCobrar: 0 };
      }
      mapaClubes[clubId].items.push({
        tipo: "inscripcion",
        id: ins.id,
        nombre: ins.prueba.nombre,
        sujeto: `${ins.binomio.jinete.nombre} / ${ins.binomio.caballo.nombre}`,
        monto: calc.monto,
        pagado: calc.pagado,
        saldo: calc.saldo,
      });
      mapaClubes[clubId].totalPorCobrar += calc.saldo;
      totalGeneral += calc.saldo;
    }
  }

  return {
    porClub: Object.values(mapaClubes).sort((a, b) => b.totalPorCobrar - a.totalPorCobrar),
    totalGeneralPorCobrar: totalGeneral,
  };
}

/**
 * 3.7 y 3.12: Pestaña Por Asignar: movimientos de inscripciones con saldo libre.
 */
export async function listarPorAsignar(ctx: Contexto) {
  exigir(ctx, "inscripciones.ver");

  if (!ctx.evento) return [];

  const movimientos = await db(ctx).movimiento.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      eventoId: ctx.evento.id,
      tipo: "ingreso",
      anulado: false,
      categoria: { claveSistema: "inscripciones" },
    },
    include: {
      pagos: { where: { anulado: false } },
      devolucionesSobrante: { where: { anulado: false } },
    },
    orderBy: { fecha: "desc" },
  });

  const resultados = [];
  for (const m of movimientos) {
    const saldoPorAsignar = porAsignar(m, m.pagos, m.devolucionesSobrante);
    if (saldoPorAsignar > 0) {
      resultados.push(
        ocultarDatosInscripcion(ctx, {
          id: m.id,
          fecha: m.fecha,
          medioPago: m.medioPago,
          montoTotal: m.montoClp,
          porAsignar: saldoPorAsignar,
          nombreOrigen: m.nombreOrigen,
          estadoValidacion: m.estadoValidacion,
          version: m.version,
        })
      );
    }
  }

  return resultados;
}

/**
 * 3.8 y 3.12: Pestaña Retiros: ítems retirados con pagado, devuelto y retenido.
 */
export async function listarRetiros(ctx: Contexto) {
  exigir(ctx, "inscripciones.ver");

  if (!ctx.evento) return [];

  const inscripciones = await db(ctx).inscripcion.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      eventoId: ctx.evento.id,
      retirado: true,
    },
    include: {
      prueba: true,
      binomio: {
        include: {
          jinete: true,
          caballo: true,
          club: true,
        },
      },
      pagos: {
        where: { anulado: false },
        include: { movimiento: true },
      },
      devoluciones: {
        where: { anulado: false },
        include: { movimiento: true },
      },
    },
    orderBy: { anuladoEn: "desc" },
  });

  const lista = [];

  for (const ins of inscripciones) {
    const ret = retiroItem(ins, ins.pagos, ins.devoluciones);
    lista.push(
      ocultarDatosInscripcion(ctx, {
        id: ins.id,
        tipo: "inscripcion",
        titulo: ins.prueba.nombre,
        sujeto: `${ins.binomio.jinete.nombre} / ${ins.binomio.caballo.nombre}`,
        club: ins.binomio.club.nombre,
        pagado: ret.pagado,
        devuelto: ret.devuelto,
        retenido: ret.retenido,
        motivo: ins.motivoAnulacion,
        fechaRetiro: ins.anuladoEn,
      })
    );
  }

  return lista;
}

/**
 * 3.11: Estado de cuenta unificado por Sujeto (Binomio, Jinete o Club).
 */
export async function estadoCuenta(
  ctx: Contexto,
  sujeto: { binomioId?: string; jineteId?: string; clubId?: string }
) {
  exigir(ctx, "inscripciones.ver");

  if (puede(ctx, "inscripciones.verDatosPersonales") === false) {
    throw new Error("No tienes permiso para ver estados de cuenta.");
  }

  if (!ctx.evento) return null;

  let whereIns: any = {
    organizacionId: ctx.organizacionId,
    eventoId: ctx.evento.id,
    anulado: false,
  };

  let nombreSujeto = "";

  if (sujeto.binomioId) {
    whereIns.binomioId = sujeto.binomioId;
    const b = await db(ctx).binomio.findUnique({
      where: { id: sujeto.binomioId },
      include: { jinete: true, caballo: true },
    });
    if (b) nombreSujeto = `${b.jinete.nombre} / ${b.caballo.nombre}`;
  } else if (sujeto.jineteId) {
    whereIns.binomio = { jineteId: sujeto.jineteId };
    const j = await db(ctx).jinete.findUnique({ where: { id: sujeto.jineteId } });
    if (j) nombreSujeto = j.nombre;
  } else if (sujeto.clubId) {
    whereIns.binomio = { clubId: sujeto.clubId };
    const c = await db(ctx).club.findUnique({ where: { id: sujeto.clubId } });
    if (c) nombreSujeto = c.nombre;
  }

  const inscripciones = await db(ctx).inscripcion.findMany({
    where: whereIns,
    include: {
      prueba: true,
      binomio: {
        include: { jinete: true, caballo: true },
      },
      pagos: {
        where: { anulado: false },
        include: { movimiento: true },
      },
    },
    orderBy: { creadoEn: "asc" },
  });

  const items = [];
  let totalMonto = 0;
  let totalPagado = 0;
  let pagosEnRevision = 0;

  for (const ins of inscripciones) {
    const calc = estadoItem(ins, ins.pagos);
    totalMonto += calc.monto;
    totalPagado += calc.pagado;
    if (calc.porValidar) {
      const montosPorValidar = ins.pagos
        .filter(
          (p) =>
            !p.anulado &&
            p.movimiento &&
            (p.movimiento.estadoValidacion === "por_validar" ||
              p.movimiento.estadoValidacion === "observado")
        )
        .reduce((a, p) => a + p.montoClp, 0);
      pagosEnRevision += montosPorValidar;
    }

    items.push({
      id: ins.id,
      tipo: "inscripcion",
      descripcion: `${ins.binomio.jinete.nombre} / ${ins.binomio.caballo.nombre} — ${ins.prueba.nombre}`,
      monto: calc.monto,
      pagado: calc.pagado,
      saldo: calc.saldo,
      estado: calc.estado,
      becado: calc.becado,
      porValidar: calc.porValidar,
      creadoEn: ins.creadoEn,
    });
  }

  return {
    sujeto: nombreSujeto,
    items,
    totalMonto,
    totalPagado,
    saldoTotal: Math.max(0, totalMonto - totalPagado),
    pagosEnRevision,
  };
}

/**
 * 3.11: Genera el texto formateado para copiar por WhatsApp (con auditoría).
 */
export async function textoEstadoCuenta(
  ctx: Contexto,
  sujeto: { binomioId?: string; jineteId?: string; clubId?: string }
): Promise<string> {
  exigir(ctx, "inscripciones.ver");

  if (!puede(ctx, "inscripciones.verDatosPersonales")) {
    throw new Error("No tienes permiso para copiar estados de cuenta.");
  }

  const datos = await estadoCuenta(ctx, sujeto);
  if (!datos) return "";

  const lineas: string[] = [];
  lineas.push(`Concurso ${ctx.evento?.nombre || "Parronal"} — Estado de cuenta`);
  lineas.push(datos.sujeto);
  lineas.push("");

  for (const it of datos.items) {
    let estadoTexto = "";
    if (it.becado) {
      estadoTexto = "becado";
    } else if (it.saldo === 0) {
      estadoTexto = `pagado ${formatearMonto(it.pagado)}`;
    } else if (it.pagado > 0) {
      estadoTexto = `parcial (pagado ${formatearMonto(it.pagado)}, falta ${formatearMonto(it.saldo)})`;
    } else {
      estadoTexto = "pendiente";
    }

    lineas.push(`• ${it.descripcion}: ${formatearMonto(it.monto)} · ${estadoTexto}`);
  }

  lineas.push("");
  lineas.push(
    `Total: ${formatearMonto(datos.totalMonto)} · Pagado: ${formatearMonto(
      datos.totalPagado
    )} · Saldo: ${formatearMonto(datos.saldoTotal)}`
  );

  if (datos.pagosEnRevision > 0) {
    lineas.push(`Pagos recibidos en revisión: ${formatearMonto(datos.pagosEnRevision)}`);
  }

  // Auditoría (docs §3.11)
  await db(ctx).registroAuditoria.create({
    data: {
      organizacionId: ctx.organizacionId,
      usuarioId: ctx.usuario.id,
      entidad: "Inscripcion",
      entidadId: sujeto.binomioId || sujeto.jineteId || sujeto.clubId || "sujeto",
      accion: "copiar_estado_cuenta",
      despues: {
        sujeto: datos.sujeto,
        totalItems: datos.items.length,
        saldoTotal: datos.saldoTotal,
      },
    },
  });

  return lineas.join("\n");
}

export async function copiarEstadoCuentaAction(sujeto: {
  binomioId?: string;
  jineteId?: string;
  clubId?: string;
}) {
  const ctx = await obtenerContexto();
  return textoEstadoCuenta(ctx, sujeto);
}

/**
 * 3.3: Bandeja de ajustes pendientes de "Visto" para el administrador.
 */
export async function bandejaAjustes(ctx: Contexto) {
  exigir(ctx, "inscripciones.administrar");

  if (!ctx.evento) return { inscripciones: [], cargos: [], total: 0 };

  const inscripciones = await db(ctx).inscripcion.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      eventoId: ctx.evento.id,
      avisoPendiente: true,
      anulado: false,
    },
    include: {
      prueba: true,
      binomio: {
        include: { jinete: true, caballo: true },
      },
      registradoPor: { select: { id: true, nombre: true } },
    },
    orderBy: { actualizadoEn: "desc" },
  });

  return {
    inscripciones,
    cargos: [],
    total: inscripciones.length,
  };
}

export async function contadorAjustes(ctx: Contexto): Promise<number> {
  if (!puede(ctx, "inscripciones.administrar") || !ctx.evento) return 0;

  const countIns = await db(ctx).inscripcion.count({
    where: {
      organizacionId: ctx.organizacionId,
      eventoId: ctx.evento.id,
      avisoPendiente: true,
      anulado: false,
    },
  });

  return countIns;
}

/**
 * 5.2: Indicador "Por cobrar de inscripciones" para el Dashboard.
 */
export async function porCobrarInscripciones(
  ctx: Contexto,
  eventoId?: string
): Promise<number> {
  const evId = eventoId || ctx.evento?.id;
  if (!evId) return 0;

  const inscripciones = await db(ctx).inscripcion.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      eventoId: evId,
      anulado: false,
    },
    include: {
      pagos: {
        where: { anulado: false },
        include: { movimiento: true },
      },
    },
  });

  let totalPorCobrar = 0;

  for (const ins of inscripciones) {
    const calc = estadoItem(ins, ins.pagos);
    totalPorCobrar += calc.saldo;
  }

  return totalPorCobrar;
}

/**
 * 5.2: Indicador "Total por asignar" de inscripciones para el Dashboard.
 */
export async function totalPorAsignar(
  ctx: Contexto,
  eventoId?: string
): Promise<number> {
  const evId = eventoId || ctx.evento?.id;
  if (!evId) return 0;

  const movimientos = await db(ctx).movimiento.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      eventoId: evId,
      tipo: "ingreso",
      anulado: false,
      categoria: { claveSistema: "inscripciones" },
    },
    include: {
      pagos: { where: { anulado: false } },
      devolucionesSobrante: { where: { anulado: false } },
    },
  });

  let total = 0;
  for (const m of movimientos) {
    total += porAsignar(m, m.pagos, m.devolucionesSobrante);
  }

  return total;
}

/**
 * 3.13: Consulta para vista previa de cambio de fechas del evento.
 */
export async function inscripcionesAfectadasPorCambioDeFecha(
  ctx: Contexto,
  eventoId: string,
  nuevaFechaReferencia: string | Date
) {
  exigir(ctx, "configurar");

  const fechaNueva = typeof nuevaFechaReferencia === "string"
    ? new Date(nuevaFechaReferencia)
    : nuevaFechaReferencia;

  const inscripciones = await db(ctx).inscripcion.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      eventoId,
      anulado: false,
      prueba: {
        OR: [{ edadMinima: { not: null } }, { edadMaxima: { not: null } }],
      },
    },
    include: {
      prueba: true,
      binomio: {
        include: { jinete: true, caballo: true },
      },
    },
  });

  const afectadas = [];

  for (const ins of inscripciones) {
    const avisoAnterior = avisoEdadPrueba(ins.binomio.jinete, ins.prueba, ctx.evento!);
    const avisoNuevo = avisoEdadPrueba(
      ins.binomio.jinete,
      ins.prueba,
      { fechaReferenciaEdad: fechaNueva }
    );

    if (avisoAnterior !== avisoNuevo) {
      afectadas.push({
        inscripcionId: ins.id,
        jineteNombre: ins.binomio.jinete.nombre,
        caballoNombre: ins.binomio.caballo.nombre,
        pruebaNombre: ins.prueba.nombre,
        antes: avisoAnterior,
        despues: avisoNuevo,
      });
    }
  }

  return afectadas;
}
