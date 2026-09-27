import { formatearFecha } from "@/lib/presentacion/formato";

interface FechaProps {
  valor: Date | string | null | undefined;
  formato?: "corta" | "larga" | "larga-hora";
  className?: string;
}

/**
 * Componente para renderizar fechas en zona horaria America/Santiago.
 * (docs/interfaz/ux-ui.md §3.6)
 */
export function Fecha({
  valor,
  formato = "larga",
  className = "",
}: FechaProps) {
  const texto = formatearFecha(valor, formato);

  return (
    <time className={`tabular-nums text-texto-suave ${className}`}>
      {texto}
    </time>
  );
}
