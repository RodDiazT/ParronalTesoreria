"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, DollarSign, UserPlus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";

interface HojaRegistrarProps {
  abierta: boolean;
  alCerrar: () => void;
}

/**
 * Hoja inferior con opciones para registrar (Movimiento, Inscribir binomio).
 * (docs/interfaz/ux-ui.md §3.2)
 */
export function HojaRegistrar({ abierta, alCerrar }: HojaRegistrarProps) {
  const opciones = [
    {
      titulo: "Registrar movimiento",
      descripcion: "Ingreso o gasto de tesorería",
      href: "/movimientos/nuevo",
      icono: ArrowUpRight,
      colorIcono: "text-acento bg-superficie border border-borde",
    },
    {
      titulo: "Inscribir binomio",
      descripcion: "Jinete, caballo y pruebas",
      href: "/inscripciones/nueva",
      icono: UserPlus,
      colorIcono: "text-acento bg-superficie border border-borde",
    },
  ];

  return (
    <Sheet
      abierta={abierta}
      alCerrar={alCerrar}
      posicion="abajo"
      titulo="¿Qué quieres registrar?"
      descripcion="Selecciona una acción rápida"
    >
      <div className="grid grid-cols-2 gap-3 py-2">
        {opciones.map((op) => {
          const Icono = op.icono;
          return (
            <Link
              key={op.href}
              href={op.href}
              onClick={alCerrar}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border border-borde bg-fondo hover:border-acento hover:bg-superficie/50 transition-all text-center group active:scale-[0.98]"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl mb-2.5 transition-transform group-hover:scale-105 ${op.colorIcono}`}
              >
                <Icono className="h-6 w-6 stroke-[2.2]" />
              </div>
              <span className="text-sm font-semibold text-texto leading-tight">
                {op.titulo}
              </span>
              <span className="text-[11px] text-texto-suave mt-0.5">
                {op.descripcion}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-borde/40">
        <button
          onClick={alCerrar}
          className="w-full h-11 rounded-xl bg-superficie text-texto font-medium text-sm hover:bg-borde transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </Sheet>
  );
}
