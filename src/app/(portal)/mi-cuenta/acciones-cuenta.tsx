"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { cerrarMisSesiones } from "@/dominio/acceso/acciones";

export function AccionesCuenta() {
  const [modalTodosAbierto, setModalTodosAbierto] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCerrarTodos = () => {
    startTransition(async () => {
      try {
        await cerrarMisSesiones();
        await signOut({ callbackUrl: "/ingresar" });
      } catch (err) {
        console.error("Error al cerrar sesiones:", err);
        await signOut({ callbackUrl: "/ingresar" });
      }
    });
  };

  return (
    <div className="space-y-3 pt-2">
      {/* Botón Descargar mis datos (Portabilidad Ley 19.628 / 21.719) */}
      <a
        href="/api/mi-cuenta/descargar"
        download="mis-datos-tesoreria.json"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-borde bg-superficie px-4 py-2.5 text-xs font-medium text-texto hover:bg-fondo transition-colors"
      >
        <span>Descargar mis datos (JSON)</span>
      </a>

      {/* Botón Cerrar sesión en este dispositivo */}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/ingresar" })}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-borde bg-superficie px-4 py-2.5 text-xs font-medium text-texto hover:bg-fondo transition-colors cursor-pointer"
      >
        <span>Cerrar sesión en este equipo</span>
      </button>

      {/* Botón Cerrar sesión en todos los dispositivos */}
      <button
        type="button"
        onClick={() => setModalTodosAbierto(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-problema-fondo bg-problema-fondo/20 px-4 py-2.5 text-xs font-medium text-problema-texto hover:bg-problema-fondo/40 transition-colors cursor-pointer"
      >
        <span>Cerrar sesión en todos mis dispositivos</span>
      </button>

      {/* Modal de confirmación */}
      {modalTodosAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-6 shadow-lg">
            <h3 className="text-base font-bold text-texto mb-2">
              ¿Cerrar sesión en todos los dispositivos?
            </h3>
            <p className="text-xs text-texto-suave mb-5 leading-relaxed">
              Esta acción invalidará tus sesiones activas en cualquier otro teléfono, tableta o computador.
              Úsala especialmente si perdiste o te robaron un dispositivo.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalTodosAbierto(false)}
                className="rounded-xl border border-borde px-3 py-2 text-xs font-medium text-texto hover:bg-fondo"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleCerrarTodos}
                className="rounded-xl bg-gasto px-4 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
              >
                {isPending ? "Cerrando sesiones…" : "Cerrar en todos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
