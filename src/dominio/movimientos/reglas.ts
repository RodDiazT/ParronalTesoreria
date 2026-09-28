import { z } from "zod";
import { Contexto } from "@/lib/permisos";
import { ocultarDatosContraparte } from "@/lib/utilidades";

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD en zona horaria America/Santiago.
 */
export function obtenerFechaHoyChile(): string {
  const formateador = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formateador.format(new Date());
}

/**
 * Determina si un movimiento exige obligatoriamente contraparte:
 * - Todo movimiento pendiente (salvo gastos pagados por un miembro de la comisión, donde la deuda es el reembolso).
 * - Toda categoría que tenga activa la marca exigeContraparte.
 * - Todo ingreso en especie.
 * (docs/movimientos/movimientos.md §3.2)
 */
export function requiereContraparte(
  mov: {
    estadoPago: "pagado" | "pendiente";
    pagadoPorId?: string | null;
    naturaleza?: "dinero" | "especie";
  },
  categoria?: { exigeContraparte: boolean } | null
): boolean {
  if (categoria?.exigeContraparte) return true;
  if (mov.naturaleza === "especie") return true;
  if (mov.estadoPago === "pendiente" && !mov.pagadoPorId) return true;
  return false;
}

/**
 * Esquema base de registro de movimiento.
 */
export const movimientoRegistroSchema = z.object({
  tipo: z.enum(["ingreso", "gasto"]),
  naturaleza: z.enum(["dinero", "especie"]).default("dinero"),
  montoClp: z
    .number()
    .int("El monto debe ser un número entero.")
    .min(1, "El monto debe ser mayor a 0.")
    .max(999_999_999, "El monto no puede superar $999.999.999."),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (AAAA-MM-DD)."),
  fechaPago: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha de pago inválido (AAAA-MM-DD).")
    .optional()
    .nullable(),
  medioPago: z.enum(["transferencia", "efectivo", "otro"]).optional().nullable(),
  estadoPago: z.enum(["pagado", "pendiente"]).default("pagado"),
  categoriaId: z.string().optional().nullable(),
  sinIdentificar: z.boolean().default(false),
  contraparteId: z.string().optional().nullable(),
  pagadoPorId: z.string().optional().nullable(),
  nombreOrigen: z.string().trim().max(100, "Máximo 100 caracteres.").optional().nullable(),
  descripcion: z.string().trim().max(140, "Máximo 140 caracteres.").optional().nullable(),
  observacion: z.string().trim().max(500, "Máximo 500 caracteres.").optional().nullable(),
  sinRespaldo: z.boolean().default(false),
  claveCliente: z.string().min(5, "Clave de idempotencia requerida."),
  binomioId: z.string().optional().nullable(),
  jineteId: z.string().optional().nullable(),
  caballoId: z.string().optional().nullable(),
  clubId: z.string().optional().nullable(),
});

export type MovimientoRegistroInput = z.input<typeof movimientoRegistroSchema>;
export type MovimientoRegistroOutput = z.infer<typeof movimientoRegistroSchema>;

/**
 * Valida integralmente las reglas de negocio del movimiento.
 */
