"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Building2, AlertCircle, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { crearClub, obtenerClubesActivos } from "@/dominio/inscripciones/participantes/acciones";
import { ParecidoCoincidencia } from "@/dominio/inscripciones/participantes/reglas";
import { normalizarBusqueda } from "@/lib/utilidades";

export interface OpcionClub {
  id: string;
  nombre: string;
}

interface SelectorClubProps {
  clubesDisponibles?: OpcionClub[];
  clubSeleccionadoId?: string;
  alSeleccionar: (club: { id: string; nombre: string }) => void;
  alLimpiar?: () => void;
  id?: string;
  label?: string;
  requerido?: boolean;
  permitirCrear?: boolean;
  error?: string;
}

/**
 * Selector reutilizable de Club con búsqueda local en tiempo real,
 * detección de parecidos y creación rápida en un toque.
 * (docs/inscripciones/participantes.md §3.2, §3.5 y §5.5)
 */
export function SelectorClub({
  clubesDisponibles,
  clubSeleccionadoId,
  alSeleccionar,
  alLimpiar,
  id = "selector-club",
  label = "Club / Sociedad",
  requerido = false,
  permitirCrear = true,
  error,
}: SelectorClubProps) {
  const [todosClubes, setTodosClubes] = useState<{ id: string; nombre: string }[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [desplegado, setDesplegado] = useState(false);
  const [seleccionado, setSeleccionado] = useState<{ id: string; nombre: string } | null>(null);

  // Creación rápida
  const [modalCrear, setModalCrear] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [contacto, setContacto] = useState("");
  const [rut, setRut] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [parecidos, setParecidos] = useState<ParecidoCoincidencia[]>([]);

  // Carga y sincronización de clubes disponibles
  useEffect(() => {
    if (clubesDisponibles) {
      setTodosClubes(clubesDisponibles);
      return;
    }

    obtenerClubesActivos()
      .then((datos) => {
        setTodosClubes(datos as any);
      })
      .catch((err) => {
        console.error("Error al cargar clubes:", err);
      });
  }, [clubesDisponibles]);

  // Sincronización inmediata de seleccionado al cambiar clubSeleccionadoId o la lista
  useEffect(() => {
    if (!clubSeleccionadoId) {
      setSeleccionado(null);
      return;
    }

    const fuente = clubesDisponibles && clubesDisponibles.length > 0 ? clubesDisponibles : todosClubes;
    const found = fuente.find((c) => c.id === clubSeleccionadoId);
    if (found) {
      setSeleccionado(found);
    }
  }, [clubSeleccionadoId, clubesDisponibles, todosClubes]);

  const filtrados = todosClubes.filter((c) => {
    const q = normalizarBusqueda(busqueda);
    if (!q) return true;
    return normalizarBusqueda(c.nombre).includes(q);
  });

  const hayOpciones = filtrados.length > 0;
  const buscando = busqueda.trim().length > 0;
  const mostrarCrear = permitirCrear && busqueda.trim().length >= 2;
  const debeMostrarDropdown = desplegado && (hayOpciones || buscando || mostrarCrear);

  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickAfuera(e: MouseEvent | TouchEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setDesplegado(false);
      }
    }
    document.addEventListener("mousedown", handleClickAfuera);
    document.addEventListener("touchstart", handleClickAfuera);
    return () => {
      document.removeEventListener("mousedown", handleClickAfuera);
      document.removeEventListener("touchstart", handleClickAfuera);
    };
  }, []);

  const handleBlur = (e: React.FocusEvent) => {
    if (e.relatedTarget && !contenedorRef.current?.contains(e.relatedTarget as Node)) {
      setDesplegado(false);
    }
  };

  const handleSeleccionar = (club: { id: string; nombre: string }) => {
    setSeleccionado(club);
    alSeleccionar(club);
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
    setContacto("");
    setRut("");
    setParecidos([]);
    setModalCrear(true);
    setDesplegado(false);
  };

  const guardarNuevo = async (confirmarAunqueParecido = false) => {
    if (!nombreNuevo.trim()) {
      toast.error("El nombre del club es obligatorio.");
      return;
    }

    setGuardando(true);
    try {
      const res = await crearClub({
        nombre: nombreNuevo.trim(),
        contacto: contacto.trim() || undefined,
        rut: rut.trim() || undefined,
        confirmarAunqueParecido,
      });

      if (!res.exito) {
        if (res.requiereConfirmacion && res.parecidos) {
          setParecidos(res.parecidos);
          toast.warning("Se detectaron clubes con nombres similares.");
          return;
        }
        toast.error(res.error || "No fue posible crear el club.");
        return;
      }

      if (res.club) {
        toast.success(`Club "${res.club.nombre}" creado exitosamente.`);
        const actualizados = await obtenerClubesActivos();
        setTodosClubes(actualizados as any);
        handleSeleccionar({ id: res.club.id, nombre: res.club.nombre });
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
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Building2 className="w-5 h-5 text-texto-secundario flex-shrink-0" />
            <span className="text-sm font-semibold text-texto truncate">
              {seleccionado.nombre}
            </span>
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
              placeholder="Buscar o crear club..."
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
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSeleccionar(c)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-fondo text-left text-sm text-texto transition-colors group cursor-pointer"
                  >
                    <span className="font-medium group-hover:text-acento">{c.nombre}</span>
                    <Check className="w-4 h-4 text-acento opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              ) : buscando ? (
                <div className="p-3 text-center text-xs text-texto-secundario">
                  No se encontraron clubes.
                </div>
              ) : null}

              {mostrarCrear && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={abrirCreacion}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-acento/10 hover:bg-acento/20 text-acento text-left text-sm font-medium transition-colors border-t border-borde/50 mt-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span>Crear club «{busqueda.trim()}»</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-problema mt-1">{error}</p>}

      {/* Modal / Sheet de Creación Rápida */}
      <Sheet
        abierta={modalCrear}
        alCerrar={() => setModalCrear(false)}
        posicion="abajo"
        titulo="Nuevo Club"
        descripcion="Crea el club y continúa sin perder tu avance"
      >
        <div className="space-y-4 py-2">
          {parecidos.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-falta-borde bg-falta-fondo space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-falta-texto">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>¿Es alguno de estos clubes existentes?</span>
              </div>
              <div className="space-y-1.5">
                {parecidos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      handleSeleccionar({ id: p.id, nombre: p.nombre });
                      setModalCrear(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-superficie hover:bg-superficie-resaltada text-xs font-medium text-texto text-left transition-colors border border-borde"
                  >
                    <span>{p.nombre}</span>
                    <span className="text-[11px] text-texto-secundario">{p.detalle}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">
              Nombre del club <span className="text-problema">*</span>
            </Label>
            <Input
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="Ej: Club Ecuestre La Dehesa"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">Contacto (opcional)</Label>
            <Input
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="Teléfono o correo del club"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">RUT (opcional)</Label>
            <Input
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="Ej: 76.123.456-7"
              className="rounded-2xl"
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
              disabled={guardando || !nombreNuevo.trim()}
              onClick={() => guardarNuevo(parecidos.length > 0)}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {guardando
                ? "Guardando..."
                : parecidos.length > 0
                ? "Crear de todos modos"
                : "Guardar club"}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
