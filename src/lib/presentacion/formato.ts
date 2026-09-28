/**
 * Formatea un monto en pesos chilenos según docs/interfaz/ux-ui.md §3.6.
 * Ejemplo: $1.250.000, +$200.000, −$45.000 (signo menos tipográfico).
 */
export function formatearMonto(
  clp: number,
  opciones?: {
    signo?: boolean;
    abreviar?: boolean;
  }
): string {
  const esNegativo = clp < 0;
  const absoluto = Math.abs(clp);

  if (opciones?.abreviar && absoluto >= 1_000_000) {
    const millones = (absoluto / 1_000_000).toLocaleString("es-CL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const prefijo = esNegativo ? "−$" : opciones?.signo && clp > 0 ? "+$" : "$";
    return `${prefijo}${millones} M`;
  }

  const textoNumero = Math.round(absoluto).toLocaleString("es-CL");

  if (esNegativo) {
    return `−$${textoNumero}`;
  }
  if (opciones?.signo && clp > 0) {
    return `+$${textoNumero}`;
  }
  return `$${textoNumero}`;
}

/**
 * Formatea una fecha en zona horaria America/Santiago.
 * Formatos:
 * - "corta": "Hoy", "Ayer", o "12 oct" (agrega año si no es el actual).
 * - "larga": "12-10-2026"
 * - "larga-hora": "12-10-2026 15:42"
 */
export function formatearFecha(
  instante: Date | string | null | undefined,
  formato: "corta" | "larga" | "larga-hora" = "larga"
): string {
  if (!instante) return "—";

  const fecha = typeof instante === "string" ? new Date(instante) : instante;
  if (isNaN(fecha.getTime())) return "—";

  const tz = "America/Santiago";

  if (formato === "corta") {
    const ahora = new Date();
    const formatoDia = new Intl.DateTimeFormat("es-CL", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

    const strFecha = formatoDia.format(fecha);
    const strAhora = formatoDia.format(ahora);

    const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    const strAyer = formatoDia.format(ayer);

    if (strFecha === strAhora) return "Hoy";
    if (strFecha === strAyer) return "Ayer";

    const anioFecha = fecha.getFullYear();
    const anioActual = ahora.getFullYear();

    const opcionesMesDia: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      day: "numeric",
      month: "short",
      ...(anioFecha !== anioActual ? { year: "numeric" } : {}),
    };

    return new Intl.DateTimeFormat("es-CL", opcionesMesDia).format(fecha);
  }

  if (formato === "larga-hora") {
    return new Intl.DateTimeFormat("es-CL", {
      timeZone: tz,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(fecha)
      .replace(",", "");
  }

  return new Intl.DateTimeFormat("es-CL", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

/**
 * Formatea la hora en formato HH:mm en zona horaria America/Santiago.
 */
export function formatearHora(instante: Date | string = new Date()): string {
  const fecha = typeof instante === "string" ? new Date(instante) : instante;
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
}
