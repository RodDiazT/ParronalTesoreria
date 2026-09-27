import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

export const MAX_TAMANO_RESPALDO = 10 * 1024 * 1024; // 10 MB

/**
 * Obtiene la ruta raíz configurada para respaldos persistentes.
 */
export function obtenerRutaBaseRespaldos(): string {
  const ruta = process.env.RUTA_RESPALDOS;
  if (!ruta) {
    return path.resolve(process.cwd(), "scratch/respaldos");
  }
  return path.isAbsolute(ruta) ? ruta : path.resolve(process.cwd(), ruta);
}

/**
 * Valida los magic bytes para permitir únicamente JPEG, PNG o PDF.
 * Rechaza SVG, HTML, ejecutables o formatos no autorizados (docs/movimientos/movimientos.md §5.5).
 */
export function validarMagicBytesRespaldo(buffer: Buffer): {
  valido: boolean;
  tipoMime?: "image/jpeg" | "image/png" | "application/pdf";
  extension?: "jpg" | "png" | "pdf";
  error?: string;
} {
  if (buffer.length < 5) {
    return { valido: false, error: "El archivo está vacío o dañado." };
  }

  if (buffer.length > MAX_TAMANO_RESPALDO) {
    return { valido: false, error: "El archivo supera el tamaño máximo permitido de 10 MB." };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valido: true, tipoMime: "image/png", extension: "png" };
  }

  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { valido: true, tipoMime: "image/jpeg", extension: "jpg" };
  }

  // PDF: %PDF- (25 50 44 46)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { valido: true, tipoMime: "application/pdf", extension: "pdf" };
  }

  return {
    valido: false,
    error: "Formato no permitido. Solo se aceptan fotos en formato JPEG o PNG, y documentos PDF.",
  };
}

/**
 * Construye la ruta relativa de un respaldo según la convención del proyecto:
 * movimientos/<organizacionId>/<movimientoId>/<respaldoId>.<ext>
 */
export function construirRutaRelativaRespaldo(
  organizacionId: string,
  movimientoId: string,
  respaldoId: string,
  extension: string
): string {
  return path.join("movimientos", organizacionId, movimientoId, `${respaldoId}.${extension}`);
}

/**
 * Guarda un archivo en el disco persistente de forma atómica:
 * escribe primero un temporal y luego lo renombra.
 */
export async function guardarArchivoRespaldo(
  rutaRelativa: string,
  contenido: Buffer
): Promise<string> {
  const rutaBase = obtenerRutaBaseRespaldos();
  const rutaCompleta = path.resolve(rutaBase, rutaRelativa);

  // Verificación estricta de path traversal
  if (!rutaCompleta.startsWith(rutaBase)) {
    throw new Error("Ruta de archivo no autorizada.");
  }

  const dir = path.dirname(rutaCompleta);
  await fs.mkdir(dir, { recursive: true });

  const tempPath = `${rutaCompleta}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, contenido);
  await fs.rename(tempPath, rutaCompleta);

  return rutaCompleta;
}

/**
 * Elimina un archivo de respaldo del disco persistente si existe.
 */
export async function eliminarArchivoRespaldo(rutaRelativa: string): Promise<void> {
  try {
    const rutaBase = obtenerRutaBaseRespaldos();
    const rutaCompleta = path.resolve(rutaBase, rutaRelativa);

    if (!rutaCompleta.startsWith(rutaBase)) {
      return;
    }

    if (existsSync(rutaCompleta)) {
      await fs.unlink(rutaCompleta);
    }
  } catch (error) {
    console.error("Error al eliminar archivo de respaldo:", error);
  }
}

/**
 * Lee un archivo de respaldo desde la ruta relativa autorizada.
 */
export async function leerArchivoRespaldo(rutaRelativa: string): Promise<Buffer> {
  const rutaBase = obtenerRutaBaseRespaldos();
  const rutaCompleta = path.resolve(rutaBase, rutaRelativa);

  if (!rutaCompleta.startsWith(rutaBase)) {
    throw new Error("Ruta de archivo no autorizada.");
  }

  return await fs.readFile(rutaCompleta);
}
