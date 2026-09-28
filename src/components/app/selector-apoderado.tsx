"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Check, X, Phone, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { crearApoderado } from "@/dominio/inscripciones/participantes/acciones";
import { listarApoderadosActivos } from "@/dominio/inscripciones/participantes/consultas";
import { ParecidoCoincidencia } from "@/dominio/inscripciones/participantes/reglas";

interface SelectorApoderadoProps {
  apoderadoSeleccionadoId?: string;
  alSeleccionar: (apoderado: { id: string; nombre: string; telefono: string | null }) => void;
  alLimpiar?: () => void;
  id?: string;
  label?: string;
  requerido?: boolean;
  permitirCrear?: boolean;
  error?: string;
}

/**
 * Selector reutilizable de Apoderado con teléfono visible y creación rápida.
 * (docs/inscripciones/participantes.md §3.2, §3.5 y §5.5)
 */
export function SelectorApoderado({
  apoderadoSeleccionadoId,
  alSeleccionar,
  alLimpiar,
  id = "selector-apoderado",
  label = "Apoderado",
  requerido = false,
  permitirCrear = true,
  error,
}: SelectorApoderadoProps) {
  const [todosApoderados, setTodosApoderados] = useState<
    { id: string; nombre: string; telefono: string | null }[]
  >([]);
  const [busqueda, setBusqueda] = useState("");
  const [desplegado, setDesplegado] = useState(false);
  const [seleccionado, setSeleccionado] = useState<{
    id: string;
    nombre: string;
    telefono: string | null;
  } | null>(null);

  // Creación rápida
  const [modalCrear, setModalCrear] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [telefonoNuevo, setTelefonoNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [parecidos, setParecidos] = useState<ParecidoCoincidencia[]>([]);

  useEffect(() => {
    listarApoderadosActivos()
      .then((datos) => {
        setTodosApoderados(datos);
        if (apoderadoSeleccionadoId) {
          const found = datos.find((a) => a.id === apoderadoSeleccionadoId);
          if (found) setSeleccionado(found);
        }
      })
      .catch(() => {});
  }, [apoderadoSeleccionadoId]);

  const filtrados = todosApoderados.filter((a) => {
    const q = busqueda.toLowerCase().trim();
    return (
      a.nombre.toLowerCase().includes(q) ||
      (a.telefono && a.telefono.toLowerCase().includes(q))
    );
  });

  const handleSeleccionar = (apoderado: {
    id: string;
    nombre: string;
    telefono: string | null;
  }) => {
    setSeleccionado(apoderado);
    alSeleccionar(apoderado);
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
    setTelefonoNuevo("");
    setParecidos([]);
    setModalCrear(true);
    setDesplegado(false);
  };

  const guardarNuevo = async (confirmarAunqueParecido = false) => {
    if (!nombreNuevo.trim()) {
      toast.error("El nombre del apoderado es obligatorio.");
      return;
    }
    if (!telefonoNuevo.trim() || telefonoNuevo.trim().length < 8) {
      toast.error("El teléfono de contacto debe tener al menos 8 dígitos.");
      return;
    }

    setGuardando(true);
    try {
      const res = await crearApoderado({
        nombre: nombreNuevo.trim(),
        telefono: telefonoNuevo.trim(),
        confirmarAunqueParecido,
      });

      if (!res.exito) {
        if (res.requiereConfirmacion && res.parecidos) {
          setParecidos(res.parecidos);
          toast.warning("Se detectaron apoderados con datos similares.");
          return;
        }
        toast.error(res.error || "No fue posible crear el apoderado.");
        return;
      }

      if (res.apoderado) {
        toast.success(`Apoderado "${res.apoderado.nombre}" registrado exitosamente.`);
        const actualizados = await listarApoderadosActivos();
        setTodosApoderados(actualizados);
        handleSeleccionar({
          id: res.apoderado.id,
          nombre: res.apoderado.nombre,
          telefono: res.apoderado.telefono,
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
            {seleccionado.telefono && (
              <span className="text-xs text-texto-secundario flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-texto-suave" />
                {seleccionado.telefono}
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
        <div className="relative">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-suave pointer-events-none" />
            <Input
              id={id}
              placeholder="Buscar o crear apoderado..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setDesplegado(true);
              }}
              onFocus={() => setDesplegado(true)}
              className="pl-9 pr-3 rounded-2xl"
            />
          </div>

          {desplegado && (
            <div className="absolute z-40 left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-borde bg-superficie shadow-xl p-1.5 space-y-1">
              {filtrados.length > 0 ? (
                filtrados.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleSeleccionar(a)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-fondo text-left text-sm text-texto transition-colors group"
                  >
                    <div>
                      <div className="font-medium group-hover:text-acento">{a.nombre}</div>
                      {a.telefono && (
                        <div className="text-[11px] text-texto-secundario">{a.telefono}</div>
                      )}
                    </div>
                    <Check className="w-4 h-4 text-acento opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-texto-secundario">
                  No se encontraron apoderados.
                </div>
              )}

              {permitirCrear && busqueda.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={abrirCreacion}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-acento/10 hover:bg-acento/20 text-acento text-left text-sm font-medium transition-colors border-t border-borde/50 mt-1"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span>Crear apoderado «{busqueda.trim()}»</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-problema mt-1">{error}</p>}

      {/* Sheet Creación Rápida Apoderado */}
      <Sheet
        abierta={modalCrear}
        alCerrar={() => setModalCrear(false)}
        posicion="abajo"
        titulo="Nuevo Apoderado"
        descripcion="Contacto de emergencia y representante del jinete"
      >
        <div className="space-y-4 py-2">
          {parecidos.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-falta-borde bg-falta-fondo space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-falta-texto">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>¿Es alguno de estos apoderados existentes?</span>
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
                        telefono: p.telefono || null,
                      });
                      setModalCrear(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-superficie hover:bg-superficie-resaltada text-xs font-medium text-texto text-left transition-colors border border-borde"
                  >
                    <span>{p.nombre}</span>
                    <span className="text-[11px] text-texto-secundario">{p.telefono}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">
              Nombre del apoderado <span className="text-problema">*</span>
            </Label>
            <Input
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="Ej: Carmen Gloria Valdés"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">
              Teléfono de contacto / WhatsApp <span className="text-problema">*</span>
            </Label>
            <Input
              value={telefonoNuevo}
              onChange={(e) => setTelefonoNuevo(e.target.value)}
              placeholder="+56 9 9123 4567"
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
              disabled={guardando || !nombreNuevo.trim() || !telefonoNuevo.trim()}
              onClick={() => guardarNuevo(parecidos.length > 0)}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {guardando
                ? "Guardando..."
                : parecidos.length > 0
                ? "Crear de todos modos"
                : "Guardar apoderado"}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
