export type TonoEstado = "listo" | "falta" | "problema" | "fuera";

export interface InfoEstadoVisual {
  tono: TonoEstado;
  texto: string;
}

/**
 * Traduce cualquier estado de negocio a su tono visual normado y palabra legible.
 * (docs/interfaz/ux-ui.md §3.5 y §5.5)
 */
export function estadoVisual(
  entidad: "membresia" | "movimiento" | "inscripcion" | "evento" | "general",
  estado: string | null | undefined
): InfoEstadoVisual {
  if (!estado) {
    return { tono: "fuera", texto: "Sin estado" };
  }

  const clave = estado.toLowerCase().trim();

  // Estados de Membresía
  if (entidad === "membresia") {
    switch (clave) {
      case "activa":
        return { tono: "listo", texto: "Activo" };
      case "solicitada":
        return { tono: "falta", texto: "Solicitud" };
      case "revocada":
        return { tono: "fuera", texto: "Revocado" };
      case "rechazada":
        return { tono: "fuera", texto: "Rechazada" };
      case "invitado":
        return { tono: "falta", texto: "Invitado" };
    }
  }

  // Estados generales y de otros dominios
  switch (clave) {
    // Listo (Verde)
    case "validado":
      return { tono: "listo", texto: "Validado" };
    case "pagado":
      return { tono: "listo", texto: "Pagado" };
    case "recibido":
      return { tono: "listo", texto: "Recibido" };
    case "aceptada":
      return { tono: "listo", texto: "Aceptada" };
    case "abierto":
      return { tono: "listo", texto: "Abierto" };

    // Falta algo (Ámbar)
    case "por_validar":
      return { tono: "falta", texto: "Por validar" };
    case "pendiente":
      return { tono: "falta", texto: "Pendiente" };
    case "por_cobrar":
      return { tono: "falta", texto: "Por cobrar" };
    case "por_pagar":
      return { tono: "falta", texto: "Por pagar" };
    case "parcial":
      return { tono: "falta", texto: "Parcial" };
    case "por_asignar":
      return { tono: "falta", texto: "Por asignar" };
    case "por_revisar":
      return { tono: "falta", texto: "Por revisar" };
    case "solicitada":
      return { tono: "falta", texto: "Solicitud" };

    // Problema (Rojo)
    case "observado":
      return { tono: "problema", texto: "Observado" };
    case "falta_apoderado":
      return { tono: "problema", texto: "Falta apoderado" };
    case "falta_autorizacion":
      return { tono: "problema", texto: "Falta autorización" };
    case "menor_sin_apoderado":
      return { tono: "problema", texto: "Menor sin apoderado" };
    case "posible_duplicado":
      return { tono: "problema", texto: "Posible duplicado" };

    // Fuera de juego (Gris)
    case "anulado":
      return { tono: "fuera", texto: "Anulado" };
    case "retirado":
      return { tono: "fuera", texto: "Retirado" };
    case "becado":
      return { tono: "fuera", texto: "Becado" };
    case "rechazada":
      return { tono: "fuera", texto: "Rechazada" };
    case "revocada":
      return { tono: "fuera", texto: "Revocado" };
    case "en_especie":
      return { tono: "fuera", texto: "En especie" };
    case "cerrado":
      return { tono: "fuera", texto: "Cerrado" };
    case "rendido":
      return { tono: "fuera", texto: "Rendido" };

    default:
      return { tono: "fuera", texto: estado };
  }
}
