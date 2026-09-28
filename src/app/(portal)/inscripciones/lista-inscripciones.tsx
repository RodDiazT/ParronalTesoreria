"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Trophy,
  Tag,
  DollarSign,
  Clock,
  ArrowRight,
  Search,
  Filter,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EstadoItemBadge } from "@/components/app/estado-item";
import { AlertasJinete } from "@/components/app/alertas-jinete";
import { formatearMonto, formatearFecha } from "@/lib/presentacion/formato";

interface ListaInscripcionesProps {
  binomios: any[];
  resumenPruebas: any[];
  cargos: any[];
  porCobrarData: {
    porClub: Array<{
      clubId: string;
      clubNombre: string;
      items: any[];
      totalPorCobrar: number;
    }>;
    totalGeneralPorCobrar: number;
  };
  porAsignarMovimientos: any[];
  retiros: any[];
  clubes: Array<{ id: string; nombre: string }>;
  pruebas: Array<{ id: string; nombre: string }>;
  rol: string;
}

export function ListaInscripciones({
  binomios,
  resumenPruebas,
  cargos,
  porCobrarData,
  porAsignarMovimientos,
  retiros,
  clubes,
  pruebas,
  rol,
}: ListaInscripcionesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pestanaActiva = searchParams.get("pestana") || "binomios";

  const [busqueda, setBusqueda] = useState("");
  const [filtroClub, setFiltroClub] = useState("");
  const [filtroPrueba, setFiltroPrueba] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroConAlertas, setFiltroConAlertas] = useState(false);

  const cambiarPestana = (p: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pestana", p);
    router.replace(`/inscripciones?${params.toString()}`);
  };

  // Totales de cabecera
  const totalPagado = binomios.reduce((a, b) => a + b.totalPagado, 0);
  const totalPorAsignarMonto = porAsignarMovimientos.reduce(
    (a, m) => a + m.porAsignar,
    0
  );
  const totalPorCobrarMonto = porCobrarData.totalGeneralPorCobrar;

  // Filtrado de binomios
  const binomiosFiltrados = binomios.filter((b) => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const matchJinete = b.jinete.nombre.toLowerCase().includes(q);
      const matchCaballo = b.caballo.nombre.toLowerCase().includes(q);
      if (!matchJinete && !matchCaballo) return false;
    }
    if (filtroClub && b.club.id !== filtroClub) return false;
    if (filtroPrueba && !b.inscripciones.some((i: any) => i.pruebaId === filtroPrueba)) {
      return false;
    }
    if (filtroEstado && b.estadoGeneral !== filtroEstado) return false;
    if (filtroConAlertas && (!b.alertas || b.alertas.length === 0)) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Indicadores del concurso */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl border border-borde bg-superficie text-center sm:text-left">
          <span className="text-[11px] text-texto-suave font-medium block">
            Por cobrar
          </span>
          <span className="text-base sm:text-lg font-bold text-gasto">
            {formatearMonto(totalPorCobrarMonto)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-borde bg-superficie text-center sm:text-left">
          <span className="text-[11px] text-texto-suave font-medium block">
            Pagado
          </span>
          <span className="text-base sm:text-lg font-bold text-listo">
            {formatearMonto(totalPagado)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-borde bg-superficie text-center sm:text-left">
          <span className="text-[11px] text-texto-suave font-medium block">
            Por asignar
          </span>
          <span
            className={`text-base sm:text-lg font-bold ${
              totalPorAsignarMonto > 0 ? "text-acento" : "text-texto-suave"
            }`}
          >
            {formatearMonto(totalPorAsignarMonto)}
          </span>
        </div>
      </div>

      {/* 2. Pestañas táctiles (scroll horizontal en celular) */}
      <div className="flex border-b border-borde overflow-x-auto no-scrollbar gap-1">
        <button
          onClick={() => cambiarPestana("binomios")}
          className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            pestanaActiva === "binomios"
              ? "border-acento text-acento"
              : "border-transparent text-texto-suave hover:text-texto"
          }`}
        >
          Binomios ({binomios.length})
        </button>

        <button
          onClick={() => cambiarPestana("por-prueba")}
          className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            pestanaActiva === "por-prueba"
              ? "border-acento text-acento"
              : "border-transparent text-texto-suave hover:text-texto"
          }`}
        >
          Por prueba ({resumenPruebas.length})
        </button>

        <button
          onClick={() => cambiarPestana("cargos")}
          className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            pestanaActiva === "cargos"
              ? "border-acento text-acento"
              : "border-transparent text-texto-suave hover:text-texto"
          }`}
        >
          Cargos ({cargos.length})
        </button>

        <button
          onClick={() => cambiarPestana("por-cobrar")}
          className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            pestanaActiva === "por-cobrar"
              ? "border-acento text-acento"
              : "border-transparent text-texto-suave hover:text-texto"
          }`}
        >
          Por cobrar ({porCobrarData.porClub.length})
        </button>

        <button
          onClick={() => cambiarPestana("por-asignar")}
          className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            pestanaActiva === "por-asignar"
              ? "border-acento text-acento"
              : "border-transparent text-texto-suave hover:text-texto"
          }`}
        >
          Por asignar ({porAsignarMovimientos.length})
        </button>

        <button
          onClick={() => cambiarPestana("retiros")}
          className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            pestanaActiva === "retiros"
              ? "border-acento text-acento"
              : "border-transparent text-texto-suave hover:text-texto"
          }`}
        >
          Retiros ({retiros.length})
        </button>
      </div>

      {/* 3. Contenido de la pestaña Binomios */}
      {pestanaActiva === "binomios" && (
        <div className="space-y-4">
          {/* Buscador y filtros rápidos */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-texto-suave" />
              <Input
                placeholder="Buscar jinete o caballo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <select
                value={filtroClub}
                onChange={(e) => setFiltroClub(e.target.value)}
                className="h-9 rounded-xl border border-borde bg-superficie px-3 text-xs text-texto cursor-pointer"
              >
                <option value="">Todos los clubes</option>
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="h-9 rounded-xl border border-borde bg-superficie px-3 text-xs text-texto cursor-pointer"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="parcial">Parciales</option>
                <option value="pagado">Pagados</option>
              </select>

              {rol !== "observador" && (
                <button
                  type="button"
                  onClick={() => setFiltroConAlertas(!filtroConAlertas)}
                  className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                    filtroConAlertas
                      ? "border-atencion-borde bg-atencion-fondo text-atencion-texto"
                      : "border-borde bg-superficie text-texto-suave hover:text-texto"
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Con alertas</span>
                </button>
              )}
            </div>
          </div>

          {/* Tarjetas de binomios (2 líneas táctiles, UX/UI §3.7) */}
          {binomiosFiltrados.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-borde text-center text-xs text-texto-suave">
              No se encontraron binomios con los filtros seleccionados.
            </div>
          ) : (
            <div className="divide-y divide-borde/40 border border-borde rounded-2xl bg-superficie/40 overflow-hidden">
              {binomiosFiltrados.map((b) => (
                <Link
                  key={b.id}
                  href={`/inscripciones/binomios/${b.id}`}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-superficie/70 active:bg-superficie transition-colors block"
                >
                  <div className="min-w-0 flex-1">
                    {/* Línea 1: Jinete · Caballo · Saldo */}
                    <div className="flex items-center gap-2 text-sm font-bold text-texto truncate">
                      <span className="truncate">{b.jinete.nombre}</span>
                      <span className="text-texto-suave">/</span>
                      <span className="truncate text-texto-suave font-semibold">
                        {b.caballo.nombre}
                      </span>
                      {b.saldoTotal > 0 && (
                        <span className="text-gasto font-bold ml-auto shrink-0 text-xs">
                          Saldo: {formatearMonto(b.saldoTotal)}
                        </span>
                      )}
                    </div>

                    {/* Línea 2: Club · N pruebas · Chip estado */}
                    <div className="flex items-center gap-2 text-xs text-texto-suave mt-1">
                      <span className="truncate">{b.club.nombre}</span>
                      <span>·</span>
                      <span>{b.cantidadPruebas} prueba(s)</span>
                      <div className="ml-auto shrink-0 flex items-center gap-1.5">
                        {b.alertas && b.alertas.length > 0 && (
                          <span className="h-2 w-2 rounded-full bg-atencion-texto" />
                        )}
                        <EstadoItemBadge
                          estado={b.estadoGeneral}
                          monto={b.totalMonto}
                          saldo={b.saldoTotal}
                          porValidar={b.porValidar}
                        />
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-texto-suave shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Contenido Pestaña Por Prueba */}
      {pestanaActiva === "por-prueba" && (
        <div className="space-y-3">
          {resumenPruebas.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl border border-borde bg-superficie/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-texto">{p.nombre}</h4>
                  <p className="text-xs text-texto-suave">
                    Tarifa: {formatearMonto(p.tarifaClp)} · {p.totalInscritos} inscrito(s)
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-texto-suave block">Recaudado:</span>
                  <span className="font-bold text-listo">
                    {formatearMonto(p.pagadoTotal)}
                  </span>
                </div>
              </div>

              {p.saldoTotal > 0 && (
                <div className="pt-2 border-t border-borde/40 flex items-center justify-between text-xs">
                  <span className="text-texto-suave">Pendiente por cobrar:</span>
                  <span className="font-semibold text-gasto">
                    {formatearMonto(p.saldoTotal)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 5. Contenido Pestaña Cargos */}
      {pestanaActiva === "cargos" && (
        <div className="divide-y divide-borde/40 border border-borde rounded-2xl bg-superficie/40 overflow-hidden">
          {cargos.length === 0 ? (
            <div className="p-8 text-center text-xs text-texto-suave">
              No hay cargos adicionales registrados en este evento.
            </div>
          ) : (
            cargos.map((c) => {
              let sujeto = "";
              if (c.binomio) sujeto = `${c.binomio.jinete.nombre} / ${c.binomio.caballo.nombre}`;
              else if (c.jinete) sujeto = c.jinete.nombre;
              else if (c.club) sujeto = c.club.nombre;

              return (
                <div
                  key={c.id}
                  className="p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-texto block truncate">
                      {c.concepto.nombre} {c.cantidad > 1 ? `(x${c.cantidad})` : ""}
                    </span>
                    <span className="text-texto-suave truncate block">
                      {sujeto} · Total: {formatearMonto(c.calculo.monto)}
                    </span>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <EstadoItemBadge
                      estado={c.calculo.estado}
                      monto={c.calculo.monto}
                      saldo={c.calculo.saldo}
                      porValidar={c.calculo.porValidar}
                      becado={c.calculo.becado}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. Contenido Pestaña Por Cobrar */}
      {pestanaActiva === "por-cobrar" && (
        <div className="space-y-4">
          {porCobrarData.porClub.length === 0 ? (
            <div className="p-8 rounded-2xl border border-borde text-center text-xs text-texto-suave">
              ¡No hay saldos pendientes por cobrar! Todo el evento está al día.
            </div>
          ) : (
            porCobrarData.porClub.map((club) => (
              <div
                key={club.clubId}
                className="p-4 rounded-2xl border border-borde bg-superficie/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-texto">{club.clubNombre}</h4>
                  <span className="text-xs font-bold text-gasto">
                    Total: {formatearMonto(club.totalPorCobrar)}
                  </span>
                </div>

                <div className="divide-y divide-borde/40 border border-borde rounded-xl bg-superficie/40 overflow-hidden text-xs">
                  {club.items.map((it) => (
                    <div
                      key={it.id}
                      className="p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-texto block truncate">
                          {it.sujeto} — {it.nombre}
                        </span>
                      </div>
                      <span className="font-semibold text-gasto shrink-0">
                        {formatearMonto(it.saldo)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 7. Contenido Pestaña Por Asignar */}
      {pestanaActiva === "por-asignar" && (
        <div className="space-y-3">
          {porAsignarMovimientos.length === 0 ? (
            <div className="p-8 rounded-2xl border border-borde text-center text-xs text-texto-suave">
              No hay transferencias ni ingresos con saldo pendiente por asignar.
            </div>
          ) : (
            porAsignarMovimientos.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl border border-borde bg-superficie flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-texto text-sm block">
                    {formatearMonto(m.porAsignar)} por asignar
                  </span>
                  <span className="text-texto-suave">
                    Ingreso total {formatearMonto(m.montoTotal)} · {formatearFecha(m.fecha)}
                    {m.nombreOrigen && ` · ${m.nombreOrigen}`}
                  </span>
                </div>

                <Link href={`/inscripciones/movimientos/${m.id}/asignar`}>
                  <Button size="sm" className="text-xs h-8">
                    Asignar
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* 8. Contenido Pestaña Retiros */}
      {pestanaActiva === "retiros" && (
        <div className="divide-y divide-borde/40 border border-borde rounded-2xl bg-superficie/40 overflow-hidden">
          {retiros.length === 0 ? (
            <div className="p-8 text-center text-xs text-texto-suave">
              No hay retiros registrados en este evento.
            </div>
          ) : (
            retiros.map((r) => (
              <div
                key={r.id}
                className="p-3.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-texto block truncate">
                    {r.sujeto} — {r.titulo}
                  </span>
                  <span className="text-texto-suave block">
                    Pagado {formatearMonto(r.pagado)} · Devuelto {formatearMonto(r.devuelto)} · Retenido{" "}
                    <strong className="text-texto">{formatearMonto(r.retenido)}</strong>
                  </span>
                  {r.motivo && (
                    <span className="text-[11px] text-texto-suave italic block mt-0.5">
                      Motivo: {r.motivo}
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-texto-suave bg-borde px-2 py-0.5 rounded-full shrink-0">
                  Retirado
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
