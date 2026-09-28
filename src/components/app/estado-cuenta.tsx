"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EstadoItemBadge } from "./estado-item";
import { formatearMonto } from "@/lib/presentacion/formato";
import { copiarEstadoCuentaAction } from "@/dominio/inscripciones/binomios/acciones";

interface ItemEstadoCuenta {
  id: string;
  tipo: "inscripcion" | "cargo";
  descripcion: string;
  monto: number;
  pagado: number;
  saldo: number;
  estado: any;
  becado: boolean;
  porValidar: boolean;
}

export interface EstadoCuentaDatos {
  sujeto: string;
  items: ItemEstadoCuenta[];
  totalMonto: number;
  totalPagado: number;
  saldoTotal: number;
  pagosEnRevision: number;
}

interface EstadoCuentaProps {
  sujeto: { binomioId?: string; jineteId?: string; clubId?: string };
  datos: EstadoCuentaDatos;
}

export function EstadoCuenta({ sujeto, datos }: EstadoCuentaProps) {
  const [copiado, setCopiado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleCopiar = async () => {
    try {
      setCargando(true);
      const texto = await copiarEstadoCuentaAction(sujeto);
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (e) {
      console.error("Error al copiar estado de cuenta:", e);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-texto">Estado de cuenta</h3>
          <p className="text-xs text-texto-suave">{datos.sujeto}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopiar}
          disabled={cargando}
          className="gap-1.5 text-xs h-8"
        >
          {copiado ? (
            <>
              <Check className="h-3.5 w-3.5 text-listo" />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copiar para WhatsApp</span>
            </>
          )}
        </Button>
      </div>

      {datos.items.length === 0 ? (
        <div className="p-4 rounded-xl border border-borde bg-superficie/30 text-center text-xs text-texto-suave">
          No hay ítems registrados en este estado de cuenta.
        </div>
      ) : (
        <div className="border border-borde rounded-2xl bg-superficie/40 divide-y divide-borde/40 overflow-hidden">
          {datos.items.map((it) => (
            <div
              key={it.id}
              className="p-3.5 flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <span className="font-semibold text-texto block truncate">
                  {it.descripcion}
                </span>
                <span className="text-texto-suave">
                  Monto: {formatearMonto(it.monto)} · Pagado: {formatearMonto(it.pagado)}
                </span>
              </div>
              <div className="shrink-0">
                <EstadoItemBadge
                  estado={it.estado}
                  monto={it.monto}
                  saldo={it.saldo}
                  porValidar={it.porValidar}
                  becado={it.becado}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Totales */}
      <div className="p-3.5 rounded-xl border border-borde bg-superficie text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-texto-suave">Total:</span>
          <span className="font-semibold text-texto">{formatearMonto(datos.totalMonto)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-texto-suave">Pagado:</span>
          <span className="font-semibold text-listo">{formatearMonto(datos.totalPagado)}</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-borde/60 text-sm">
          <span className="font-bold text-texto">Saldo pendiente:</span>
          <span className="font-bold text-gasto">{formatearMonto(datos.saldoTotal)}</span>
        </div>

        {datos.pagosEnRevision > 0 && (
          <div className="pt-1 border-t border-borde/60 flex items-center justify-between text-xs text-atencion-texto">
            <span>Pagos recibidos en revisión:</span>
            <span className="font-semibold">{formatearMonto(datos.pagosEnRevision)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
