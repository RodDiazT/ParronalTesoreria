"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Plus, LogOut, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { Sheet } from "@/components/ui/sheet";
import { ChipEstado } from "./estado";
import { HojaRegistrar } from "./hoja-registrar";
import { GrupoMenu } from "@/lib/presentacion/menu";

interface MenuPrincipalProps {
  abierto: boolean;
  alCerrar: () => void;
  nombreOrganizacion: string;
  nombreEvento: string;
  fechaEvento: string;
  usuarioNombre: string;
  usuarioRol: string;
  tieneLogo?: boolean;
  grupos: GrupoMenu[];
}

/**
 * Menú principal de la aplicación: deslizable en celular y fijo a la izquierda en computador (≥1024px).
 * (docs/interfaz/ux-ui.md §3.3)
 */
export function MenuPrincipal({
  abierto,
  alCerrar,
  nombreOrganizacion,
  nombreEvento,
  fechaEvento,
  usuarioNombre,
  usuarioRol,
  tieneLogo = false,
  grupos,
}: MenuPrincipalProps) {
  const pathname = usePathname();
  const [hojaRegistrarAbierta, setHojaRegistrarAbierta] = useState(false);
  const esObservador = usuarioRol === "observador";
  const inicial = (nombreOrganizacion.trim()[0] || "P").toUpperCase();

  const contenidoMenu = (
    <div className="flex h-full flex-col justify-between p-4">
      {/* Cabecera del Menú */}
      <div className="space-y-4">
        <div className="flex items-start justify-between pb-3 border-b border-borde/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs border border-borde/40 overflow-hidden">
              {tieneLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/api/organizacion/logo"
                  alt={nombreOrganizacion}
                  className="h-full w-full object-contain p-0.5"
                />
              ) : (
                <span className="text-sm font-bold text-texto-suave">{inicial}</span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-texto leading-tight line-clamp-1">
                {nombreOrganizacion}
              </h2>
              <p className="text-xs text-texto-suave leading-tight mt-0.5 line-clamp-1">
                {nombreEvento} {fechaEvento ? `· ${fechaEvento}` : ""}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs font-medium text-texto truncate max-w-[120px]">
                  {usuarioNombre}
                </span>
                <ChipEstado
                  tono={
                    usuarioRol === "administrador"
                      ? "listo"
                      : usuarioRol === "ayudante"
                      ? "falta"
                      : "fuera"
                  }
                  texto={
                    usuarioRol === "administrador"
                      ? "Admin"
                      : usuarioRol === "ayudante"
                      ? "Ayudante"
                      : "Observador"
                  }
                />
              </div>
            </div>
          </div>

          <button
            onClick={alCerrar}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-texto-suave hover:bg-fondo hover:text-texto"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Botón '+ Registrar' en escritorio (≥1024px) */}
        {!esObservador && (
          <div className="hidden lg:block pt-1">
            <button
              onClick={() => setHojaRegistrarAbierta(true)}
              className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-acento text-sobre-acento font-semibold text-sm shadow-xs hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Registrar</span>
            </button>
          </div>
        )}

        {/* Lista de Grupos y Enlaces */}
        <nav className="space-y-4 pt-1">
          {grupos.map((grupo, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {grupo.titulo && (
                <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-texto-suave/80">
                  {grupo.titulo}
                </h3>
              )}
              <div className="space-y-0.5">
                {grupo.items.map((item) => {
                  const activo =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={alCerrar}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        activo
                          ? "bg-acento/10 text-acento font-semibold"
                          : "text-texto hover:bg-fondo"
                      }`}
                    >
                      <span>{item.etiqueta}</span>
                      {item.contador !== undefined && item.contador > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-falta-fondo px-1.5 text-xs font-bold text-falta-texto">
                          {item.contador}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Pie del Menú con Cerrar Sesión */}
      <div className="pt-4 border-t border-borde/60">
        <button
          onClick={() => signOut({ callbackUrl: "/ingresar" })}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gasto hover:bg-problema-fondo/40 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>

      <HojaRegistrar
        abierta={hojaRegistrarAbierta}
        alCerrar={() => setHojaRegistrarAbierta(false)}
      />
    </div>
  );

  return (
    <>
      {/* Versión Móvil: Hoja deslizable desde la izquierda */}
      <Sheet
        abierta={abierto}
        alCerrar={alCerrar}
        posicion="izquierda"
        mostrarCerrar={false}
      >
        {contenidoMenu}
      </Sheet>

      {/* Versión Escritorio (≥ 1024px): Barra lateral fija */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-borde bg-superficie overflow-y-auto">
        {contenidoMenu}
      </aside>
    </>
  );
}
