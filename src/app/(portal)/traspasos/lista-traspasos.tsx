"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Rol } from "@prisma/client";
import { ArrowRight, FileText, Ban, Loader2, AlertCircle } from "lucide-react";
import { Monto } from "@/components/app/monto";
import { ChipEstado } from "@/components/app/estado";
import { formatearFecha } from "@/lib/presentacion/formato";
import { anularTraspasoAction } from "@/dominio/dashboard/acciones";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface TraspasoDTO {
  id: string;
  fecha: Date | string;
  desde: string;
  hacia: string;
  montoClp: number;
  observacion?: string | null;
  archivoRuta?: string | null;
  anulado: boolean;
  anuladoMotivo?: string | null;
  registradoPor?: { id: string; nombre: string | null } | null;
  anuladoPor?: { id: string; nombre: string | null } | null;
  version: number;
}

interface ListaTraspasosProps {
  traspasos: TraspasoDTO[];
  rol: Rol;
  puedeRegistrar: boolean;
}

const NOMBRES_MEDIO: Record<string, string> = {
  transferencia: "Banco",
  efectivo: "Efectivo",
  otro: "Otro",
};

export function ListaTraspasos({
  traspasos,
  rol,
  puedeRegistrar,
}: ListaTraspasosProps) {
  const [mostrarAnulados, setMostrarAnulados] = useState(false);
  const [traspasoParaAnular, setTraspasoParaAnular] = useState<TraspasoDTO | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [isPending, startTransition] = useTransition();

  const traspasosFiltrados = traspasos.filter((t) =>
    mostrarAnulados ? true : !t.anulado
  );

  const hayAnulados = traspasos.some((t) => t.anulado);

  const handleAnular = () => {
    if (!traspasoParaAnular) return;
    if (!motivoAnulacion || motivoAnulacion.trim().length < 3) {
      toast.error("Ingresa un motivo de anulación (mínimo 3 caracteres).");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", traspasoParaAnular.id);
      formData.set("motivo", motivoAnulacion.trim());
      formData.set("version", String(traspasoParaAnular.version));

      const res = await anularTraspasoAction(formData);
      if (res.exito) {
        toast.success("Traspaso anulado exitosamente.");
        setTraspasoParaAnular(null);
        setMotivoAnulacion("");
      } else {
        toast.error(res.error || "Error al anular el traspaso.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {hayAnulados && (
        <div className="flex items-center justify-between pb-1">
          <label className="flex items-center gap-2 text-xs text-texto-suave cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarAnulados}
              onChange={(e) => setMostrarAnulados(e.target.checked)}
              className="rounded border-borde text-acento focus:ring-acento"
            />
            Mostrar traspasos anulados
          </label>
        </div>
      )}

      {traspasosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-borde p-8 text-center space-y-2">
          <p className="text-sm font-medium text-texto">
            {traspasos.length === 0
              ? "Todavía no se han registrado traspasos."
              : "No hay traspasos vigentes."}
          </p>
          <p className="text-xs text-texto-suave">
            Los traspasos mueven fondos entre Banco y Efectivo sin alterar el total de caja.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {traspasosFiltrados.map((t) => {
            const desdeNombre = NOMBRES_MEDIO[t.desde] || t.desde;
            const haciaNombre = NOMBRES_MEDIO[t.hacia] || t.hacia;

            return (
              <div
                key={t.id}
                className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                  t.anulado
                    ? "border-borde/50 bg-superficie/40 opacity-75"
                    : "border-borde bg-superficie shadow-xs hover:border-acento/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-texto">
                        <span>{desdeNombre}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-texto-suave" />
                        <span className="text-acento">{haciaNombre}</span>
                      </div>

                      {t.anulado && <ChipEstado tono="fuera" texto="Anulado" />}
                    </div>

                    <p className="text-xs text-texto-suave">
                      {formatearFecha(t.fecha, "corta")}
                      {t.registradoPor?.nombre && ` · Por ${t.registradoPor.nombre}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <Monto valor={t.montoClp} tipo="neutro" anulado={t.anulado} className="text-base" />
                  </div>
                </div>

                {t.observacion && (
                  <p className="text-xs text-texto-suave bg-fondo/60 rounded-xl p-2.5 border border-borde/40 leading-relaxed">
                    {t.observacion}
                  </p>
                )}

                {t.anulado && t.anuladoMotivo && (
                  <p className="text-xs text-problema-texto bg-problema-fondo rounded-xl p-2.5 border border-problema-borde leading-relaxed">
                    <span className="font-semibold">Motivo anulación:</span> {t.anuladoMotivo}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-borde/30 text-xs">
                  <div>
                    {t.archivoRuta && rol !== "observador" && (
                      <a
                        href={`/api/traspasos/${t.id}/archivo`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-acento hover:underline cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Ver comprobante
                      </a>
                    )}
                  </div>

                  {puedeRegistrar && !t.anulado && (
                    <button
                      onClick={() => {
                        setTraspasoParaAnular(t);
                        setMotivoAnulacion("");
                      }}
                      className="inline-flex items-center gap-1 text-texto-suave hover:text-problema transition-colors cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Anular
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sheet para anular traspaso */}
      <Sheet
        abierta={Boolean(traspasoParaAnular)}
        alCerrar={() => setTraspasoParaAnular(null)}
        posicion="abajo"
        titulo="Anular Traspaso"
        descripcion="Esta acción revertirá el movimiento entre medios y quedará registrada en auditoría."
      >
        <div className="space-y-4 py-2">
          {traspasoParaAnular && (
            <div className="rounded-xl bg-fondo p-3 border border-borde space-y-1 text-xs">
              <div className="flex justify-between font-medium text-texto">
                <span>
                  {NOMBRES_MEDIO[traspasoParaAnular.desde]} → {NOMBRES_MEDIO[traspasoParaAnular.hacia]}
                </span>
                <Monto valor={traspasoParaAnular.montoClp} tipo="neutro" />
              </div>
              <p className="text-texto-suave">{formatearFecha(traspasoParaAnular.fecha, "corta")}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="motivo-anulacion" className="text-xs font-semibold text-texto">
              Motivo de anulación <span className="text-problema">*</span>
            </Label>
            <textarea
              id="motivo-anulacion"
              rows={3}
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              placeholder="Explica por qué se anula este traspaso..."
              className="w-full rounded-xl border border-borde bg-fondo p-3 text-sm text-texto focus:border-acento focus:outline-none"
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setTraspasoParaAnular(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleAnular}
              disabled={isPending || motivoAnulacion.trim().length < 3}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Anulando...
                </>
              ) : (
                "Confirmar anulación"
              )}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
