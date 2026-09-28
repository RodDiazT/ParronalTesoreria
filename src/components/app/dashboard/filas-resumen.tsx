"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, HelpCircle, ArrowUpRight } from "lucide-react";
import { IndicadoresDashboard } from "@/dominio/dashboard/calculos";
import { Monto } from "@/components/app/monto";
import { Sheet } from "@/components/ui/sheet";

interface FilasResumenProps {
  indicadores: IndicadoresDashboard;
}

export function FilasResumen({ indicadores }: FilasResumenProps) {
  const [hojaPorCobrar, setHojaPorCobrar] = useState(false);
  const [hojaPorPagar, setHojaPorPagar] = useState(false);
  const [ayudaResultado, setAyudaResultado] = useState(false);

  return (
    <div className="rounded-2xl border border-borde bg-superficie divide-y divide-borde/40 shadow-xs">
      {/* 1. Por Cobrar */}
      <button
        onClick={() => setHojaPorCobrar(true)}
        className="w-full flex items-center justify-between p-4 hover:bg-fondo/60 transition-colors text-left group cursor-pointer"
      >
        <span className="text-sm font-medium text-texto">Por cobrar</span>
        <div className="flex items-center gap-2">
          <Monto valor={indicadores.porCobrar.total} tipo="neutro" className="text-sm font-bold" />
          <ChevronRight className="h-4 w-4 text-texto-suave group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      {/* 2. Por Pagar */}
      <button
        onClick={() => setHojaPorPagar(true)}
        className="w-full flex items-center justify-between p-4 hover:bg-fondo/60 transition-colors text-left group cursor-pointer"
      >
        <span className="text-sm font-medium text-texto">Por pagar</span>
        <div className="flex items-center gap-2">
          <Monto valor={indicadores.porPagar.total} tipo="neutro" className="text-sm font-bold" />
          <ChevronRight className="h-4 w-4 text-texto-suave group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      {/* 3. Resultado Proyectado */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-texto">Resultado proyectado</span>
          <button
            type="button"
            onClick={() => setAyudaResultado(true)}
            className="text-texto-suave hover:text-texto cursor-pointer"
            title="Ver explicación del resultado proyectado"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
        <div>
          <Monto
            valor={indicadores.resultadoProyectado}
            tipo="neutro"
            className="text-sm font-bold"
          />
        </div>
      </div>

      {/* Hoja Desglose Por Cobrar */}
      <Sheet
        abierta={hojaPorCobrar}
        alCerrar={() => setHojaPorCobrar(false)}
        posicion="abajo"
        titulo="Desglose Por Cobrar"
        descripcion="Ingresos y recaudación pendiente de cobro"
      >
        <div className="space-y-3 py-2">
          <Link
            href="/inscripciones?pestana=por-cobrar"
            onClick={() => setHojaPorCobrar(false)}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-borde bg-fondo hover:border-acento transition-colors cursor-pointer"
          >
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-texto">Inscripciones y cargos</span>
              <p className="text-xs text-texto-suave">Pruebas, cuotas y servicios de binomios</p>
            </div>
            <div className="flex items-center gap-2">
              <Monto valor={indicadores.porCobrar.inscripciones} tipo="neutro" className="font-bold" />
              <ArrowUpRight className="h-4 w-4 text-texto-suave" />
            </div>
          </Link>

          <Link
            href="/movimientos?pestana=por-cobrar"
            onClick={() => setHojaPorCobrar(false)}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-borde bg-fondo hover:border-acento transition-colors cursor-pointer"
          >
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-texto">Otros ingresos</span>
              <p className="text-xs text-texto-suave">Auspicios comprometidos u otros fondos</p>
            </div>
            <div className="flex items-center gap-2">
              <Monto valor={indicadores.porCobrar.otros} tipo="neutro" className="font-bold" />
              <ArrowUpRight className="h-4 w-4 text-texto-suave" />
            </div>
          </Link>
        </div>
      </Sheet>

      {/* Hoja Desglose Por Pagar */}
      <Sheet
        abierta={hojaPorPagar}
        alCerrar={() => setHojaPorPagar(false)}
        posicion="abajo"
        titulo="Desglose Por Pagar"
        descripcion="Compromisos y deudas de la comisión"
      >
        <div className="space-y-3 py-2">
          <Link
            href="/movimientos?pestana=por-pagar"
            onClick={() => setHojaPorPagar(false)}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-borde bg-fondo hover:border-acento transition-colors cursor-pointer"
          >
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-texto">A proveedores</span>
              <p className="text-xs text-texto-suave">Facturas y servicios externos pendientes</p>
            </div>
            <div className="flex items-center gap-2">
              <Monto valor={indicadores.porPagar.proveedores} tipo="neutro" className="font-bold" />
              <ArrowUpRight className="h-4 w-4 text-texto-suave" />
            </div>
          </Link>

          <Link
            href="/movimientos?pestana=por-pagar"
            onClick={() => setHojaPorPagar(false)}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-borde bg-fondo hover:border-acento transition-colors cursor-pointer"
          >
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-texto">A la comisión (Reembolsos)</span>
              <p className="text-xs text-texto-suave">Gastos personales asumidos por miembros</p>
            </div>
            <div className="flex items-center gap-2">
              <Monto valor={indicadores.porPagar.comision} tipo="neutro" className="font-bold" />
              <ArrowUpRight className="h-4 w-4 text-texto-suave" />
            </div>
          </Link>
        </div>
      </Sheet>

      {/* Hoja Explicación Resultado Proyectado */}
      <Sheet
        abierta={ayudaResultado}
        alCerrar={() => setAyudaResultado(false)}
        posicion="abajo"
        titulo="Resultado Proyectado"
        descripcion="Fórmula de cálculo financiero"
      >
        <div className="space-y-3 py-2 text-sm text-texto leading-relaxed">
          <div className="rounded-2xl bg-fondo p-4 border border-borde space-y-2">
            <p className="text-xs font-semibold uppercase text-texto-suave">Fórmula</p>
            <p className="font-mono text-xs">
              Saldo de caja + Por cobrar − Por pagar
            </p>
          </div>

          <p className="text-xs text-texto-suave">
            Representa los fondos estimados que quedarían en la tesorería si se cobra
            el 100% de lo comprometido y se cancela la totalidad de los compromisos pendientes.
          </p>
        </div>
      </Sheet>
    </div>
  );
}
