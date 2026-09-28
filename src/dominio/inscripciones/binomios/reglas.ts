import { z } from "zod";
import { Contexto, puede } from "@/lib/permisos";
import { edadEnEvento, ReferenciaEvento } from "@/dominio/inscripciones/participantes/reglas";

// -------------------------------------------------------------
// Esquemas Zod para montos y validaciones
// -------------------------------------------------------------

export const tarifaSchema = z.number().int().min(0).max(999_999_999);
export const montoPagoSchema = z.number().int().min(1).max(999_999_999);
export const cantidadSchema = z.number().int().min(1).max(999);

// -------------------------------------------------------------
// Interfaces comunes
// -------------------------------------------------------------

export interface ItemCobroBase {
  id: string;
  montoClp: number;
  anulado: boolean;
  retirado: boolean;
  creadoEn: Date;
}

export interface PagoVigenteLike {
  id: string;
  montoClp: number;
  anulado: boolean;
  movimiento?: {
    anulado: boolean;
    estadoValidacion: "por_validar" | "validado" | "observado";
  } | null;
}

export interface DevolucionVigenteLike {
  id: string;
  montoClp: number;
  anulado: boolean;
  movimiento?: {
    anulado: boolean;
  } | null;
}

export type EstadoItemCalculado = "pendiente" | "parcial" | "pagado" | "anulado" | "retirado";

export interface ResultadoEstadoItem {
  monto: number;
  pagado: number;
  saldo: number;
  estado: EstadoItemCalculado;
  porValidar: boolean;
  becado: boolean;
}

// -------------------------------------------------------------
// Regla: Pago y Devolución Vigentes
// (docs/inscripciones/inscripcion-binomios.md §5.2)
// -------------------------------------------------------------

export function esPagoVigente(pago: PagoVigenteLike): boolean {
  if (pago.anulado) return false;
  if (pago.movimiento && pago.movimiento.anulado) return false;
  return true;
}

export function esDevolucionVigente(devolucion: DevolucionVigenteLike): boolean {
  if (devolucion.anulado) return false;
  if (devolucion.movimiento && devolucion.movimiento.anulado) return false;
  return true;
}

// -------------------------------------------------------------
// Regla: Única función de Estado de Ítem
// (docs/inscripciones/inscripcion-binomios.md §3.5 y §5.2)
// -------------------------------------------------------------

export function estadoItem(
  item: ItemCobroBase,
  pagos: PagoVigenteLike[]
): ResultadoEstadoItem {
  const monto =
    (item as any).ajuste !== undefined && (item as any).ajuste !== null
      ? item.montoClp + (item as any).ajuste
      : item.montoClp;
  const pagosValidos = pagos.filter(esPagoVigente);
  const pagado = pagosValidos.reduce((acc, p) => acc + p.montoClp, 0);
  const saldo = Math.max(0, monto - pagado);

  const porValidar = pagosValidos.some(
    (p) =>
      p.movimiento &&
      (p.movimiento.estadoValidacion === "por_validar" ||
        p.movimiento.estadoValidacion === "observado")
  );

  const becado = monto === 0 && !item.anulado && !item.retirado;

  let estado: EstadoItemCalculado;
  if (item.anulado) {
    estado = "anulado";
  } else if (item.retirado) {
    estado = "retirado";
  } else if (monto === 0) {
    estado = "pagado";
  } else if (pagado >= monto) {
    estado = "pagado";
  } else if (pagado > 0) {
    estado = "parcial";
  } else {
    estado = "pendiente";
  }

  return {
    monto,
    pagado,
    saldo,
    estado,
    porValidar,
    becado,
  };
}

// -------------------------------------------------------------
// Regla: Retiro de Ítem (Pagado, Devuelto, Retenido)
// (docs/inscripciones/inscripcion-binomios.md §3.8 y §5.2)
// -------------------------------------------------------------

export function retiroItem(
  item: ItemCobroBase,
  pagos: PagoVigenteLike[],
  devoluciones: DevolucionVigenteLike[]
): {
  pagado: number;
  devuelto: number;
  retenido: number;
  totalPagado: number;
  totalDevuelto: number;
  totalRetenido: number;
} {
  const pagado = pagos.filter(esPagoVigente).reduce((acc, p) => acc + p.montoClp, 0);
  const devuelto = devoluciones.filter(esDevolucionVigente).reduce((acc, d) => acc + d.montoClp, 0);
  const retenido = Math.max(0, pagado - devuelto);

  return {
    pagado,
    devuelto,
    retenido,
    totalPagado: pagado,
    totalDevuelto: devuelto,
    totalRetenido: retenido,
  };
}

// -------------------------------------------------------------
// Regla: Cálculo de "Por Asignar" de un Movimiento
// (docs/inscripciones/inscripcion-binomios.md §3.7 y §5.2)
// -------------------------------------------------------------

export function porAsignar(
  movimiento: { montoClp: number },
  pagos: PagoVigenteLike[],
  devolucionesSobrante: DevolucionVigenteLike[] = []
): number {
  const pagosAsignados = pagos.filter(esPagoVigente).reduce((acc, p) => acc + p.montoClp, 0);
  const devoluciones = devolucionesSobrante
    .filter(esDevolucionVigente)
    .reduce((acc, d) => acc + d.montoClp, 0);

  return Math.max(0, movimiento.montoClp - pagosAsignados - devoluciones);
}

