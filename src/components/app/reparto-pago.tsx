"use client";

import React, { useEffect } from "react";
import { formatearMonto } from "@/lib/presentacion/formato";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { repartirMonto } from "@/dominio/inscripciones/binomios/reglas";

export interface ItemCobrableParaReparto {
  id: string;
  tipo: "inscripcion" | "cargo";
  nombre: string;
  sujeto: string;
  monto: number;
  pagado: number;
  saldo: number;
  creadoEn: Date | string;
  binomioId?: string;
  jineteId?: string;
  clubId?: string;
}

interface RepartoPagoProps {
  montoPago: number;
  items: ItemCobrableParaReparto[];
  valores: Record<string, number>;
  alCambiar: (valores: Record<string, number>) => void;
}

export function RepartoPago({
  montoPago,
  items,
  valores,
  alCambiar,
}: RepartoPagoProps) {
  // Aplicar reparto FIFO inicial si los valores están vacíos y hay monto
  const aplicarRepartoAutomatico = () => {
    const itemsAdaptados = items.map((it) => ({
      id: it.id,
      tipo: it.tipo,
      saldo: it.saldo,
      creadoEn: typeof it.creadoEn === "string" ? new Date(it.creadoEn) : it.creadoEn,
    }));

    const res = repartirMonto(montoPago, itemsAdaptados);
    const nuevo: Record<string, number> = {};
    for (const r of res.repartos) {
      nuevo[r.id] = r.montoAsignado;
    }
    alCambiar(nuevo);
  };

  const handleToggle = (item: ItemCobrableParaReparto, checked: boolean) => {
    const nuevo = { ...valores };
    if (!checked) {
      delete nuevo[item.id];
    } else {
      const asignadoActual = Object.values(nuevo).reduce((a, b) => a + b, 0);
      const disponible = Math.max(0, montoPago - asignadoActual);
      nuevo[item.id] = Math.min(item.saldo, disponible);
    }
    alCambiar(nuevo);
  };

  const handleMontoChange = (item: ItemCobrableParaReparto, valorTexto: string) => {
    const nuevo = { ...valores };
    const num = parseInt(valorTexto.replace(/\D/g, ""), 10);
    if (isNaN(num) || num <= 0) {
      delete nuevo[item.id];
    } else {
      nuevo[item.id] = Math.min(num, item.saldo);
    }
    alCambiar(nuevo);
  };

  const totalAsignado = Object.values(valores).reduce((a, b) => a + b, 0);
  const totalPorAsignar = Math.max(0, montoPago - totalAsignado);
  const sobrepasado = totalAsignado > montoPago;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-texto">Reparto del dinero</h3>
        <button
          type="button"
          onClick={aplicarRepartoAutomatico}
          className="text-xs text-acento font-medium hover:underline cursor-pointer"
        >
          Repartir automáticamente (FIFO)
        </button>
      </div>

      {items.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-borde bg-superficie/30 text-center text-xs text-texto-suave">
          No hay ítems con saldo pendiente para el sujeto seleccionado. El dinero quedará como saldo por asignar.
        </div>
      ) : (
        <div className="divide-y divide-borde/50 border border-borde rounded-2xl bg-superficie/40 overflow-hidden">
          {items.map((it) => {
            const estaAsignado = (valores[it.id] ?? 0) > 0;
            const montoAsignado = valores[it.id] ?? 0;

            return (
              <div
                key={it.id}
                className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                  estaAsignado ? "bg-superficie" : "hover:bg-superficie/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox
                    id={`check_${it.id}`}
                    checked={estaAsignado}
                    onCheckedChange={(checked) => handleToggle(it, Boolean(checked))}
                  />
                  <div className="min-w-0">
                    <label
                      htmlFor={`check_${it.id}`}
                      className="text-sm font-medium text-texto block truncate cursor-pointer"
                    >
                      {it.nombre}
                    </label>
                    <p className="text-xs text-texto-suave truncate">
                      {it.sujeto} · Saldo: {formatearMonto(it.saldo)}
                    </p>
                  </div>
                </div>

                <div className="w-28 shrink-0">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="$0"
                    value={montoAsignado > 0 ? `$${montoAsignado.toLocaleString("es-CL")}` : ""}
                    onChange={(e) => handleMontoChange(it, e.target.value)}
                    className="text-right text-xs font-semibold h-8"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resumen del reparto */}
      <div
        className={`p-3.5 rounded-xl border text-xs flex items-center justify-between font-medium ${
          sobrepasado
            ? "bg-problema-fondo text-gasto border-gasto"
            : "bg-superficie border-borde text-texto"
        }`}
      >
        <span>
          Asignado: <strong className="font-bold">{formatearMonto(totalAsignado)}</strong>
        </span>
        <span>
          Por asignar:{" "}
          <strong
            className={`font-bold ${
              totalPorAsignar > 0 ? "text-acento" : "text-texto-suave"
            }`}
          >
            {formatearMonto(totalPorAsignar)}
          </strong>
        </span>
      </div>

      {sobrepasado && (
        <p className="text-xs text-gasto font-medium">
          El monto asignado supera el valor del pago recibido.
        </p>
      )}
    </div>
  );
}
