import Link from "next/link";
import { ChevronRight, Clock, AlertTriangle, ArrowUpRight } from "lucide-react";
import { LoMioAyudante } from "@/dominio/dashboard/calculos";
import { formatearMonto } from "@/lib/presentacion/formato";
import { Monto } from "@/components/app/monto";

interface BloqueLoMioProps {
  loMio: LoMioAyudante;
}

/**
 * Bloque 1 del Ayudante: Pendientes propios 'Lo mío'.
 * (docs/dashboard/dashboard.md §3.6 y docs/interfaz/ux-ui.md §3.4)
 */
export function BloqueLoMio({ loMio }: BloqueLoMioProps) {
  const tienePorValidar = loMio.porValidar.cantidad > 0;
  const tieneObservados = loMio.observados.length > 0;
  const tieneReembolsos = loMio.reembolsosPendientes > 0;

  const sinPendientes = !tienePorValidar && !tieneObservados && !tieneReembolsos;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-texto uppercase tracking-wider px-1">
        Lo mío
      </h3>

      {sinPendientes ? (
        <div className="rounded-2xl border border-borde bg-superficie p-4 text-center">
          <p className="text-xs text-texto-suave">No tienes nada pendiente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Fila por validar y reembolsos */}
          <div className="rounded-2xl border border-borde bg-superficie overflow-hidden divide-y divide-borde/40 shadow-xs">
            {tienePorValidar && (
              <Link
                href="/movimientos?pestana=por-validar&mios=1"
                className="flex items-center justify-between p-3.5 hover:bg-fondo/60 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-falta" />
                  <span className="text-xs font-medium text-texto">
                    {loMio.porValidar.cantidad === 1 ? "1 movimiento" : `${loMio.porValidar.cantidad} movimientos`} por validar
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Monto valor={loMio.porValidar.monto} tipo="neutro" className="text-xs font-bold" />
                  <ChevronRight className="h-4 w-4 text-texto-suave group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            )}

            {tieneReembolsos && (
              <Link
                href="/movimientos?pestana=por-pagar&pagadoPor=yo"
                className="flex items-center justify-between p-3.5 hover:bg-fondo/60 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-listo">💰</span>
                  <span className="text-xs font-medium text-texto">
                    Te deben reembolsar
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Monto valor={loMio.reembolsosPendientes} tipo="neutro" className="text-xs font-bold text-listo" />
                  <ChevronRight className="h-4 w-4 text-texto-suave group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            )}
          </div>

          {/* Lista de movimientos observados (destacados en naranja/rojo) */}
          {tieneObservados && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-problema uppercase tracking-wide px-1">
                Requieren tu corrección ({loMio.observados.length})
              </span>
              <div className="space-y-2">
                {loMio.observados.map((obs) => (
                  <div
                    key={obs.id}
                    className="rounded-2xl border border-problema-borde bg-problema-fondo p-3.5 space-y-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-texto">
                          {obs.descripcion || "Movimiento sin descripción"}
                        </span>
                        <div className="text-[11px] text-problema-texto font-medium">
                          Observación del tesorero: &ldquo;{obs.comentario || "Sin comentario"}&rdquo;
                        </div>
                      </div>
                      <Monto valor={obs.montoClp} tipo="neutro" className="text-xs font-bold text-texto shrink-0" />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Link
                        href={`/movimientos/${obs.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-superficie border border-problema-borde text-xs font-semibold text-problema hover:bg-problema-fondo transition-colors shadow-2xs"
                      >
                        Corregir
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
