import { Contexto } from "@/lib/permisos";
import { db } from "@/lib/contexto";
import { MedioPago } from "@prisma/client";
import { formatearMonto, formatearFecha } from "@/lib/presentacion/formato";
import { alertasJinete } from "@/dominio/inscripciones/participantes/reglas";

export interface IndicadoresDashboard {
  ingresosPercibidos: number;
  aporteInicial: number;
  gastosPagados: number;
  saldoCaja: number;
  porCobrar: {
    total: number;
    inscripciones: number;
    otros: number;
  };
  porPagar: {
    total: number;
    proveedores: number;
    comision: number;
  };
  resultadoProyectado: number;
  porValidar: {
    cantidad: number;
    monto: number;
  };
  porAsignar: number;
  especie: {
    total: number;
    comprometido: number;
  };
}

export interface SaldoPorMedio {
  transferencia: number;
  efectivo: number;
  otro: number;
}

export interface AvisosAdministrador {
  solicitudes: number;
  solicitudesInscripcion: number;
  porValidar: {
    cantidad: number;
    monto: number;
  };
  porAsignar: number;
  ajustesPorVer: number;
  jinetesConAlertaMenor: number;
}

export interface LoMioAyudante {
  porValidar: {
    cantidad: number;
    monto: number;
  };
  observados: Array<{
    id: string;
    montoClp: number;
    descripcion: string | null;
    comentario: string | null;
  }>;
  reembolsosPendientes: number;
  solicitudesInscripcion: number;
}

/**
 * Calcula el monto total por cobrar de inscripciones y cargos vigentes no pagados.
 * (docs/inscripciones/inscripcion-binomios.md §5.2 y docs/dashboard/dashboard.md §5.2)
 */
export async function porCobrarInscripciones(
  ctx: Contexto,
  eventoId: string
): Promise<number> {
  const inscripciones = await db(ctx).inscripcion.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      eventoId,
      anulado: false,
      retirado: false,
    },
    select: {
      id: true,
      montoClp: true,
      pagos: {
        where: {
          anulado: false,
          movimiento: { anulado: false },
        },
        select: { montoClp: true },
      },
    },
  });

  let total = 0;

  for (const ins of inscripciones) {
    const pagado = ins.pagos.reduce((acc, p) => acc + p.montoClp, 0);
    const saldo = Math.max(0, ins.montoClp - pagado);
    total += saldo;
  }

  return total;
}

/**
 * Calcula el remanente total de pagos de inscripciones no asignado a ningún ítem ni devuelto como sobrante.
 * (docs/inscripciones/inscripcion-binomios.md §5.2 y docs/dashboard/dashboard.md §5.2)
 */
export async function totalPorAsignar(
  ctx: Contexto,
  eventoId: string
): Promise<number> {
  // Movimientos de ingreso del evento asociados a inscripciones
  const movimientos = await db(ctx).movimiento.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      eventoId,
      tipo: "ingreso",
      anulado: false,
      OR: [
        { categoria: { claveSistema: "inscripciones" } },
        { categoria: null },
      ],
    },
    select: {
      id: true,
      montoClp: true,
      pagos: {
        where: { anulado: false },
        select: { montoClp: true },
      },
      devolucionesSobrante: {
        where: { anulado: false },
        select: { montoClp: true },
      },
    },
  });

  let acumuladoPorAsignar = 0;

  for (const mov of movimientos) {
    const pagosSum = mov.pagos.reduce((acc, p) => acc + p.montoClp, 0);
    const devSum = mov.devolucionesSobrante.reduce((acc, d) => acc + d.montoClp, 0);
    const sobrante = mov.montoClp - pagosSum - devSum;
    if (sobrante > 0) {
      acumuladoPorAsignar += sobrante;
    }
  }

  return acumuladoPorAsignar;
}

/**
 * Obtiene los indicadores oficiales del Dashboard según marco general §6.7 y docs/dashboard/dashboard.md §5.2.
 */
