"use client";

import * as React from "react";
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  abierta: boolean;
  alCerrar: () => void;
  posicion?: "abajo" | "izquierda" | "centro";
  titulo?: string;
  descripcion?: string;
  children: React.ReactNode;
  mostrarCerrar?: boolean;
  className?: string;
}

export function Sheet({
  abierta,
  alCerrar,
  posicion = "abajo",
  titulo,
  descripcion,
  children,
  mostrarCerrar = true,
  className = "",
}: SheetProps) {
  useEffect(() => {
    if (!abierta) return;

    const manejarTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
    };

    document.addEventListener("keydown", manejarTecla);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = "unset";
    };
  }, [abierta, alCerrar]);

  if (!abierta) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={alCerrar}
        aria-hidden="true"
      />

      {/* Contenedor del contenido según posición */}
      {posicion === "abajo" && (
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-3xl border-t border-borde bg-superficie p-5 shadow-2xl animate-in slide-in-from-bottom duration-200",
            className
          )}
        >
          {/* Barra de agarre táctil */}
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-borde shrink-0" />

          <div className="flex items-center justify-between pb-3">
            <div>
              {titulo && <h2 className="text-base font-bold text-texto">{titulo}</h2>}
              {descripcion && (
                <p className="text-xs text-texto-suave mt-0.5">{descripcion}</p>
              )}
            </div>
            {mostrarCerrar && (
              <button
                onClick={alCerrar}
                className="flex h-8 w-8 items-center justify-center rounded-full text-texto-suave hover:bg-fondo hover:text-texto"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto">{children}</div>
        </div>
      )}

      {posicion === "izquierda" && (
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-sm flex-col border-r border-borde bg-superficie shadow-2xl animate-in slide-in-from-left duration-200",
            className
          )}
        >
          <div className="overflow-y-auto h-full">{children}</div>
        </div>
      )}

      {posicion === "centro" && (
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-borde bg-superficie p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200",
            className
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-borde/50">
            <div>
              {titulo && <h2 className="text-base font-bold text-texto">{titulo}</h2>}
              {descripcion && (
                <p className="text-xs text-texto-suave mt-0.5">{descripcion}</p>
              )}
            </div>
            {mostrarCerrar && (
              <button
                onClick={alCerrar}
                className="flex h-8 w-8 items-center justify-center rounded-full text-texto-suave hover:bg-fondo hover:text-texto"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-4 overflow-y-auto max-h-[75vh]">{children}</div>
        </div>
      )}
    </div>
  );
}
