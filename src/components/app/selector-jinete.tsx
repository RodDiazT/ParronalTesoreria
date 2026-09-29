"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Check, X, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { obtenerJinetesActivos } from "@/dominio/inscripciones/participantes/acciones";
import { normalizarBusqueda } from "@/lib/utilidades";

export interface OpcionJinete {
  id: string;
  nombre: string;
  clubId: string;
  edad?: number | null;
  clubNombre?: string;
}

interface SelectorJineteProps {
  jinetesDisponibles?: OpcionJinete[];
  jineteSeleccionadoId?: string;
  clubIdFiltro?: string;
  alSeleccionar: (jinete: {
    id: string;
    nombre: string;
    clubId: string;
    edad: number | null;
    clubNombre?: string;
  }) => void;
  alLimpiar?: () => void;
  id?: string;
  label?: string;
  requerido?: boolean;
  error?: string;
}

/**
 * Selector reutilizable de Jinete con visualización de club y edad.
 * Soporta carga directa desde el servidor (prop jinetesDisponibles) o remota.
 */
export function SelectorJinete({
  jinetesDisponibles,
  jineteSeleccionadoId,
  clubIdFiltro,
  alSeleccionar,
  alLimpiar,
  id = "selector-jinete",
  label = "Jinete / Amazona",
  requerido = false,
  error,
}: SelectorJineteProps) {
  const [todosJinetes, setTodosJinetes] = useState<
    { id: string; nombre: string; clubId: string; edad: number | null; clubNombre?: string }[]
  >([]);
  const [busqueda, setBusqueda] = useState("");
  const [desplegado, setDesplegado] = useState(false);
  const [seleccionado, setSeleccionado] = useState<{
    id: string;
    nombre: string;
    clubId: string;
    edad: number | null;
    clubNombre?: string;
  } | null>(null);

  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setDesplegado(false);
      }
    }
    document.addEventListener("mousedown", handleClickAfuera);
    return () => document.removeEventListener("mousedown", handleClickAfuera);
  }, []);

  const handleBlur = (e: React.FocusEvent) => {
    if (!contenedorRef.current?.contains(e.relatedTarget as Node)) {
      setDesplegado(false);
    }
  };

  // Carga y sincronización de jinetes disponibles
  useEffect(() => {
    if (jinetesDisponibles) {
      const normalizados = jinetesDisponibles.map((j) => ({
        ...j,
        edad: j.edad ?? null,
      }));
      setTodosJinetes(normalizados);
      return;
    }

    obtenerJinetesActivos()
      .then((datos) => {
        setTodosJinetes(datos as any);
      })
      .catch((err) => {
        console.error("Error al cargar jinetes:", err);
      });
  }, [jinetesDisponibles]);

  // Sincronización inmediata de seleccionado al cambiar jineteSeleccionadoId o la lista
  useEffect(() => {
    if (!jineteSeleccionadoId) {
      setSeleccionado(null);
      return;
    }

    const fuente = jinetesDisponibles && jinetesDisponibles.length > 0 ? jinetesDisponibles : todosJinetes;
    const found = fuente.find((j) => j.id === jineteSeleccionadoId);
    if (found) {
      setSeleccionado({
        ...found,
        edad: found.edad ?? null,
      });
    }
  }, [jineteSeleccionadoId, jinetesDisponibles, todosJinetes]);

  const filtrados = todosJinetes.filter((j) => {
    if (clubIdFiltro && j.clubId !== clubIdFiltro) return false;
    const q = normalizarBusqueda(busqueda);
    if (!q) return true;
    return (
      normalizarBusqueda(j.nombre).includes(q) ||
      (j.clubNombre && normalizarBusqueda(j.clubNombre).includes(q))
    );
  });

  const hayOpciones = filtrados.length > 0;
  const buscando = busqueda.trim().length > 0;
  const debeMostrarDropdown = desplegado && (hayOpciones || buscando);

  const handleSeleccionar = (jinete: {
    id: string;
    nombre: string;
    clubId: string;
    edad: number | null;
    clubNombre?: string;
  }) => {
    setSeleccionado(jinete);
    alSeleccionar(jinete);
    setDesplegado(false);
    setBusqueda("");
  };

  const handleLimpiar = () => {
    setSeleccionado(null);
    alLimpiar?.();
    setBusqueda("");
  };

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <Label htmlFor={id} className="text-sm font-medium text-texto">
          {label} {requerido && <span className="text-problema">*</span>}
        </Label>
      )}

      {seleccionado ? (
        <div className="flex items-center justify-between p-3 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-texto truncate">
              {seleccionado.nombre}
            </span>
            <div className="flex items-center gap-2 text-xs text-texto-secundario truncate">
              {seleccionado.clubNombre && <span>Club: {seleccionado.clubNombre}</span>}
              {seleccionado.edad !== null ? (
                <span>• {seleccionado.edad} años</span>
              ) : (
                <span className="text-texto-suave">• Sin fecha de nacimiento</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLimpiar}
            className="p-1.5 rounded-full hover:bg-white/80 dark:hover:bg-stone-800 text-texto-secundario hover:text-texto transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div ref={contenedorRef} onBlur={handleBlur} className="relative">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-suave pointer-events-none" />
            <Input
              id={id}
              placeholder="Buscar jinete..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setDesplegado(true);
              }}
              onFocus={() => setDesplegado(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDesplegado(false);
                }
              }}
              className="pl-9 pr-3 rounded-2xl"
            />
          </div>

          {debeMostrarDropdown && (
            <div className="absolute z-40 left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-borde bg-superficie shadow-xl p-1.5 space-y-1">
              {filtrados.length > 0 ? (
                filtrados.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => handleSeleccionar(j)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-fondo text-left text-sm text-texto transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="font-medium group-hover:text-acento">{j.nombre}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-texto-secundario">
                        {j.clubNombre && <span>{j.clubNombre}</span>}
                        {j.edad !== null ? (
                          <span>• {j.edad} años</span>
                        ) : (
                          <span className="text-falta-texto">• Sin fecha</span>
                        )}
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-acento opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              ) : buscando ? (
                <div className="p-3 text-center text-xs text-texto-secundario">
                  No se encontraron jinetes que coincidan con «<strong>{busqueda}</strong>».
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-texto-secundario">
                  No hay jinetes disponibles.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-problema mt-1">{error}</p>}
    </div>
  );
}
