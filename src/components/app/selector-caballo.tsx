"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { crearCaballo } from "@/dominio/inscripciones/participantes/acciones";
import { listarCaballosActivos } from "@/dominio/inscripciones/participantes/consultas";
import { SelectorClub } from "./selector-club";
import { ParecidoCoincidencia } from "@/dominio/inscripciones/participantes/reglas";

interface SelectorCaballoProps {
  caballoSeleccionadoId?: string;
  clubIdFiltro?: string;
  alSeleccionar: (caballo: { id: string; nombre: string; clubId: string; clubNombre?: string }) => void;
  alLimpiar?: () => void;
  id?: string;
  label?: string;
  requerido?: boolean;
  permitirCrear?: boolean;
  error?: string;
}

/**
 * Selector reutilizable de Caballo con visualización de club,
 * búsqueda en vivo y creación en línea.
 * (docs/inscripciones/participantes.md §3.2, §3.5 y §5.5)
 */
export function SelectorCaballo({
  caballoSeleccionadoId,
  clubIdFiltro,
  alSeleccionar,
  alLimpiar,
  id = "selector-caballo",
  label = "Caballo",
  requerido = false,
  permitirCrear = true,
  error,
}: SelectorCaballoProps) {
  const [todosCaballos, setTodosCaballos] = useState<
    { id: string; nombre: string; clubId: string; clubNombre?: string }[]
  >([]);
  const [busqueda, setBusqueda] = useState("");
  const [desplegado, setDesplegado] = useState(false);
  const [seleccionado, setSeleccionado] = useState<{
    id: string;
    nombre: string;
    clubId: string;
    clubNombre?: string;
  } | null>(null);

  // Creación rápida
  const [modalCrear, setModalCrear] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [clubIdNuevo, setClubIdNuevo] = useState(clubIdFiltro || "");
  const [guardando, setGuardando] = useState(false);
  const [parecidos, setParecidos] = useState<ParecidoCoincidencia[]>([]);

  useEffect(() => {
    listarCaballosActivos()
      .then((datos) => {
        setTodosCaballos(datos);
        if (caballoSeleccionadoId) {
          const found = datos.find((c) => c.id === caballoSeleccionadoId);
          if (found) setSeleccionado(found);
        }
      })
      .catch(() => {});
  }, [caballoSeleccionadoId]);

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

  const filtrados = todosCaballos.filter((c) => {
    if (clubIdFiltro && c.clubId !== clubIdFiltro) return false;
    const q = busqueda.toLowerCase().trim();
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.clubNombre && c.clubNombre.toLowerCase().includes(q))
    );
  });

  const hayOpciones = filtrados.length > 0;
  const buscando = busqueda.trim().length > 0;
  const mostrarCrear = permitirCrear && busqueda.trim().length >= 2;
  const debeMostrarDropdown = desplegado && (hayOpciones || buscando || mostrarCrear);

  const handleSeleccionar = (caballo: {
    id: string;
    nombre: string;
    clubId: string;
    clubNombre?: string;
  }) => {
    setSeleccionado(caballo);
    alSeleccionar(caballo);
    setDesplegado(false);
    setBusqueda("");
  };

  const handleLimpiar = () => {
    setSeleccionado(null);
    alLimpiar?.();
    setBusqueda("");
  };

  const abrirCreacion = () => {
    setNombreNuevo(busqueda.trim());
    setClubIdNuevo(clubIdFiltro || "");
    setParecidos([]);
    setModalCrear(true);
    setDesplegado(false);
  };

  const guardarNuevo = async (confirmarAunqueParecido = false) => {
    if (!nombreNuevo.trim()) {
      toast.error("El nombre del caballo es obligatorio.");
      return;
    }
    if (!clubIdNuevo) {
      toast.error("Debe seleccionarse un club para el caballo.");
      return;
    }

    setGuardando(true);
    try {
      const res = await crearCaballo({
        nombre: nombreNuevo.trim(),
        clubId: clubIdNuevo,
        confirmarAunqueParecido,
      });

      if (!res.exito) {
        if (res.requiereConfirmacion && res.parecidos) {
          setParecidos(res.parecidos);
          toast.warning("Se detectaron caballos con nombres similares.");
          return;
        }
        toast.error(res.error || "No fue posible crear el caballo.");
        return;
      }

      if (res.caballo) {
        toast.success(`Caballo "${res.caballo.nombre}" registrado exitosamente.`);
        const actualizados = await listarCaballosActivos();
        setTodosCaballos(actualizados);
        handleSeleccionar({
          id: res.caballo.id,
          nombre: res.caballo.nombre,
          clubId: res.caballo.clubId,
        });
        setModalCrear(false);
      }
    } catch (e: any) {
      toast.error(e?.message || "Error al procesar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="w-full space-y-1.5 text-left">
      <Label htmlFor={id} className="text-sm font-medium text-texto">
        {label} {requerido && <span className="text-problema">*</span>}
      </Label>

      {seleccionado ? (
        <div className="flex items-center justify-between p-3 rounded-2xl border border-borde bg-superficie">
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-texto truncate">
              {seleccionado.nombre}
            </span>
            {seleccionado.clubNombre && (
              <span className="text-xs text-texto-secundario truncate">
                Club: {seleccionado.clubNombre}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleLimpiar}
            className="p-1.5 rounded-full hover:bg-fondo text-texto-secundario hover:text-texto transition-colors"
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
              placeholder="Buscar o crear caballo..."
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
                filtrados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSeleccionar(c)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-fondo text-left text-sm text-texto transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="font-medium group-hover:text-acento">{c.nombre}</div>
                      {c.clubNombre && (
                        <div className="text-[11px] text-texto-secundario">{c.clubNombre}</div>
                      )}
                    </div>
                    <Check className="w-4 h-4 text-acento opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              ) : buscando ? (
                <div className="p-3 text-center text-xs text-texto-secundario">
                  No se encontraron caballos.
                </div>
              ) : null}

              {mostrarCrear && (
                <button
                  type="button"
                  onClick={abrirCreacion}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-acento/10 hover:bg-acento/20 text-acento text-left text-sm font-medium transition-colors border-t border-borde/50 mt-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span>Crear caballo «{busqueda.trim()}»</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-problema mt-1">{error}</p>}

      {/* Sheet Creación Rápida Caballo */}
      <Sheet
        abierta={modalCrear}
        alCerrar={() => setModalCrear(false)}
        posicion="abajo"
        titulo="Nuevo Caballo"
        descripcion="Registra el caballo indicando su club obligatorio"
      >
        <div className="space-y-4 py-2">
          {parecidos.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-falta-borde bg-falta-fondo space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-falta-texto">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>¿Es alguno de estos caballos existentes?</span>
              </div>
              <div className="space-y-1.5">
                {parecidos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      handleSeleccionar({
                        id: p.id,
                        nombre: p.nombre,
                        clubId: "",
                        clubNombre: p.clubNombre,
                      });
                      setModalCrear(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-superficie hover:bg-superficie-resaltada text-xs font-medium text-texto text-left transition-colors border border-borde"
                  >
                    <span>{p.nombre}</span>
                    <span className="text-[11px] text-texto-secundario">
                      {p.clubNombre || "Sin club"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">
              Nombre del caballo <span className="text-problema">*</span>
            </Label>
            <Input
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="Ej: Vendaval"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <SelectorClub
              clubSeleccionadoId={clubIdNuevo}
              alSeleccionar={(club) => setClubIdNuevo(club.id)}
              alLimpiar={() => setClubIdNuevo("")}
              label="Club al que pertenece"
              requerido
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalCrear(false)}
              className="flex-1 rounded-2xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={guardando || !nombreNuevo.trim() || !clubIdNuevo}
              onClick={() => guardarNuevo(parecidos.length > 0)}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {guardando
                ? "Guardando..."
                : parecidos.length > 0
                ? "Crear de todos modos"
                : "Guardar caballo"}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