export async function indicadores(
  ctx: Contexto,
  eventoId: string
): Promise<IndicadoresDashboard> {
  const orgId = ctx.organizacionId;

  const [
    ingresosAgg,
    aporteInicialAgg,
    gastosAgg,
    otrosIngresosPendAgg,
    gastosPendientesProveedoresAgg,
    gastosPendientesComisionAgg,
    porValidarAgg,
    especieTotalAgg,
    especieComprometidoAgg,
    porCobrarIns,
    porAsignarTot,
  ] = await Promise.all([
    // Ingresos pagados y validados en dinero
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        tipo: "ingreso",
        naturaleza: "dinero",
        estadoPago: "pagado",
        estadoValidacion: "validado",
        anulado: false,
      },
      _sum: { montoClp: true },
    }),
    // De lo cual aporte inicial
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        tipo: "ingreso",
        naturaleza: "dinero",
        estadoPago: "pagado",
        estadoValidacion: "validado",
        anulado: false,
        categoria: {
          OR: [
            { claveSistema: "aporte_inicial" },
            { nombre: "Aporte inicial" },
          ],
        },
      },
      _sum: { montoClp: true },
    }),
    // Gastos pagados y validados en dinero
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        tipo: "gasto",
        naturaleza: "dinero",
        estadoPago: "pagado",
        estadoValidacion: "validado",
        anulado: false,
      },
      _sum: { montoClp: true },
    }),
    // Otros ingresos pendientes y validados
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        tipo: "ingreso",
        naturaleza: "dinero",
        estadoPago: "pendiente",
        estadoValidacion: "validado",
        anulado: false,
      },
      _sum: { montoClp: true },
    }),
    // Gastos pendientes validados a proveedores (pagadoPorId === null)
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        tipo: "gasto",
        naturaleza: "dinero",
        estadoPago: "pendiente",
        estadoValidacion: "validado",
        pagadoPorId: null,
        anulado: false,
      },
      _sum: { montoClp: true },
    }),
    // Gastos pendientes validados a la comisión (reembolsos, pagadoPorId !== null)
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        tipo: "gasto",
        naturaleza: "dinero",
        estadoPago: "pendiente",
        estadoValidacion: "validado",
        pagadoPorId: { not: null },
        anulado: false,
      },
      _sum: { montoClp: true },
    }),
    // Por validar u observado
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        estadoValidacion: { in: ["por_validar", "observado"] },
        anulado: false,
      },
      _count: { id: true },
      _sum: { montoClp: true },
    }),
    // En especie total
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        naturaleza: "especie",
        anulado: false,
      },
      _sum: { montoClp: true },
    }),
    // En especie comprometido (pendiente)
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        naturaleza: "especie",
        estadoPago: "pendiente",
        anulado: false,
      },
      _sum: { montoClp: true },
    }),
    porCobrarInscripciones(ctx, eventoId),
    totalPorAsignar(ctx, eventoId),
  ]);

  const ingresosPercibidos = ingresosAgg._sum.montoClp || 0;
  const aporteInicial = aporteInicialAgg._sum.montoClp || 0;
  const gastosPagados = gastosAgg._sum.montoClp || 0;
  const saldoCaja = ingresosPercibidos - gastosPagados;

  const otrosIngresos = otrosIngresosPendAgg._sum.montoClp || 0;
  const totalPorCobrar = porCobrarIns + otrosIngresos;

  const proveedores = gastosPendientesProveedoresAgg._sum.montoClp || 0;
  const comision = gastosPendientesComisionAgg._sum.montoClp || 0;
  const totalPorPagar = proveedores + comision;

  const resultadoProyectado = saldoCaja + totalPorCobrar - totalPorPagar;

  return {
    ingresosPercibidos,
    aporteInicial,
    gastosPagados,
    saldoCaja,
    porCobrar: {
      total: totalPorCobrar,
      inscripciones: porCobrarIns,
      otros: otrosIngresos,
    },
    porPagar: {
      total: totalPorPagar,
      proveedores,
      comision,
    },
    resultadoProyectado,
    porValidar: {
      cantidad: porValidarAgg._count.id || 0,
      monto: porValidarAgg._sum.montoClp || 0,
    },
    porAsignar: porAsignarTot,
    especie: {
      total: especieTotalAgg._sum.montoClp || 0,
      comprometido: especieComprometidoAgg._sum.montoClp || 0,
    },
  };
}

/**
 * Calcula el saldo por medio de pago (Banco / Efectivo / Otro)
 * con la invariante estricta: transferencia + efectivo + otro === saldoCaja.
 * (docs/dashboard/dashboard.md §3.3 y §5.2)
 */
