"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowUpRight, Clock, DollarSign, Package } from "lucide-react";
import { IndicadoresDashboard } from "@/dominio/dashboard/calculos";
import { Monto } from "@/components/app/monto";
import { Rol } from "@prisma/client";

interface DetalleDashboardProps {
  indicadores: IndicadoresDashboard;
  rol: Rol;
}

export function DetalleDashboard({ indicadores, rol }: DetalleDashboardProps) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem("preferencia_detalle_dashboard");
      if (guardado === "true") {
        setAbierto(true);
      }
    } catch {
      // Ignorar si no hay soporte de storage
    }
  }, []);

  const handleToggle = () => {
    const nuevo = !abierto;
    setAbierto(nuevo);
    try {
      localStorage.setItem("preferencia_detalle_dashboard", String(nuevo));
    } catch {
      // Ignorar
    }
  };

  const enlaceValidar =
    rol === "administrador"
      ? "/movimientos/validar"
      : "/movimientos?pestana=por-validar";

  return (
    <div className="space-y-3">
      {/* Botón Toggle */}
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full py-2 px-1 text-xs font-bold text-texto uppercase tracking-wider hover:text-acento transition-colors cursor-pointer select-none"
      >
        <span>Ver detalle</span>
        {abierto ? (
          <ChevronUp className="h-4 w-4 text-texto-suave" />
        ) : (
          <ChevronDown className="h-4 w-4 text-texto-suave" />
        )}
      </button>

      {/* Contenido Plegado */}
      {abierto && (
        <div className="space-y-4">
          {/* Ingresos percibidos y Gastos pagados */}
          <div className="rounded-2xl border border-borde bg-superficie divide-y divide-borde/40 overflow-hidden shadow-xs">
            {/* Ingresos percibidos */}
            <Link
              href="/movimientos?tipo=ingreso&estadoPago=pagado&validacion=validado"
              className="flex items-center justify-between p-4 hover:bg-fondo/60 transition-colors group cursor-pointer"
            >
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-texto">Ingresos percibidos</span>
                {indicadores.aporteInicial > 0 && (
                  <p className="text-xs text-texto-suave">
                    de lo cual, aporte inicial{" "}
                    <span className="font-semibold text-texto">
                      ${indicadores.aporteInicial.toLocaleString("es-CL")}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Monto valor={indicadores.ingresosPercibidos} tipo="neutro" className="text-sm font-bold" />
                <ArrowUpRight className="h-4 w-4 text-texto-suave group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* Gastos pagados */}
            <Link
              href="/movimientos?tipo=gasto&estadoPago=pagado&validacion=validado"
              className="flex items-center justify-between p-4 hover:bg-fondo/60 transition-colors group cursor-pointer"
            >
              <span className="text-sm font-medium text-texto">Gastos pagados</span>
              <div className="flex items-center gap-2">
                <Monto valor={indicadores.gastosPagados} tipo="neutro" className="text-sm font-bold" />
                <ArrowUpRight className="h-4 w-4 text-texto-suave group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>

          {/* Sublista gris: Aparte, no suma a la caja */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-texto-suave uppercase tracking-wider px-1">
              Aparte (no suma a la caja)
            </span>

            <div className="rounded-2xl border border-borde/60 bg-fondo/80 divide-y divide-borde/30 overflow-hidden text-xs">
              {/* Por validar */}
              <Link
                href={enlaceValidar}
                className="flex items-center justify-between p-3.5 hover:bg-superficie/60 transition-colors group cursor-pointer"
              >
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5 font-medium text-texto">
                    <Clock className="h-3.5 w-3.5 text-texto-suave" />
                    <span>
                      Por validar ({indicadores.porValidar.cantidad}{" "}
                      {indicadores.porValidar.cantidad === 1 ? "movimiento" : "movimientos"})
                    </span>
                  </div>
                  <p className="text-[11px] text-texto-suave">
                    No suma en los totales hasta que se valide
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Monto valor={indicadores.porValidar.monto} tipo="neutro" className="font-semibold text-texto-suave" />
                  <ArrowUpRight className="h-3.5 w-3.5 text-texto-suave" />
                </div>
              </Link>

              {/* Por asignar (oculto en $0) */}
              {indicadores.porAsignar > 0 && (
                <Link
                  href="/inscripciones?pestana=por-asignar"
                  className="flex items-center justify-between p-3.5 hover:bg-superficie/60 transition-colors group cursor-pointer"
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-1.5 font-medium text-texto">
                      <DollarSign className="h-3.5 w-3.5 text-texto-suave" />
                      <span>Por asignar</span>
                    </div>
                    <p className="text-[11px] text-texto-suave">
                      Ingresos de inscripción pendientes de vincular
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Monto valor={indicadores.porAsignar} tipo="neutro" className="font-semibold text-texto-suave" />
                    <ArrowUpRight className="h-3.5 w-3.5 text-texto-suave" />
                  </div>
                </Link>
              )}

              {/* En especie (oculto en $0) */}
              {indicadores.especie.total > 0 && (
                <Link
                  href="/movimientos?naturaleza=especie"
                  className="flex items-center justify-between p-3.5 hover:bg-superficie/60 transition-colors group cursor-pointer"
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-1.5 font-medium text-texto">
                      <Package className="h-3.5 w-3.5 text-texto-suave" />
                      <span>En especie</span>
                    </div>
                    {indicadores.especie.comprometido > 0 && (
                      <p className="text-[11px] text-texto-suave">
                        de lo cual comprometido{" "}
                        <span className="font-medium text-texto">
                          ${indicadores.especie.comprometido.toLocaleString("es-CL")}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Monto valor={indicadores.especie.total} tipo="neutro" className="font-semibold text-texto-suave" />
                    <ArrowUpRight className="h-3.5 w-3.5 text-texto-suave" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
