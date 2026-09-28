"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { copiarResumenAccion } from "@/dominio/dashboard/acciones";
import { toast } from "sonner";

interface BotonCopiarResumenProps {
  eventoId: string;
}

export function BotonCopiarResumen({ eventoId }: BotonCopiarResumenProps) {
  const [isPending, startTransition] = useTransition();
  const [copiado, setCopiado] = useState(false);
  const [modalTexto, setModalTexto] = useState<string | null>(null);

  const handleCopiar = () => {
    startTransition(async () => {
      try {
        const res = await copiarResumenAccion(eventoId);
        if (!res.exito || !res.texto) {
          toast.error("No se pudo generar el resumen de tesorería.");
          return;
        }

        const texto = res.texto;

        // Intentar usar portapapeles nativo
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            toast.success("Resumen copiado al portapapeles para WhatsApp.");
            setTimeout(() => setCopiado(false), 2500);
            return;
          } catch {
            // Si el navegador bloquea el clipboard, abrir modal de fallback
          }
        }

        // Fallback: mostrar modal con texto seleccionable
        setModalTexto(texto);
      } catch (error: any) {
        toast.error(error.message || "Error al copiar el resumen.");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleCopiar}
        disabled={isPending}
        className="w-full h-11 rounded-2xl border-borde font-semibold text-xs text-texto hover:bg-fondo transition-colors shadow-2xs"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Generando resumen...
          </>
        ) : copiado ? (
          <>
            <Check className="h-4 w-4 text-listo mr-2" />
            Copiado al portapapeles
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2 text-texto-suave" />
            Copiar resumen para WhatsApp
          </>
        )}
      </Button>

      {/* Sheet de fallback si clipboard no está disponible */}
      <Sheet
        abierta={Boolean(modalTexto)}
        alCerrar={() => setModalTexto(null)}
        posicion="abajo"
        titulo="Resumen de Tesorería"
        descripcion="Selecciona y copia el texto para compartirlo en WhatsApp"
      >
        <div className="space-y-4 py-2">
          <textarea
            readOnly
            rows={12}
            value={modalTexto || ""}
            className="w-full rounded-2xl border border-borde bg-fondo p-3 text-xs font-mono text-texto focus:outline-none select-all"
            onFocus={(e) => e.target.select()}
          />
          <Button
            className="w-full h-11 rounded-xl"
            onClick={() => setModalTexto(null)}
          >
            Cerrar
          </Button>
        </div>
      </Sheet>
    </>
  );
}
