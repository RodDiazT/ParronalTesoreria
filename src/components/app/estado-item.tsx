import React from "react";
import { EstadoItemCalculado } from "@/dominio/inscripciones/binomios/reglas";
import { formatearMonto } from "@/lib/presentacion/formato";

interface EstadoItemBadgeProps {
  estado: EstadoItemCalculado;
  monto?: number;
  saldo?: number;
  porValidar?: boolean;
  becado?: boolean;
  className?: string;
}

export function EstadoItemBadge({
  estado,
  saldo = 0,
  porValidar,
  becado,
  className = "",
}: EstadoItemBadgeProps) {
  let texto = "";
  let clasesColor = "";

  if (estado === "anulado") {
    texto = "Anulado";
    clasesColor = "bg-superficie text-texto-suave border-borde line-through";
  } else if (estado === "retirado") {
    texto = "Retirado";
    clasesColor = "bg-superficie text-texto-suave border-borde line-through";
  } else if (becado || (estado === "pagado" && saldo === 0 && becado)) {
    texto = "Becado";
    clasesColor = "bg-listo-fondo text-listo-texto border-listo-borde";
  } else if (estado === "pagado") {
    texto = "Pagado";
    clasesColor = "bg-listo-fondo text-listo-texto border-listo-borde";
  } else if (estado === "parcial") {
    texto = `Parcial (falta ${formatearMonto(saldo)})`;
    clasesColor = "bg-atencion-fondo text-atencion-texto border-atencion-borde";
  } else {
    texto = `Pendiente ${formatearMonto(saldo)}`;
    clasesColor = "bg-superficie text-texto-suave border-borde";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${clasesColor} ${className}`}
    >
      <span>{texto}</span>
      {porValidar && (
        <span className="text-[10px] font-bold text-atencion-texto uppercase tracking-wider bg-atencion-fondo px-1 rounded">
          · por validar
        </span>
      )}
    </span>
  );
}
