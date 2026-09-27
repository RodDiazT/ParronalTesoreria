import { formatearMonto } from "@/lib/presentacion/formato";

interface MontoProps {
  valor: number;
  tipo?: "ingreso" | "gasto" | "neutro";
  anulado?: boolean;
  especie?: boolean;
  abreviar?: boolean;
  className?: string;
}

/**
 * Componente para renderizar montos CLP en formato tabular con colores semánticos.
 * (docs/interfaz/ux-ui.md §3.6)
 */
export function Monto({
  valor,
  tipo = "neutro",
  anulado = false,
  especie = false,
  abreviar = false,
  className = "",
}: MontoProps) {
  const textoMonto = formatearMonto(valor, {
    signo: tipo === "ingreso" || tipo === "gasto",
    abreviar,
  });

  if (anulado) {
    return (
      <span className={`tabular-nums text-texto-suave line-through select-none ${className}`}>
        {textoMonto}
      </span>
    );
  }

  if (especie) {
    return (
      <span className={`tabular-nums text-texto-suave select-none ${className}`}>
        {textoMonto} (especie)
      </span>
    );
  }

  const clasesColor = {
    ingreso: "text-ingreso font-semibold",
    gasto: "text-gasto font-semibold",
    neutro: valor < 0 ? "text-gasto font-semibold" : "text-texto",
  }[tipo];

  return (
    <span className={`tabular-nums select-none ${clasesColor} ${className}`}>
      {textoMonto}
    </span>
  );
}
