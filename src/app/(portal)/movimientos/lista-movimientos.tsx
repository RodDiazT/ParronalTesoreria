"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Filter,
  Plus,
  ChevronDown,
  ChevronUp,
  Receipt,
  Search,
  X,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Monto } from "@/components/app/monto";
import { Fecha } from "@/components/app/fecha";
import { Estado } from "@/components/app/estado";

interface ListaMovimientosProps {
  movimientos: any[];
  totales: {
    totalIngresosClp: number;
    totalGastosClp: number;
    saldoCajaClp: number;
    totalPorValidarClp: number;
    totalEspecieClp: number;
  };
  categorias: { id: string; nombre: string; tipo: string }[];
  contrapartes: { id: string; nombre: string }[];
  pestanaActual: string;
  filtrosActuales: {
    tipo?: string;
    categoriaId?: string;
    contraparteId?: string;
    medioPago?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    mostrarAnulados?: boolean;
    soloMios?: boolean;
    caballoId?: string;
    jineteId?: string;
    clubId?: string;
    binomioId?: string;
  };
  usuarioActual: {
    id: string;
    rol: string;
  };
}

export function ListaMovimientos({
  movimientos,
  totales,
  categorias,
  contrapartes,
  pestanaActual,
  filtrosActuales,
  usuarioActual,
}: ListaMovimientosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mostrarTotalesDetalle, setMostrarTotalesDetalle] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Filtros locales
  const [tipo, setTipo] = useState(filtrosActuales.tipo || "");
  const [categoriaId, setCategoriaId] = useState(filtrosActuales.categoriaId || "");
  const [contraparteId, setContraparteId] = useState(filtrosActuales.contraparteId || "");
  const [medioPago, setMedioPago] = useState(filtrosActuales.medioPago || "");
  const [fechaDesde, setFechaDesde] = useState(filtrosActuales.fechaDesde || "");
  const [fechaHasta, setFechaHasta] = useState(filtrosActuales.fechaHasta || "");
  const [mostrarAnulados, setMostrarAnulados] = useState(filtrosActuales.mostrarAnulados || false);
  const [soloMios, setSoloMios] = useState(filtrosActuales.soloMios || false);

  const cambiarPestana = (nuevaPestana: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nuevaPestana === "todos") {
      params.delete("pestana");
    } else {
      params.set("pestana", nuevaPestana);
    }
    router.push(`/movimientos?${params.toString()}`);
  };

  const aplicarFiltros = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (tipo) params.set("tipo", tipo);
    else params.delete("tipo");

    if (categoriaId) params.set("categoriaId", categoriaId);
    else params.delete("categoriaId");

    if (contraparteId) params.set("contraparteId", contraparteId);
    else params.delete("contraparteId");

    if (medioPago) params.set("medioPago", medioPago);
    else params.delete("medioPago");

    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    else params.delete("fechaDesde");

    if (fechaHasta) params.set("fechaHasta", fechaHasta);
    else params.delete("fechaHasta");

    if (mostrarAnulados) params.set("mostrarAnulados", "true");
    else params.delete("mostrarAnulados");

    if (soloMios) params.set("soloMios", "true");
    else params.delete("soloMios");

    router.push(`/movimientos?${params.toString()}`);
    setMostrarFiltros(false);
  };

  const limpiarFiltros = () => {
    setTipo("");
    setCategoriaId("");
    setContraparteId("");
    setMedioPago("");
    setFechaDesde("");
    setFechaHasta("");
    setMostrarAnulados(false);
    setSoloMios(false);

    const params = new URLSearchParams();
    if (pestanaActual !== "todos") {
      params.set("pestana", pestanaActual);
    }
    router.push(`/movimientos?${params.toString()}`);
    setMostrarFiltros(false);
  };

  const obtenerEstadoVisual = (mov: any) => {
    if (mov.anulado) return "anulado";
    if (mov.estadoValidacion === "observado") return "observado";
    if (mov.estadoValidacion === "por_validar") return "por_validar";
    if (mov.estadoPago === "pendiente") {
      return mov.tipo === "ingreso" ? "por_cobrar" : "por_pagar";
    }
    if (mov.naturaleza === "especie") return "en_especie";
    return "validado";
  };

  const pestanasPrincipales = [
    { id: "todos", label: "Todos" },
    { id: "por_validar", label: "Por validar" },
    { id: "observados", label: "Observados" },
  ];

  const pestanasSecundarias = [
    { id: "por_cobrar", label: "Por cobrar" },
    { id: "por_pagar", label: "Por pagar" },
    { id: "sin_respaldo", label: "Sin respaldo" },
    { id: "sin_identificar", label: "Sin identificar" },
  ];

  const hayFiltrosActivos = Boolean(
    filtrosActuales.tipo ||
      filtrosActuales.categoriaId ||
      filtrosActuales.contraparteId ||
      filtrosActuales.medioPago ||
      filtrosActuales.fechaDesde ||
      filtrosActuales.fechaHasta ||
      filtrosActuales.mostrarAnulados ||
      filtrosActuales.soloMios
  );

  return (
    <div className="space-y-4">
      {/* Encabezado con título y botón de registro rápido */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-700" />
          Movimientos de Tesorería
        </h1>
        <Link href="/movimientos/nuevo">
          <Button className="h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-3.5 text-xs shadow-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Registrar</span>
          </Button>
        </Link>
      </div>

      {/* Franja de Totales desplegable (UX/UI §3.7) */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs shadow-xs">
        <button
          type="button"
          onClick={() => setMostrarTotalesDetalle(!mostrarTotalesDetalle)}
          className="flex items-center justify-between w-full font-medium text-stone-800 text-left"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Saldo de caja:{" "}
              <strong className="text-emerald-800 font-bold tabular-nums">
                ${totales.saldoCajaClp.toLocaleString("es-CL")}
              </strong>
            </span>
            <span className="text-stone-300">|</span>
            <span className="text-stone-600">
              Ingresos:{" "}
              <span className="text-emerald-700 font-semibold tabular-nums">
                +${totales.totalIngresosClp.toLocaleString("es-CL")}
              </span>
            </span>
            <span className="text-stone-300">|</span>
            <span className="text-stone-600">
              Gastos:{" "}
              <span className="text-rose-700 font-semibold tabular-nums">
                -${totales.totalGastosClp.toLocaleString("es-CL")}
              </span>
            </span>
          </div>
          <span className="p-1 text-stone-400 hover:text-stone-700">
            {mostrarTotalesDetalle ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {mostrarTotalesDetalle && (
          <div className="pt-3 mt-2 border-t border-stone-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-stone-600">
            <div className="p-2 bg-white rounded border border-stone-200">
              <span className="text-stone-400 block text-[11px]">Por validar:</span>
              <span className="font-semibold text-amber-700 tabular-nums">
                ${totales.totalPorValidarClp.toLocaleString("es-CL")}
              </span>
            </div>
            <div className="p-2 bg-white rounded border border-stone-200">
              <span className="text-stone-400 block text-[11px]">En especie (estimado):</span>
              <span className="font-semibold text-stone-800 tabular-nums">
                ${totales.totalEspecieClp.toLocaleString("es-CL")}
              </span>
            </div>
            <div className="p-2 bg-white rounded border border-stone-200 col-span-2 sm:col-span-1">
              <span className="text-stone-400 block text-[11px]">Total listado:</span>
              <span className="font-semibold text-stone-800">{movimientos.length} registros</span>
            </div>
          </div>
        )}
      </div>

      {/* Pestañas de navegación responsivas */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-stone-200">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {pestanasPrincipales.map((p) => {
            const activa = pestanaActual === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => cambiarPestana(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activa
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
                }`}
              >
                {p.label}
              </button>
            );
          })}

          <div className="hidden sm:flex items-center gap-1.5">
            {pestanasSecundarias.map((p) => {
              const activa = pestanaActual === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => cambiarPestana(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    activa
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* En móvil selector compacto para estados secundarios */}
        <div className="sm:hidden shrink-0">
          <select
            value={pestanasSecundarias.some((p) => p.id === pestanaActual) ? pestanaActual : ""}
            aria-label="Más estados"
            onChange={(e) => {
              if (e.target.value) cambiarPestana(e.target.value);
            }}
            className={`h-7 px-2 rounded-lg text-xs font-semibold border transition-colors ${
              pestanasSecundarias.some((p) => p.id === pestanaActual)
                ? "bg-emerald-50 border-emerald-600 text-emerald-800"
                : "bg-stone-100 border-stone-200 text-stone-600"
            }`}
          >
            <option value="" disabled>
              + Más estados
            </option>
            {pestanasSecundarias.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Barra de herramientas / Botón Filtros */}
      <div className="flex items-center justify-between text-xs">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className={`h-8 gap-1.5 ${
            hayFiltrosActivos ? "border-emerald-600 text-emerald-800 bg-emerald-50" : ""
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filtros</span>
          {hayFiltrosActivos && (
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
          )}
        </Button>

        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-stone-500 hover:text-rose-600 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Panel colapsable de filtros */}
      {mostrarFiltros && (
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-[11px] text-stone-600">Tipo</Label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full h-9 rounded-lg border border-stone-300 bg-white px-2 mt-1"
              >
                <option value="">Todos los tipos</option>
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
              </select>
            </div>

            <div>
              <Label className="text-[11px] text-stone-600">Categoría</Label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full h-9 rounded-lg border border-stone-300 bg-white px-2 mt-1"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.tipo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-[11px] text-stone-600">Contraparte</Label>
              <select
                value={contraparteId}
                onChange={(e) => setContraparteId(e.target.value)}
                className="w-full h-9 rounded-lg border border-stone-300 bg-white px-2 mt-1"
              >
                <option value="">Todas las contrapartes</option>
                {contrapartes.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-[11px] text-stone-600">Medio de pago</Label>
              <select
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value)}
                className="w-full h-9 rounded-lg border border-stone-300 bg-white px-2 mt-1"
              >
                <option value="">Todos</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <Label className="text-[11px] text-stone-600">Desde</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="h-9 bg-white mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-[11px] text-stone-600">Hasta</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="h-9 bg-white mt-1 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-stone-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mostrar-anulados"
                checked={mostrarAnulados}
                onCheckedChange={(c) => setMostrarAnulados(Boolean(c))}
              />
              <Label htmlFor="mostrar-anulados" className="text-xs text-stone-700 cursor-pointer">
                Mostrar anulados
              </Label>
            </div>

            {usuarioActual.rol === "ayudante" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="solo-mios"
                  checked={soloMios}
                  onCheckedChange={(c) => setSoloMios(Boolean(c))}
                />
                <Label htmlFor="solo-mios" className="text-xs text-stone-700 cursor-pointer">
                  Solo mis registros
                </Label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setMostrarFiltros(false)}>
              Cerrar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={aplicarFiltros}
            >
              Aplicar filtros
            </Button>
          </div>
        </div>
      )}

      {/* Listado de tarjetas táctiles de dos líneas (UX/UI §3.5 y §3.7) */}
      {movimientos.length === 0 ? (
        <div className="p-8 bg-white border border-stone-200 rounded-xl text-center space-y-3">
          <FileText className="w-10 h-10 text-stone-400 mx-auto" />
          <div className="space-y-1">
            <p className="font-semibold text-stone-800 text-sm">No se encontraron movimientos</p>
            <p className="text-xs text-stone-500">
              No hay registros que coincidan con la pestaña o los filtros seleccionados.
            </p>
          </div>
          <Link href="/movimientos/nuevo">
            <Button variant="outline" size="sm" className="mt-2 text-xs">
              Registrar nuevo movimiento
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {movimientos.map((mov) => {
            const estadoClave = obtenerEstadoVisual(mov);
            const titulo =
              mov.descripcion ||
              mov.categoria?.nombre ||
              (mov.sinIdentificar ? "Ingreso sin identificar" : "Movimiento");
            const subtitulo =
              mov.contraparte?.nombre ||
              mov.categoria?.nombre ||
              (mov.sinIdentificar ? "Por clasificar" : "—");

            return (
              <Link
                key={mov.id}
                href={`/movimientos/${mov.id}`}
                className="block p-3.5 bg-white hover:bg-stone-50 rounded-xl border border-stone-200 shadow-xs transition-colors active:bg-stone-100"
              >
                {/* Línea 1: Descripción a la izquierda, Monto a la derecha */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-stone-900 text-sm truncate">{titulo}</span>
                  <div className="shrink-0 text-right">
                    <Monto
                      valor={mov.montoClp}
                      tipo={mov.tipo}
                      anulado={mov.anulado}
                      especie={mov.naturaleza === "especie"}
                      className="text-sm font-bold"
                    />
                  </div>
                </div>

                {/* Línea 2: Fecha y categoría a la izquierda, Estado visual a la derecha */}
                <div className="flex items-center justify-between gap-2 mt-1.5 text-xs text-stone-500">
                  <div className="flex items-center gap-1.5 truncate">
                    <Fecha valor={mov.fecha} />
                    <span>·</span>
                    <span className="truncate">{subtitulo}</span>
                    {mov.binomio ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {mov.binomio.jinete && mov.binomio.caballo
                          ? `${mov.binomio.jinete.nombre} / ${mov.binomio.caballo.nombre}`
                          : "Binomio"}
                      </span>
                    ) : (
                      <>
                        {mov.caballo && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                            {mov.caballo.nombre}
                          </span>
                        )}
                        {mov.jinete && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                            {mov.jinete.nombre}
                          </span>
                        )}
                        {mov.club && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                            {mov.club.nombre}
                          </span>
                        )}
                      </>
                    )}
                    {mov.prueba && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {mov.prueba.nombre}
                      </span>
                    )}
                    {mov.sinRespaldo && (
                      <span className="text-amber-700 font-medium">· Sin respaldo</span>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Estado estado={estadoClave} entidad="movimiento" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