export async function saldoPorMedio(
  ctx: Contexto,
  eventoId: string
): Promise<SaldoPorMedio> {
  const orgId = ctx.organizacionId;
  const medios: MedioPago[] = ["transferencia", "efectivo", "otro"];

  const resultados: Record<MedioPago, number> = {
    transferencia: 0,
    efectivo: 0,
    otro: 0,
  };

  await Promise.all(
    medios.map(async (m) => {
      const [ingresosAgg, gastosAgg, traspasosHaciaAgg, traspasosDesdeAgg] =
        await Promise.all([
          // Ingresos pagados validados en dinero con este medio
          db(ctx).movimiento.aggregate({
            where: {
              organizacionId: orgId,
              eventoId,
              tipo: "ingreso",
              naturaleza: "dinero",
              estadoPago: "pagado",
              estadoValidacion: "validado",
              medioPago: m,
              anulado: false,
            },
            _sum: { montoClp: true },
          }),
          // Gastos pagados validados en dinero con este medio
          db(ctx).movimiento.aggregate({
            where: {
              organizacionId: orgId,
              eventoId,
              tipo: "gasto",
              naturaleza: "dinero",
              estadoPago: "pagado",
              estadoValidacion: "validado",
              medioPago: m,
              anulado: false,
            },
            _sum: { montoClp: true },
          }),
          // Traspasos hacia este medio (vigentes)
          db(ctx).traspaso.aggregate({
            where: {
              organizacionId: orgId,
              eventoId,
              hacia: m,
              anulado: false,
            },
            _sum: { montoClp: true },
          }),
          // Traspasos desde este medio (vigentes)
          db(ctx).traspaso.aggregate({
            where: {
              organizacionId: orgId,
              eventoId,
              desde: m,
              anulado: false,
            },
            _sum: { montoClp: true },
          }),
        ]);

      const ing = ingresosAgg._sum.montoClp || 0;
      const gas = gastosAgg._sum.montoClp || 0;
      const hacia = traspasosHaciaAgg._sum.montoClp || 0;
      const desde = traspasosDesdeAgg._sum.montoClp || 0;

      resultados[m] = ing - gas + hacia - desde;
    })
  );

  return {
    transferencia: resultados.transferencia,
    efectivo: resultados.efectivo,
    otro: resultados.otro,
  };
}

/**
 * Consulta los avisos de acción pendientes para el bloque 'Por revisar' del Administrador.
 * (docs/dashboard/dashboard.md §3.5)
 */
