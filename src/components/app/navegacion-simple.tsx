import Link from "next/link";
import { Rol } from "@prisma/client";

interface NavegacionSimpleProps {
  titulo: string;
  subtitulo?: string;
  volverHref?: string;
  rol?: Rol;
  solicitudesPendientes?: number;
}

export function NavegacionSimple({
  titulo,
  subtitulo,
  volverHref,
  rol,
  solicitudesPendientes = 0,
}: NavegacionSimpleProps) {
  const esAdmin = rol === "administrador";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-borde bg-superficie/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {volverHref ? (
            <Link
              href={volverHref}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-texto-suave hover:bg-fondo hover:text-texto transition-colors"
              aria-label="Volver"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-acento text-sobre-acento font-semibold text-sm">
              T
            </div>
          )}

          <div>
            <h1 className="text-base font-semibold text-texto leading-tight line-clamp-1">
              {titulo}
            </h1>
            {subtitulo && (
              <p className="text-xs text-texto-suave leading-none mt-0.5 line-clamp-1">
                {subtitulo}
              </p>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          {esAdmin && (
            <Link
              href="/usuarios"
              className="relative px-2.5 py-1.5 text-xs font-medium rounded-lg text-texto hover:bg-fondo transition-colors"
            >
              Usuarios
              {solicitudesPendientes > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-falta-fondo text-falta-texto font-bold text-[10px]">
                  {solicitudesPendientes}
                </span>
              )}
            </Link>
          )}

          {rol && (
            <Link
              href="/comision"
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-texto-suave hover:text-texto hover:bg-fondo transition-colors"
            >
              Comisión
            </Link>
          )}

          <Link
            href="/mi-cuenta"
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-texto-suave hover:text-texto hover:bg-fondo transition-colors"
          >
            Mi cuenta
          </Link>
        </nav>
      </div>
    </header>
  );
}