export function validarReglasMovimiento(
  datos: MovimientoRegistroInput,
  categoria?: { exigeContraparte: boolean; claveSistema: string | null } | null,
  tieneArchivos: boolean = false
): { valido: boolean; error?: string } {
  const hoy = obtenerFechaHoyChile();

  // 1. Reglas de naturaleza y tipo
  if (datos.tipo === "gasto" && datos.naturaleza === "especie") {
    return { valido: false, error: "Los gastos no pueden ser de naturaleza en especie." };
  }

  // 2. Reglas de pagadoPorId
  if (datos.tipo === "ingreso" && datos.pagadoPorId) {
    return { valido: false, error: "El campo 'Pagado por' solo aplica a gastos." };
  }

  // Si un gasto es pagado por una persona, nace pendiente como reembolso
  let estadoPago: "pagado" | "pendiente" =
    datos.tipo === "gasto" && datos.pagadoPorId
      ? "pendiente"
      : datos.estadoPago ?? "pagado";

  // 3. Reglas de fechas
  if (estadoPago === "pagado") {
    if (!datos.fechaPago) {
      return { valido: false, error: "La fecha de pago es obligatoria para movimientos pagados." };
    }
    if (datos.fechaPago > hoy) {
      return { valido: false, error: "La fecha de pago no puede ser futura." };
    }
    if (datos.fecha > hoy) {
      return { valido: false, error: "La fecha de ocurrencia de un movimiento pagado no puede ser futura." };
    }
    if (datos.fecha > datos.fechaPago) {
      return { valido: false, error: "La fecha de ocurrencia no puede ser posterior a la fecha de pago." };
    }

    // No más de 365 días hacia atrás respecto de fecha
    const msFecha = new Date(`${datos.fecha}T00:00:00Z`).getTime();
    const msFechaPago = new Date(`${datos.fechaPago}T00:00:00Z`).getTime();
    const diasDiferencia = (msFecha - msFechaPago) / (1000 * 60 * 60 * 24);
    if (diasDiferencia > 365) {
      return { valido: false, error: "La fecha de pago no puede ser anterior a la fecha en más de 365 días." };
    }
  } else {
    // Si es pendiente, no debe llevar fechaPago ni medioPago
    if (datos.fechaPago) {
      return { valido: false, error: "Un movimiento pendiente no debe tener fecha de pago." };
    }
  }

  // 4. Medio de pago
  if (datos.naturaleza === "especie") {
    if (datos.medioPago) {
      return { valido: false, error: "Un movimiento en especie no tiene medio de pago." };
    }
    if (datos.nombreOrigen) {
      return { valido: false, error: "Un movimiento en especie no tiene nombre de origen." };
    }
  } else if (estadoPago === "pagado") {
    if (!datos.medioPago) {
      return { valido: false, error: "El medio de pago es obligatorio para movimientos pagados en dinero." };
    }
  } else {
    if (datos.medioPago) {
      return { valido: false, error: "Un movimiento pendiente no debe tener medio de pago." };
    }
  }

  // 5. Nombre de origen
  if (datos.tipo === "gasto" && datos.nombreOrigen) {
    return { valido: false, error: "El nombre de origen solo aplica a ingresos." };
  }
  if (
    datos.tipo === "ingreso" &&
    datos.naturaleza === "dinero" &&
    estadoPago === "pagado" &&
    datos.medioPago === "transferencia" &&
    !datos.nombreOrigen?.trim()
  ) {
    return { valido: false, error: "El nombre de origen es obligatorio para transferencias recibidas." };
  }

  // 6. Categoría y sin identificar
  if (datos.sinIdentificar) {
    if (datos.tipo !== "ingreso") {
      return { valido: false, error: "Solo los ingresos pueden registrarse como sin identificar." };
    }
    if (datos.categoriaId) {
      return { valido: false, error: "Un movimiento sin identificar no debe tener categoría asignada." };
    }
  } else {
    if (!datos.categoriaId) {
      return { valido: false, error: "La categoría es obligatoria." };
    }
    if (categoria?.claveSistema === "inscripciones" || categoria?.claveSistema === "devoluciones") {
      return { valido: false, error: "Las categorías de sistema no pueden seleccionarse manualmente en el formulario." };
    }
  }

  // 7. Contraparte obligatoria
  const obligatoriaContraparte = requiereContraparte(
    { estadoPago, pagadoPorId: datos.pagadoPorId, naturaleza: datos.naturaleza },
    categoria
  );
  if (obligatoriaContraparte && !datos.contraparteId) {
    return { valido: false, error: "La contraparte es obligatoria para este movimiento." };
  }

  // 8. Respaldo vs sinRespaldo con observación
  if (datos.sinRespaldo) {
    if (!datos.observacion?.trim()) {
      return { valido: false, error: "Si marcas 'Sin respaldo', la observación justificativa es obligatoria." };
    }
  } else {
    if (!tieneArchivos) {
      return { valido: false, error: "Debes adjuntar al menos un archivo de respaldo o marcar 'Sin respaldo' con observación." };
    }
  }

  return { valido: true };
}

/**
 * Esquema para edición de movimiento.
 */
export const movimientoEdicionSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  montoClp: z.number().int().min(1).max(999_999_999),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaPago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  medioPago: z.enum(["transferencia", "efectivo", "otro"]).optional().nullable(),
  estadoPago: z.enum(["pagado", "pendiente"]),
  categoriaId: z.string().optional().nullable(),
  contraparteId: z.string().optional().nullable(),
  pagadoPorId: z.string().optional().nullable(),
  nombreOrigen: z.string().trim().max(100).optional().nullable(),
  descripcion: z.string().trim().max(140).optional().nullable(),
  observacion: z.string().trim().max(500).optional().nullable(),
  binomioId: z.string().optional().nullable(),
  jineteId: z.string().optional().nullable(),
  caballoId: z.string().optional().nullable(),
  clubId: z.string().optional().nullable(),
});

/**
 * Filtro común para cálculos sumables en caja y totales:
 * no anulado y naturaleza dinero (docs/movimientos/movimientos.md §5.2).
 */
export function filtroSumable() {
  return {
    anulado: false,
    naturaleza: "dinero" as const,
  };
}

/**
 * Oculta datos restringidos a usuarios con rol observador
 * (docs/movimientos/movimientos.md §3.8 y §4).
 */
export function ocultarDatosMovimiento<T extends Record<string, any>>(ctx: Contexto, mov: T): T {
  if (ctx.rol !== "observador") {
    return mov;
  }

  const copia: any = { ...mov };

  // Eliminar datos protegidos
  delete copia.nombreOrigen;
  delete copia.observacion;
  delete copia.comentarioObservacion;

  // En respaldos, solo informar cantidad sin detalles ni rutas
  if (Array.isArray(copia.respaldos)) {
    copia.cantidadRespaldos = copia.respaldos.filter((r: any) => !r.anulado).length;
    copia.respaldos = [];
  }

  // Ocultar datos personales en contraparte
  if (copia.contraparte) {
    copia.contraparte = ocultarDatosContraparte(ctx, copia.contraparte);
  }

  return copia as T;
}
