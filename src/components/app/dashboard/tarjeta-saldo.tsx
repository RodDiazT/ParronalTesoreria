"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, ArrowRight, AlertTriangle, ArrowLeftRight } from "lucide-react";
import { SaldoPorMedio } from "@/dominio/dashboard/calculos";
import { Monto } from "@/components/app/monto";
import { formatearMonto } from "@/lib/presentacion/formato";

interface TarjetaSaldoProps {
  saldoCaja: number;
  saldoPorMedio: SaldoPorMedio;
  horaCalculo: string;
}

export function TarjetaSaldo({
  saldoCaja,
  saldoPorMedio,
  horaCalculo,
}: TarjetaSaldoProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const hayEfectivoNegativo = saldoPorMedio.efectivo < 0;
  const hayBancoNegativo = saldoPorMedio.transferencia < 0;

  return (
    <div className="rounded-3xl border border-borde bg-superficie p-5 space-y-4 shadow-sm">
      {/* Encabezado con hora de cálculo y botón refresh */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-texto uppercase tracking-wider">
          Saldo de caja
        </span>
        <div className="flex items-center gap-1.5 text-xs text-texto-suave">
          <span>Act. {horaCalculo}</span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Recalcular indicadores"
            className="p-1 rounded-lg hover:bg-fondo text-texto-suave hover:text-texto transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-acento" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Monto Principal */}
      <div>
        <Monto
          valor={saldoCaja}
          tipo="neutro"
          className="text-3xl font-extrabold tracking-tight"
        />
      </div>

      {/* Desglose por medio de pago (Banco / Efectivo / Otro) */}
      <div className="pt-2 border-t border-borde/40 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <Link
            href="/movimientos?medioPago=transferencia&estadoPago=pagado&validacion=validado"
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl hover:bg-fondo transition-colors group cursor-pointer"
          >
            <span className="text-texto-suave group-hover:text-texto font-medium">
              Banco:
            </span>
            <span
              className={`font-bold tabular-nums ${
                hayBancoNegativo ? "text-problema" : "text-texto"
              }`}
            >
              {formatearMonto(saldoPorMedio.transferencia)}
            </span>
          </Link>

          <Link
            href="/movimientos?medioPago=efectivo&estadoPago=pagado&validacion=validado"
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl hover:bg-fondo transition-colors group cursor-pointer"
          >
            <span className="text-texto-suave group-hover:text-texto font-medium">
              Efectivo:
            </span>
            <span
              className={`font-bold tabular-nums ${
                hayEfectivoNegativo ? "text-problema" : "text-texto"
              }`}
            >
              {formatearMonto(saldoPorMedio.efectivo)}
            </span>
          </Link>

          {saldoPorMedio.otro !== 0 && (
            <Link
              href="/movimientos?medioPago=otro&estadoPago=pagado&validacion=validado"
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl hover:bg-fondo transition-colors group cursor-pointer"
            >
              <span className="text-texto-suave group-hover:text-texto font-medium">
                Otro:
              </span>
              <span className="font-bold tabular-nums text-texto">
                {formatearMonto(saldoPorMedio.otro)}
              </span>
            </Link>
          )}
        </div>

        {/* Alerta si hay saldo negativo en algún medio */}
        {(hayEfectivoNegativo || hayBancoNegativo) && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-problema-fondo border border-problema-borde text-xs text-problema-texto">
            <AlertTriangle className="h-4 w-4 shrink-0 text-problema" />
            <div className="leading-snug">
              Saldo negativo en {hayEfectivoNegativo ? "efectivo" : "banco"}.{" "}
              <Link href="/traspasos" className="underline font-semibold">
                ¿Falta registrar un traspaso?
              </Link>
            </div>
          </div>
        )}

        {/* Enlace a Traspasos */}
        <div className="flex justify-end pt-1">
          <Link
            href="/traspasos"
            className="inline-flex items-center gap-1 text-xs font-semibold text-acento hover:underline cursor-pointer"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Traspasos entre medios
            <span className="text-sm font-light">›</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
