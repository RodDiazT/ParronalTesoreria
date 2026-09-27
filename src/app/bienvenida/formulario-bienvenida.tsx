"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { aceptarAviso } from "@/dominio/acceso/acciones";

interface FormularioBienvenidaProps {
  nombre?: string | null;
}

export function FormularioBienvenida({ nombre }: FormularioBienvenidaProps) {
  const router = useRouter();
  const [aceptado, setAceptado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleContinuar = () => {
    if (!aceptado) return;
    setError(null);

    startTransition(async () => {
      try {
        await aceptarAviso();
        router.push("/");
        router.refresh();
      } catch (err: any) {
        setError(err?.message || "Ocurrió un error al registrar tu aceptación. Intenta nuevamente.");
      }
    });
  };

  return (
    <div className="w-full max-w-lg rounded-2xl border border-borde bg-superficie p-6 sm:p-8 shadow-sm">
      <div className="mb-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-acento text-sobre-acento font-bold">
          ✓
        </div>
        <h1 className="text-xl font-bold tracking-tight text-texto">
          {nombre ? `Hola, ${nombre}` : "Bienvenido"}
        </h1>
        <p className="mt-1 text-xs text-texto-suave">
          Antes de continuar, es necesario que leas y aceptes el aviso de privacidad de la tesorería del concurso.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-problema-fondo bg-problema-fondo/40 p-3 text-xs text-problema-texto font-medium">
          {error}
        </div>
      )}

      {/* Resumen del aviso según docs/acceso/acceso-roles.md §3.8 */}
      <div className="mb-6 rounded-xl border border-borde bg-fondo p-4 text-xs text-texto-suave leading-relaxed space-y-3">
        <p className="font-semibold text-texto">Resumen del Aviso de Privacidad:</p>
        <p>
          Este portal lo usa la comisión organizadora del concurso para registrar y rendir
          los ingresos y gastos del evento. Al ingresar, guardamos tu nombre, correo e
          imagen de Google y un registro de las acciones que realizas.
        </p>
        <p>
          Los usamos solo para gestionar tu acceso y dejar trazabilidad de la tesorería;
          no se publican ni se ceden a terceros; algunos datos se procesan con un proveedor
          de inteligencia artificial que actúa por encargo de la comisión.
        </p>
        <p>
          Se conservan hasta un año después de que el club aprueba la rendición del evento.
          Para acceder, corregir o suprimir tus datos, u oponerte a su uso, escribe al
          administrador del evento.
        </p>
      </div>

      <div className="mb-6 text-center">
        <Link
          href="/privacidad"
          target="_blank"
          className="text-xs text-acento font-medium underline underline-offset-4 hover:opacity-80 transition-opacity"
        >
          Ver texto completo del aviso de privacidad ↗
        </Link>
      </div>

      {/* Casilla obligatoria */}
      <div className="mb-6">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={aceptado}
            onChange={(e) => setAceptado(e.target.checked)}
            disabled={isPending}
            className="mt-0.5 h-4 w-4 rounded border-borde text-acento focus:ring-acento cursor-pointer"
          />
          <span className="text-xs font-medium text-texto leading-normal">
            Leí y acepto el aviso de privacidad y el tratamiento de mis datos personales.
          </span>
        </label>
      </div>

      {/* Botón Continuar */}
      <button
        type="button"
        onClick={handleContinuar}
        disabled={!aceptado || isPending}
        className="w-full rounded-xl bg-acento px-4 py-3 text-sm font-semibold text-sobre-acento transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {isPending ? "Guardando consentimiento…" : "Continuar"}
      </button>
    </div>
  );
}
