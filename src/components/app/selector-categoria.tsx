"use client";

import { useEffect, useRef, useState } from "react";
import { Tag, Search, ChevronDown, Check, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { obtenerCategoriasSelector } from "@/dominio/organizacion/categorias";

export interface OpcionCategoria {
  id: string;
  nombre: string;
  tipo: "ingreso" | "gasto";
  exigeContraparte: boolean;
  sujetoAsociado?: string | null;
  exigeSujeto?: boolean;
  claveSistema: string | null;
  orden: number;
}

interface SelectorCategoriaProps {
  tipo: "ingreso" | "gasto";
  categoriasDisponibles?: OpcionCategoria[];
  valorSeleccionado?: string;
  claveSistemaSeleccionada?: string;
  alSeleccionar: (categoria: OpcionCategoria) => void;
  id?: string;
  label?: string;
  error?: string;
}

function formatearSujeto(sujeto?: string | null): string {
  if (!sujeto) return "";
  switch (sujeto) {
    case "caballo":
      return "Caballo";
    case "jinete":
      return "Jinete";
    case "binomio":
      return "Binomio";
    case "club":
      return "Club";
    case "prueba":
      return "Prueba";
    case "binomio_prueba":
      return "Binomio y Prueba";
    default:
      return sujeto;
  }
}

/**
 * Selector combobox interactivo con búsqueda en tiempo real de categorías.
 * Permite filtrar por nombre o entidad asociada tanto en celulares como en escritorio.
 */
export function SelectorCategoria({
  tipo,
  categoriasDisponibles,
  valorSeleccionado,
  claveSistemaSeleccionada,
  alSeleccionar,
  id = "selector-categoria",
  label = "Categoría *",
  error,
}: SelectorCategoriaProps) {
  const [categorias, setCategorias] = useState<OpcionCategoria[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputBusquedaRef = useRef<HTMLInputElement>(null);

  // Si se proveen categoriasDisponibles (cargadas en el servidor), filtrarlas por tipo
  useEffect(() => {
    if (categoriasDisponibles && categoriasDisponibles.length > 0) {
      const filtradas = categoriasDisponibles.filter((c) => c.tipo === tipo);
      setCategorias(filtradas);
      setCargando(false);
      return;
    }

    // Fallback: cargar desde Server Action si no vinieron en props
    let cancelado = false;
    setCargando(true);

    obtenerCategoriasSelector(tipo)
      .then((data) => {
        if (!cancelado) {
          const cats = data as OpcionCategoria[];
          setCategorias(cats);
          setCargando(false);
        }
      })
      .catch((err) => {
        console.error("Error al cargar categorías en selector:", err);
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [tipo, categoriasDisponibles]);

  // Preselección por claveSistemaSeleccionada o valorSeleccionado
  useEffect(() => {
    if (categorias.length === 0) return;

    if (!valorSeleccionado && claveSistemaSeleccionada) {
      const encontrada = categorias.find(
        (c) =>
          c.claveSistema === claveSistemaSeleccionada ||
          c.nombre.toLowerCase() === claveSistemaSeleccionada.toLowerCase()
      );
      if (encontrada) {
        alSeleccionar(encontrada);
      }
    }
  }, [categorias, valorSeleccionado, claveSistemaSeleccionada, alSeleccionar]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickAfuera(e: MouseEvent | TouchEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    if (abierto) {
      document.addEventListener("mousedown", handleClickAfuera);
      document.addEventListener("touchstart", handleClickAfuera);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickAfuera);
      document.removeEventListener("touchstart", handleClickAfuera);
    };
  }, [abierto]);

  // Enfocar input de búsqueda al abrir
  useEffect(() => {
    if (abierto) {
      setTimeout(() => {
        inputBusquedaRef.current?.focus();
      }, 50);
    } else {
      setBusqueda("");
    }
  }, [abierto]);

  const seleccionada = categorias.find((c) => c.id === valorSeleccionado);

  const categoriasFiltradas = categorias.filter((c) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    const coincideNombre = c.nombre.toLowerCase().includes(q);
    const coincideSujeto = c.sujetoAsociado ? formatearSujeto(c.sujetoAsociado).toLowerCase().includes(q) : false;
    const coincideClave = c.claveSistema ? c.claveSistema.toLowerCase().includes(q) : false;
    return coincideNombre || coincideSujeto || coincideClave;
  });

  return (
    <div className="space-y-1.5" ref={contenedorRef}>
      <Label htmlFor={id} className="text-sm font-semibold text-stone-800">
        {label}
      </Label>

      <div className="relative">
        {/* Botón disparador del combobox */}
        <button
          type="button"
          id={id}
          disabled={cargando}
          onClick={() => setAbierto(!abierto)}
          className={`flex h-12 w-full items-center justify-between rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? "border-rose-400 ring-1 ring-rose-400"
              : abierto
              ? "border-emerald-600 ring-2 ring-emerald-600/20"
              : "border-stone-300 hover:border-stone-400"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Tag className={`h-4 w-4 shrink-0 ${seleccionada ? "text-emerald-700" : "text-stone-400"}`} />
            {seleccionada ? (
              <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                <span className="font-semibold text-stone-900 truncate">{seleccionada.nombre}</span>
                {seleccionada.sujetoAsociado && (
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                    {formatearSujeto(seleccionada.sujetoAsociado)}
                  </span>
                )}
                {seleccionada.exigeContraparte && (
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                    Contraparte
                  </span>
                )}
              </div>
            ) : (
              <span className="text-stone-400 truncate">
                {cargando ? "Cargando categorías..." : "Selecciona o busca una categoría..."}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <ChevronDown
              className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${
                abierto ? "rotate-180 text-emerald-700" : ""
              }`}
            />
          </div>
        </button>

        {/* Panel desplegable con buscador */}
        {abierto && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-stone-200 bg-white p-2 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100">
            {/* Input de búsqueda interactiva */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400 pointer-events-none" />
              <input
                ref={inputBusquedaRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setAbierto(false);
                  }
                }}
                placeholder="Escribe para buscar categoría..."
                className="w-full h-10 pl-9 pr-8 rounded-lg border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-2.5 top-2.5 p-0.5 text-stone-400 hover:text-stone-700 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Lista de resultados */}
            <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
              {categoriasFiltradas.length === 0 ? (
                <div className="py-6 px-3 text-center text-xs text-stone-500">
                  {busqueda ? (
                    <p>No se encontraron categorías que coincidan con «<strong>{busqueda}</strong>».</p>
                  ) : (
                    <p>No hay categorías de {tipo} activas configuradas.</p>
                  )}
                </div>
              ) : (
                categoriasFiltradas.map((cat) => {
                  const esSeleccionada = cat.id === valorSeleccionado;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        alSeleccionar(cat);
                        setAbierto(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-sm transition-all cursor-pointer ${
                        esSeleccionada
                          ? "bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-200"
                          : "hover:bg-stone-50 text-stone-800"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                        <span className="truncate">{cat.nombre}</span>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {cat.sujetoAsociado && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100/80 text-emerald-800 font-medium">
                              Asocia {formatearSujeto(cat.sujetoAsociado)}
                              {cat.exigeSujeto ? " *" : ""}
                            </span>
                          )}
                          {cat.exigeContraparte && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-medium">
                              Exige contraparte
                            </span>
                          )}
                        </div>
                      </div>

                      {esSeleccionada && (
                        <Check className="h-4 w-4 text-emerald-700 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
