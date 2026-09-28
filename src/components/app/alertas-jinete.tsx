"use client";

import { AlertTriangle, Info } from "lucide-react";
import { AlertaJinete } from "@/dominio/inscripciones/participantes/reglas";

interface AlertasJineteProps {
  alertas: AlertaJinete[];
  modo?: "compacto" | "completo";
  className?: string;
}

/**
 * Componente visual de chips de alerta de jinete (docs/inscripciones/participantes.md §3.4 y §5.5).
 * Muestra alertas no bloqueantes con tonos ámbar y rojo accesibles.
 */
export function AlertasJinete({ alertas, modo = "completo", className = "" }: AlertasJineteProps) {
  if (!alertas || alertas.length === 0) return null;

  if (modo === "compacto") {
    return (
      <div className={`flex flex-wrap gap-1.5 items-center ${className}`}>
        {alertas.map((a, idx) => {
          const esAdvertencia = a.gravedad === "advertencia";
          return (
            <span
              key={idx}
              title={a.mensaje}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium leading-none ${
                esAdvertencia
                  ? "bg-falta-fondo text-falta-texto border border-falta-borde/40"
                  : "bg-superficie-resaltada text-texto-secundario border border-borde"
              }`}
            >
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>{a.mensaje.split(":")[0]}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {alertas.map((a, idx) => {
        const esAdvertencia = a.gravedad === "advertencia";
        const Icono = esAdvertencia ? AlertTriangle : Info;
        return (
          <div
            key={idx}
            className={`flex items-start gap-2 p-2.5 rounded-xl text-xs font-medium leading-snug border ${
              esAdvertencia
                ? "bg-falta-fondo/50 text-falta-texto border-falta-borde/50"
                : "bg-superficie text-texto-secundario border-borde"
            }`}
          >
            <Icono className="w-4 h-4 flex-shrink-0 mt-0.5 text-falta-texto" />
            <div className="flex-1">{a.mensaje}</div>
          </div>
        );
      })}
    </div>
  );
}
