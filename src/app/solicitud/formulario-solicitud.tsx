"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { solicitarAcceso } from "@/dominio/acceso/acciones";
import { ChipEstado } from "@/components/app/estado";
import { formatearFecha } from "@/lib/presentacion/formato";

interface FormularioSolicitudProps {
  estadoMembresia: "ninguna" | "solicitada" | "revocada";
  fechaSolicitud?: Date | null;
  mensajeAnterior?: string | null;
}

export function FormularioSolicitud({
  estadoMembresia,
  fechaSolicitud,
  mensajeAnterior,
}: FormularioSolicitudProps) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [mostrarReintento, setMostrarReintento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await solicitarAcceso({ mensaje });
        router.refresh();
      } catch (err: any) {
        setError(err?.message || "No se pudo enviar la solicitud. Intenta nuevamente.");
      }
    });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-borde bg-superficie p-6 sm:p-8 shadow-sm">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-falta-fondo text-falta-texto font-bold text-lg">
          🔒
        </div>
        <h1 className="text-xl font-bold tracking-tight text-texto">
          Acceso al portal
        </h1>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-problema-fondo bg-problema-fondo/40 p-3 text-xs text-problema-texto font-medium">
          {error}
        </div>
      )}

      {/* ESTADO 1: Solicitud pendiente */}
      {estadoMembresia === "solicitada" && (
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <ChipEstado tono="falta" texto="Solicitud pendiente" />
          </div>
          <p className="text-sm text-texto font-medium">
            Tu solicitud está pendiente. Avisa al administrador del evento para que la revise.
          </p>
          {fechaSolicitud && (
            <p className="text-xs text-texto-suave">
              Enviada el {formatearFecha(fechaSolicitud, "larga")}
            </p>
          )}
          {mensajeAnterior && (
            <div className="rounded-xl border border-borde bg-fondo p-3 text-xs text-texto-suave italic">
              &ldquo;{mensajeAnterior}&rdquo;
            </div>
          )}
          <p className="text-xs text-texto-suave">
            Una vez aprobada tu solicitud, podrás ingresar directamente con tu cuenta.
          </p>
        </div>
      )}

      {/* ESTADO 2: Rechazada o revocada (sin abrir reintento todavía) */}
      {estadoMembresia === "revocada" && !mostrarReintento && (
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <ChipEstado tono="fuera" texto="Sin acceso" />
          </div>
          <p className="text-sm text-texto font-medium">
            No tienes acceso al portal en este momento.
          </p>
          <p className="text-xs text-texto-suave">
            Si crees que esto es un error o necesitas colaborar en la tesorería del evento,
            puedes volver a solicitar acceso enviando un mensaje al administrador.
          </p>
          <button
            type="button"
            onClick={() => setMostrarReintento(true)}
            className="w-full rounded-xl bg-acento px-4 py-2.5 text-xs font-semibold text-sobre-acento hover:opacity-95 cursor-pointer transition-opacity"
          >
            Volver a solicitar
          </button>
        </div>
      )}

      {/* ESTADO 3: Formulario de solicitud (Nunca solicitó o reintentando) */}
      {(estadoMembresia === "ninguna" || (estadoMembresia === "revocada" && mostrarReintento)) && (
        <form onSubmit={handleEnviar} className="space-y-4">
          <p className="text-sm text-texto text-center font-medium">
            Aún no tienes acceso a la tesorería.
          </p>
          <p className="text-xs text-texto-suave text-center">
            Envía una solicitud para que el administrador verifique tu rol y active tu cuenta.
          </p>

          <div>
            <label htmlFor="mensaje" className="block text-xs font-medium text-texto mb-1">
              Mensaje para el administrador (opcional)
            </label>
            <textarea
              id="mensaje"
              rows={3}
              maxLength={200}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Por ejemplo: Soy Pedro, de la comisión organizadora"
              className="w-full rounded-xl border border-borde bg-fondo p-3 text-xs text-texto placeholder:text-texto-suave/60 focus:outline-none focus:ring-1 focus:ring-acento transition-colors resize-none"
            />
            <div className="mt-1 flex justify-between text-[11px] text-texto-suave">
              <span>Máximo 200 caracteres</span>
              <span>{mensaje.length}/200</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-acento px-4 py-3 text-xs font-semibold text-sobre-acento hover:opacity-95 disabled:opacity-50 cursor-pointer transition-opacity"
          >
            {isPending ? "Enviando solicitud…" : "Solicitar acceso"}
          </button>

          {mostrarReintento && (
            <button
              type="button"
              onClick={() => setMostrarReintento(false)}
              className="w-full text-center text-xs text-texto-suave hover:text-texto transition-colors"
            >
              Cancelar
            </button>
          )}
        </form>
      )}

      {/* Botón para salir / cerrar sesión */}
      <div className="mt-6 border-t border-borde pt-4 text-center">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/ingresar" })}
          className="text-xs text-texto-suave hover:text-gasto transition-colors cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
