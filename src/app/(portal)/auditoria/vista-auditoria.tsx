"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  History,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VistaAuditoriaProps {
  registros: any[];
  usuarios: { id: string; nombre: string | null; correo: string }[];
  filtrosActuales: {
    usuarioId?: string;
    entidad?: string;
    accion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  };
}

export function VistaAuditoria({
  registros,
  usuarios,
  filtrosActuales,
}: VistaAuditoriaProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filaExpandida, setFilaExpandida] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const [usuarioId, setUsuarioId] = useState(filtrosActuales.usuarioId || "");
  const [entidad, setEntidad] = useState(filtrosActuales.entidad || "");
  const [accion, setAccion] = useState(filtrosActuales.accion || "");
  const [fechaDesde, setFechaDesde] = useState(filtrosActuales.fechaDesde || "");
  const [fechaHasta, setFechaHasta] = useState(filtrosActuales.fechaHasta || "");

  const aplicarFiltros = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (usuarioId) params.set("usuarioId", usuarioId);
    else params.delete("usuarioId");

    if (entidad) params.set("entidad", entidad);
    else params.delete("entidad");

    if (accion) params.set("accion", accion);
    else params.delete("accion");

    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    else params.delete("fechaDesde");

    if (fechaHasta) params.set("fechaHasta", fechaHasta);
    else params.delete("fechaHasta");

    router.push(`/auditoria?${params.toString()}`);
    setMostrarFiltros(false);
  };

  const limpiarFiltros = () => {
    setUsuarioId("");
    setEntidad("");
    setAccion("");
    setFechaDesde("");
    setFechaHasta("");
    router.push("/auditoria");
    setMostrarFiltros(false);
  };

  const hayFiltros = Boolean(
    filtrosActuales.usuarioId ||
      filtrosActuales.entidad ||
      filtrosActuales.accion ||
      filtrosActuales.fechaDesde ||
      filtrosActuales.fechaHasta
  );

  const entidadesComunes = [
    "Movimiento",
    "Respaldo",
    "Membresia",
    "Usuario",
    "Contraparte",
    "Categoria",
    "Evento",
    "Organizacion",
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-700" />
            Registro de Auditoría
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Trazabilidad inmutable de todas las acciones del evento y la organización.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className={`h-9 text-xs gap-1.5 ${
            hayFiltros ? "border-emerald-600 bg-emerald-50 text-emerald-800" : ""
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filtros</span>
          {hayFiltros && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
        </Button>
      </div>

      {mostrarFiltros && (
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-[11px] text-stone-600">Usuario</Label>
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                className="w-full h-9 rounded-lg border border-stone-300 bg-white px-2 mt-1"
              >
                <option value="">Todos los usuarios</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre || u.correo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-[11px] text-stone-600">Entidad</Label>
              <select
                value={entidad}
                onChange={(e) => setEntidad(e.target.value)}
                className="w-full h-9 rounded-lg border border-stone-300 bg-white px-2 mt-1"
              >
                <option value="">Todas las entidades</option>
                {entidadesComunes.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-[11px] text-stone-600">Acción</Label>
              <Input
                type="text"
                value={accion}
                onChange={(e) => setAccion(e.target.value)}
                placeholder="Ej: crear, validar..."
                className="h-9 bg-white mt-1 text-xs"
              />
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

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
            {hayFiltros && (
              <Button type="button" variant="ghost" size="sm" onClick={limpiarFiltros} className="text-xs">
                Limpiar
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
              onClick={aplicarFiltros}
            >
              Aplicar filtros
            </Button>
          </div>
        </div>
      )}

      {/* Lista de Registros de Auditoría */}
      {registros.length === 0 ? (
        <div className="p-8 bg-white border border-stone-200 rounded-xl text-center space-y-2">
          <History className="w-8 h-8 text-stone-400 mx-auto" />
          <p className="text-sm font-semibold text-stone-800">No se encontraron eventos</p>
          <p className="text-xs text-stone-500">
            Prueba ajustando los filtros de fecha o entidad.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {registros.map((r) => {
            const estaExpandida = filaExpandida === r.id;

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden text-xs"
              >
                <div
                  onClick={() => setFilaExpandida(estaExpandida ? null : r.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 capitalize">
                        {r.accion.replace(/_/g, " ")}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-medium text-[11px]">
                        {r.entidad}
                      </span>
                    </div>
                    <p className="text-stone-500">
                      Por <strong>{r.usuario?.nombre || r.usuario?.correo}</strong> ·{" "}
                      {new Date(r.creadoEn).toLocaleString("es-CL")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-stone-400">
                    {r.entidad === "Movimiento" && (
                      <Link
                        href={`/movimientos/${r.entidadId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:text-emerald-700"
                        title="Ir al movimiento"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                    {estaExpandida ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Detalle expandido con Antes y Después */}
                {estaExpandida && (
                  <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                      {r.antes && (
                        <div className="p-2.5 bg-white rounded border border-stone-200 space-y-1">
                          <span className="font-sans font-bold text-stone-500 block text-[10px] uppercase">
                            Estado previo (Antes):
                          </span>
                          <pre className="overflow-x-auto text-stone-700 whitespace-pre-wrap">
                            {JSON.stringify(r.antes, null, 2)}
                          </pre>
                        </div>
                      )}

                      {r.despues && (
                        <div className="p-2.5 bg-white rounded border border-stone-200 space-y-1">
                          <span className="font-sans font-bold text-stone-500 block text-[10px] uppercase">
                            Estado aplicado (Después):
                          </span>
                          <pre className="overflow-x-auto text-stone-700 whitespace-pre-wrap">
                            {JSON.stringify(r.despues, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-stone-400">
                      Entidad ID: <code>{r.entidadId}</code>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
