"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { HojaRegistrar } from "./hoja-registrar";

interface BotonRegistrarProps {
  rol?: string;
  ocultar?: boolean;
}

/**
 * Botón flotante '+' de 56px abajo a la derecha para móvil.
 * (docs/interfaz/ux-ui.md §3.2)
 */
export function BotonRegistrar({ rol, ocultar = false }: BotonRegistrarProps) {
  const [hojaAbierta, setHojaAbierta] = useState(false);

  // No se muestra a observadores ni si se indica explícitamente ocultar
  if (rol === "observador" || ocultar) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setHojaAbierta(true)}
        className="lg:hidden fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-acento text-sobre-acento shadow-lg hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-acento/30 cursor-pointer"
        aria-label="Registrar"
        title="Registrar"
      >
        <Plus className="h-7 w-7 stroke-[2.5]" />
      </button>

      <HojaRegistrar
        abierta={hojaAbierta}
        alCerrar={() => setHojaAbierta(false)}
      />
    </>
  );
}
