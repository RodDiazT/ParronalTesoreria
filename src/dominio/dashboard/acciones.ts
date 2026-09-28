"use server";

import { obtenerContexto } from "@/lib/contexto";
import { ErrorPermiso } from "@/lib/permisos";
import {
  traspasoRegistroSchema,
  ArchivoTraspaso,
  ejecutarRegistrarTraspaso,
  ejecutarAnularTraspaso,
} from "./traspasos";
import { textoResumen } from "./calculos";

/**
 * Server Action para registrar traspaso vía formulario HTML/FormData.
 * (docs/dashboard/dashboard.md §3.4 y §5.3)
 */
export async function registrarTraspasoAction(formData: FormData) {
  try {
    const ctx = await obtenerContexto();

    const datosJson = formData.get("datos");
    if (!datosJson || typeof datosJson !== "string") {
      return { exito: false, error: "Datos del traspaso no encontrados." };
    }

    const parseado = traspasoRegistroSchema.safeParse(JSON.parse(datosJson));
    if (!parseado.success) {
      return { exito: false, error: parseado.error.errors[0]?.message || "Datos inválidos." };
    }

    let archivo: ArchivoTraspaso | null = null;
    const archivoForm = formData.get("archivo");
    if (archivoForm instanceof File && archivoForm.size > 0) {
      const buffer = Buffer.from(await archivoForm.arrayBuffer());
      archivo = {
        buffer,
        nombre: archivoForm.name,
        tipoMime: archivoForm.type,
      };
    }

    const resultado = await ejecutarRegistrarTraspaso(ctx, parseado.data, archivo);
    return { exito: true, traspaso: resultado.traspaso, nuevo: resultado.nuevo };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al registrar el traspaso." };
  }
}

/**
 * Server Action para anular un traspaso vía formulario HTML/FormData o invocación directa.
 * (docs/dashboard/dashboard.md §3.4 y §5.3)
 */
export async function anularTraspasoAction(formData: FormData) {
  try {
    const ctx = await obtenerContexto();

    const id = formData.get("id");
    const motivo = formData.get("motivo");
    const versionStr = formData.get("version");

    if (!id || typeof id !== "string") {
      return { exito: false, error: "ID de traspaso no informado." };
    }
    if (!motivo || typeof motivo !== "string") {
      return { exito: false, error: "Motivo de anulación requerido." };
    }
    const version = Number(versionStr);
    if (!version || isNaN(version)) {
      return { exito: false, error: "Versión de concurrencia inválida." };
    }

    const resultado = await ejecutarAnularTraspaso(ctx, id, motivo, version);
    return { exito: true, traspaso: resultado };
  } catch (error: any) {
    return { exito: false, error: error.message || "Error al anular el traspaso." };
  }
}

/**
 * Server Action para obtener el texto formateado de WhatsApp del Dashboard.
 * Permiso: ver_dashboard y rol Administrador u Observador (Ayudante recibe 403 según §5.3).
 * (docs/dashboard/dashboard.md §3.7 y §5.3)
 */
export async function copiarResumenAccion(eventoId: string) {
  const ctx = await obtenerContexto();

  if (ctx.rol !== "administrador" && ctx.rol !== "observador") {
    throw new ErrorPermiso("No tienes permiso para copiar el resumen de tesorería.");
  }

  const texto = await textoResumen(ctx, eventoId);
  return { exito: true, texto };
}