export async function avisosAdministrador(
  ctx: Contexto,
  eventoId: string
): Promise<AvisosAdministrador> {
  const orgId = ctx.organizacionId;

  const [
    solicitudes,
    porValidarAgg,
    porAsignarMonto,
    ajustesInsCount,
    ajustesCarCount,
    binomiosEvento,
  ] = await Promise.all([
    db(ctx).membresia.count({
      where: {
        organizacionId: orgId,
        estado: "solicitada",
      },
    }),
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        estadoValidacion: "por_validar",
        anulado: false,
      },
      _count: { id: true },
      _sum: { montoClp: true },
    }),
    totalPorAsignar(ctx, eventoId),
    db(ctx).inscripcion.count({
      where: {
        organizacionId: orgId,
        eventoId,
        avisoPendiente: true,
        anulado: false,
      },
    }),
    Promise.resolve(0),
    db(ctx).binomio.findMany({
      where: {
        organizacionId: orgId,
        eventoId,
        anulado: false,
      },
      select: {
        jinete: {
          select: {
            id: true,
            fechaNacimiento: true,
            autorizacionApoderadoFecha: true,
            apoderados: {
              where: { activo: true },
              select: {
                apoderadoId: true,
                activo: true,
                apoderado: {
                  select: { id: true, telefono: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  // Contabilizar jinetes únicos con alertas de menor
  const jinetesMap = new Map<string, any>();
  for (const b of binomiosEvento) {
    if (b.jinete && !jinetesMap.has(b.jinete.id)) {
      jinetesMap.set(b.jinete.id, b.jinete);
    }
  }

  let jinetesConAlertaMenor = 0;
  for (const j of jinetesMap.values()) {
    const apoderadosSimples = (j.apoderados || []).map((v: any) => ({
      id: v.apoderado?.id || v.apoderadoId,
      telefono: v.apoderado?.telefono,
    }));
    const vinculos = (j.apoderados || []).map((v: any) => ({
      apoderadoId: v.apoderadoId,
      activo: v.activo,
    }));

    const alertas = alertasJinete(
      {
        fechaNacimiento: j.fechaNacimiento,
        autorizacionApoderadoFecha: j.autorizacionApoderadoFecha,
      },
      vinculos,
      apoderadosSimples,
      ctx.evento
    );

    const tieneAlertaMenor = alertas.some(
      (a) => a.tipo === "menor_sin_apoderado" || a.tipo === "falta_autorizacion"
    );

    if (tieneAlertaMenor) {
      jinetesConAlertaMenor++;
    }
  }

  return {
    solicitudes,
    solicitudesInscripcion: 0,
    porValidar: {
      cantidad: porValidarAgg._count.id || 0,
      monto: porValidarAgg._sum.montoClp || 0,
    },
    porAsignar: porAsignarMonto,
    ajustesPorVer: ajustesInsCount + ajustesCarCount,
    jinetesConAlertaMenor,
  };
}

/**
 * Consulta los pendientes propios del Ayudante para el bloque 'Lo mío'.
 * (docs/dashboard/dashboard.md §3.6)
 */
export async function loMio(
  ctx: Contexto,
  eventoId: string
): Promise<LoMioAyudante> {
  const orgId = ctx.organizacionId;
  const usuarioId = ctx.usuario.id;

  const [pvAgg, observados, reembAgg] = await Promise.all([
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        enviadoAValidarPorId: usuarioId,
        estadoValidacion: "por_validar",
        anulado: false,
      },
      _count: { id: true },
      _sum: { montoClp: true },
    }),
    db(ctx).movimiento.findMany({
      where: {
        organizacionId: orgId,
        eventoId,
        enviadoAValidarPorId: usuarioId,
        estadoValidacion: "observado",
        anulado: false,
      },
      select: {
        id: true,
        montoClp: true,
        descripcion: true,
        comentarioObservacion: true,
      },
      orderBy: { creadoEn: "desc" },
    }),
    db(ctx).movimiento.aggregate({
      where: {
        organizacionId: orgId,
        eventoId,
        pagadoPorId: usuarioId,
        tipo: "gasto",
        estadoPago: "pendiente",
        estadoValidacion: "validado",
        anulado: false,
      },
      _sum: { montoClp: true },
    }),
  ]);

  return {
    porValidar: {
      cantidad: pvAgg._count.id || 0,
      monto: pvAgg._sum.montoClp || 0,
    },
    observados: observados.map((o) => ({
      id: o.id,
      montoClp: o.montoClp,
      descripcion: o.descripcion,
      comentario: o.comentarioObservacion,
    })),
    reembolsosPendientes: reembAgg._sum.montoClp || 0,
    solicitudesInscripcion: 0,
  };
}

/**
 * Genera el texto resumen formateado para compartir vía WhatsApp según docs/dashboard/dashboard.md §3.7.
 */
export async function textoResumen(
  ctx: Contexto,
  eventoId: string,
  ahora: Date = new Date()
): Promise<string> {
  const [ind, saldoMedio, evento] = await Promise.all([
    indicadores(ctx, eventoId),
    saldoPorMedio(ctx, eventoId),
    db(ctx).evento.findUnique({
      where: { id: eventoId },
      select: { nombre: true },
    }),
  ]);

  const nombreEvento = evento?.nombre || "Concurso Ecuestre";
  const fechaHoraTexto = formatearFecha(ahora, "larga-hora");

  const lineas: string[] = [];

  lineas.push(`Tesorería · ${nombreEvento}`);
  lineas.push(`Al ${fechaHoraTexto}`);
  lineas.push("");
  lineas.push(`Saldo de caja: ${formatearMonto(ind.saldoCaja)}`);
  lineas.push(`· Banco: ${formatearMonto(saldoMedio.transferencia)}`);
  lineas.push(`· Efectivo: ${formatearMonto(saldoMedio.efectivo)}`);
  if (saldoMedio.otro !== 0) {
    lineas.push(`· Otro: ${formatearMonto(saldoMedio.otro)}`);
  }

  let lineaIngresos = `Ingresos percibidos: ${formatearMonto(ind.ingresosPercibidos)}`;
  if (ind.aporteInicial > 0) {
    lineaIngresos += ` (aporte inicial ${formatearMonto(ind.aporteInicial)})`;
  }
  lineas.push(lineaIngresos);

  lineas.push(`Gastos pagados: ${formatearMonto(ind.gastosPagados)}`);
  lineas.push(`Por cobrar: ${formatearMonto(ind.porCobrar.total)}`);
  lineas.push(`Por pagar: ${formatearMonto(ind.porPagar.total)}`);
  lineas.push(`Resultado proyectado: ${formatearMonto(ind.resultadoProyectado)}`);

  // Sección Aparte (solo líneas mayores a 0)
  const lineasAparte: string[] = [];
  if (ind.porValidar.cantidad > 0 || ind.porValidar.monto > 0) {
    const palabraMov = ind.porValidar.cantidad === 1 ? "movimiento" : "movimientos";
    lineasAparte.push(`Por validar: ${ind.porValidar.cantidad} ${palabraMov}, ${formatearMonto(ind.porValidar.monto)}`);
  }
  if (ind.porAsignar > 0) {
    lineasAparte.push(`Por asignar: ${formatearMonto(ind.porAsignar)}`);
  }
  if (ind.especie.total > 0) {
    lineasAparte.push(`En especie: ${formatearMonto(ind.especie.total)}`);
  }

  if (lineasAparte.length > 0) {
    lineas.push("");
    lineas.push("Aparte:");
    lineas.push(...lineasAparte);
  }

  return lineas.join("\n");
}
