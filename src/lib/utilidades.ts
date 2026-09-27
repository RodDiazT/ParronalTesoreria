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
