/**
 * Utilidades de normalización y validación según las especificaciones
 * de los documentos del proyecto.
 */

/**
 * Normaliza un texto para comparaciones y búsquedas:
 * minúsculas, sin diacríticos (tildes), sin puntuación, espacios colapsados y recortados.
 * (docs/organizacion/organizacion-evento.md §5.1)
 */
export function normalizarNombre(texto: string): string {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve tildes/diacríticos
    .replace(/[^a-z0-9\s]/g, " ")     // Remueve signos y puntuación
    .replace(/\s+/g, " ")             // Colapsa espacios repetidos
    .trim();
}

/**
 * Normaliza un número de teléfono a solo dígitos y extrae los últimos 9 dígitos
 * (docs/inscripciones/participantes.md §5.2)
 */
export function normalizarTelefono(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const soloDigitos = texto.replace(/\D/g, "");
  if (soloDigitos.length < 9) return soloDigitos || null;
  return soloDigitos.slice(-9);
}

/**
 * Valida un RUT chileno usando módulo 11.
 * Acepta con o sin puntos y guión (e.g. "12.345.678-9", "123456789", "12345678-k").
 * Devuelve el RUT formateado normalizado "12345678-9" o error.
 * (docs/organizacion/organizacion-evento.md §5.1)
 */
export function validarRut(texto: string): { valido: boolean; rutNormalizado?: string; error?: string } {
  if (!texto || typeof texto !== "string") {
    return { valido: false, error: "El RUT es obligatorio." };
  }

  const limpio = texto.replace(/[\.\s-]/g, "").toUpperCase();
  if (limpio.length < 8 || limpio.length > 9) {
    return { valido: false, error: "El RUT debe tener entre 8 y 9 caracteres." };
  }

  const cuerpo = limpio.slice(0, -1);
  const dvIngresado = limpio.slice(-1);

  if (!/^\d+$/.test(cuerpo)) {
    return { valido: false, error: "El cuerpo del RUT debe contener solo números." };
  }

  // Cálculo de dígito verificador (Módulo 11)
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  let dvEsperado = "";
  if (resto === 11) {
    dvEsperado = "0";
  } else if (resto === 10) {
    dvEsperado = "K";
  } else {
    dvEsperado = resto.toString();
  }

  if (dvIngresado !== dvEsperado) {
    return { valido: false, error: "El dígito verificador del RUT es incorrecto." };
  }

  return {
    valido: true,
    rutNormalizado: `${cuerpo}-${dvEsperado}`,
  };
}

/**
 * Obtiene la fecha de referencia para la edad: si fechaReferenciaEdad está vacía,
 * usa la fechaInicio del evento.
 * (docs/organizacion/organizacion-evento.md §5.1)
 */
export function fechaReferenciaEdadEfectiva<
  T extends { fechaReferenciaEdad?: Date | string | null; fechaInicio: Date | string }
>(evento: T): Date | string {
  return evento.fechaReferenciaEdad ?? evento.fechaInicio;
}

/**
 * Calcula la distancia de Levenshtein entre dos cadenas.
 */
export function distanciaLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Determina si dos nombres son parecidos según docs/organizacion/organizacion-evento.md §3.5:
 * Tras normalizar (minúsculas, sin tildes, sin puntuación ni espacios dobles):
 * 1) los nombres son iguales,
 * 2) uno contiene al otro (4 caracteres o más), o
 * 3) difieren en 2 letras o menos (nombres de 6 caracteres o más).
 */
export function sonNombresParecidos(nombreA: string, nombreB: string): boolean {
  const n1 = normalizarNombre(nombreA);
  const n2 = normalizarNombre(nombreB);

  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  if (n1.length >= 4 && n2.length >= 4) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }

  if (n1.length >= 6 && n2.length >= 6) {
    const dist = distanciaLevenshtein(n1, n2);
    if (dist <= 2) return true;
  }

  return false;
}
