"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Menu } from "lucide-react";

interface EncabezadoProps {
  modo?: "seccion" | "detalle";
  titulo?: string;
  volverHref?: string;
  nombreEvento?: string;
  nombreOrganizacion?: string;
  tieneLogo?: boolean;
  totalPendientes?: number;
  alAbrirMenu?: () => void;
}

/**
 * Encabezado de 56px fijo arriba con logo, nombre del evento o botón volver.
 * (docs/interfaz/ux-ui.md §3.1)
 */
export function Encabezado({
  modo = "seccion",
  titulo,
  volverHref = "/",
  nombreEvento = "Concurso Ecuestre",
  nombreOrganizacion = "Club",
  tieneLogo = false,
  totalPendientes = 0,
  alAbrirMenu,
}: EncabezadoProps) {
  const inicial = (nombreOrganizacion.trim()[0] || "P").toUpperCase();

  return (
    <header className="sticky top-0 z-40 h-14 w-full border-b border-borde bg-superficie/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[720px] items-center justify-between px-4 lg:max-w-none lg:px-6">
        {modo === "detalle" ? (
          <div className="flex items-center gap-3 w-full">
            <Link
              href={volverHref}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-texto-suave hover:bg-fondo hover:text-texto transition-colors"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-base font-bold text-texto truncate">{titulo}</h1>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 min-w-0">
              {/* Botón Hamburguesa (solo visible en pantallas menores a 1024px) */}
              <button
                onClick={alAbrirMenu}
                className="relative lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-texto hover:bg-fondo transition-colors cursor-pointer"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
                {totalPendientes > 0 && (
                  <span className="absolute top-2 right-2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-falta-texto ring-2 ring-superficie">
                    <span className="sr-only">{totalPendientes} pendientes</span>
                  </span>
                )}
              </button>

              {/* Logo o Inicial del Club */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs border border-borde/40 overflow-hidden">
                {tieneLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src="/api/organizacion/logo"
                    alt={nombreOrganizacion}
                    className="h-full w-full object-contain p-0.5"
                  />
                ) : (
                  <span className="text-xs font-bold text-texto-suave">{inicial}</span>
                )}
              </div>

              {/* Nombre del evento */}
              <span className="text-sm font-bold text-texto truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {nombreEvento}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