// -------------------------------------------------------------
// Regla: Reparto FIFO de Monto entre Ítems
// (docs/inscripciones/inscripcion-binomios.md §3.6 y §5.2)
// -------------------------------------------------------------

export interface ItemParaRepartir {
  id: string;
  tipo: "inscripcion" | "cargo";
  saldo: number;
  creadoEn: Date;
}

export interface RepartoAsignado {
  id: string;
  tipo: "inscripcion" | "cargo";
  montoAsignado: number;
}

export function repartirMonto(
  montoTotal: number,
  items: ItemParaRepartir[]
): { repartos: RepartoAsignado[]; porAsignar: number } {
  if (montoTotal <= 0) {
    return { repartos: [], porAsignar: 0 };
  }

  // Orden FIFO por creadoEn ascendente, luego id
  const ordenados = [...items].sort((a, b) => {
    const diff = a.creadoEn.getTime() - b.creadoEn.getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  const repartos: RepartoAsignado[] = [];
  let restante = montoTotal;

  for (const item of ordenados) {
    if (restante <= 0) break;
    if (item.saldo <= 0) continue;

    const asignacion = Math.min(item.saldo, restante);
    repartos.push({
      id: item.id,
      tipo: item.tipo,
      montoAsignado: asignacion,
    });
    restante -= asignacion;
  }

  return {
    repartos,
    porAsignar: restante,
  };
}

// -------------------------------------------------------------
// Regla: Aviso de Edad por Prueba (No bloqueante)
// (docs/inscripciones/inscripcion-binomios.md §3.2 y §5.2)
// -------------------------------------------------------------

export type TipoAvisoEdad = "no_cumple_edad" | "edad_sin_dato" | null;

export function avisoEdadPrueba(
  jinete: { fechaNacimiento: Date | string | null },
  prueba: { edadMinima: number | null; edadMaxima: number | null },
  evento: { fechaReferenciaEdad?: Date | string | null; fechaInicio?: Date | string }
): TipoAvisoEdad {
  if (prueba.edadMinima === null && prueba.edadMaxima === null) {
    return null;
  }

  if (!jinete.fechaNacimiento) {
    return "edad_sin_dato";
  }

  const fn = typeof jinete.fechaNacimiento === "string"
    ? new Date(jinete.fechaNacimiento)
    : jinete.fechaNacimiento;

  const evRef: ReferenciaEvento = {
    fechaReferenciaEdad: evento.fechaReferenciaEdad,
    fechaInicio: evento.fechaInicio ?? new Date(),
  };

  const edad = edadEnEvento(fn, evRef);

  if (edad === null) {
    return "edad_sin_dato";
  }

  if (prueba.edadMinima !== null && edad < prueba.edadMinima) {
    return "no_cumple_edad";
  }

  if (prueba.edadMaxima !== null && edad > prueba.edadMaxima) {
    return "no_cumple_edad";
  }

  return null;
}

// -------------------------------------------------------------
// Regla: Ocultar Datos para Rol Observador (Privacidad)
// (docs/inscripciones/inscripcion-binomios.md §3.12 y §4)
// -------------------------------------------------------------

export function ocultarDatosInscripcion<T extends Record<string, any>>(
  ctx: Contexto,
  datos: T
): T {
  if (puede(ctx, "inscripciones.verDatosPersonales")) {
    return datos;
  }

  const copia: any = { ...datos };

  if ("motivoAjuste" in copia) copia.motivoAjuste = null;
  if ("motivoAnulacion" in copia) copia.motivoAnulacion = null;
  if ("descripcion" in copia) copia.descripcion = null;
  if ("nombreOrigen" in copia) copia.nombreOrigen = null;
  if ("observacion" in copia) copia.observacion = null;
  if ("alertas" in copia) delete copia.alertas;
  if ("avisoEdad" in copia) delete copia.avisoEdad;
  if ("avisoPendiente" in copia) delete copia.avisoPendiente;

  if (copia.jinete && typeof copia.jinete === "object") {
    copia.jinete = { ...copia.jinete };
    delete copia.jinete.rut;
    delete copia.jinete.contacto;
    delete copia.jinete.fechaNacimiento;
    delete copia.jinete.email;
    delete copia.jinete.telefono;
  }

  return copia;
}

// -------------------------------------------------------------
// Excepción: Conflicto de Binomios al Fusionar Participantes
// (docs/inscripciones/inscripcion-binomios.md §3.13)
// -------------------------------------------------------------

export interface DetalleConflictoBinomio {
  binomioConservadoId: string;
  binomioDuplicadoId: string;
  detalle: string;
}

export class ConflictoBinomios extends Error {
  readonly status = 400;
  constructor(public readonly conflictos: DetalleConflictoBinomio[]) {
    super(
      `Conflicto al fusionar: se generarían ${conflictos.length} binomio(s) duplicados en el mismo evento.`
    );
    this.name = "ConflictoBinomios";
  }
}
