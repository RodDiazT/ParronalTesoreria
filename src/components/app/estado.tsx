import { InfoEstadoVisual, estadoVisual } from "@/lib/presentacion/estado";

interface ChipEstadoProps {
  tono?: InfoEstadoVisual["tono"];
  texto?: string;
  entidad?: "membresia" | "movimiento" | "inscripcion" | "evento" | "general";
  estado?: string | null;
}

/**
 * Chip de estado de 24px con los 4 tonos normados (Verde, Ámbar, Rojo, Gris)
 * y palabra obligatoria (docs/interfaz/ux-ui.md §3.5).
 */
export function ChipEstado({ tono, texto, entidad, estado }: ChipEstadoProps) {
  const visual =
    entidad && estado !== undefined
      ? estadoVisual(entidad, estado)
      : { tono: tono ?? "fuera", texto: texto ?? "—" };

  const clasesTono = {
    listo: "bg-listo-fondo text-listo-texto",
    falta: "bg-falta-fondo text-falta-texto",
    problema: "bg-problema-fondo text-problema-texto",
    fuera: "bg-fuera-fondo text-fuera-texto",
  }[visual.tono];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide h-6 select-none ${clasesTono}`}
    >
      {visual.texto}
    </span>
  );
}
