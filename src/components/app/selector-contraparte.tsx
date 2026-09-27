"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Building2, AlertCircle, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet } from "@/components/ui/sheet";
import {
  crearContraparte,
  buscarParecidosContrapartes,
  obtenerContrapartes,
} from "@/dominio/organizacion/contrapartes";

interface SelectorContraparteProps {
  tipoMovimiento: "ingreso" | "gasto";
  contraparteSeleccionadaId?: string;
  alSeleccionar: (contraparte: { id: string; nombre: string }) => void;
  alLimpiar?: () => void;
  id?: string;
  label?: string;
  requerido?: boolean;
  error?: string;
}

/**
 * Selector de contrapartes con autocompletado en tiempo real, detección de parecidos
 * y creación en línea en un solo toque (docs/organizacion/organizacion-evento.md §3.5 y §5.4).
 */
export function SelectorContraparte({
  tipoMovimiento,
  contraparteSeleccionadaId,
  alSeleccionar,
  alLimpiar,
  id = "selector-contraparte",
  label = "Contraparte (Auspiciador o Proveedor)",
  requerido = false,
  error,
}: SelectorContraparteProps) {
  const [todasContrapartes, setTodasContrapartes] = useState<{ id: string; nombre: string; rut: string | null }[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [desplegado, setDesplegado] = useState(false);
  const [seleccionada, setSeleccionada] = useState<{ id: string; nombre: string } | null>(null);

  // Estados de creación rápida en línea
  const [modalCrear, setModalCrear] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [esAuspiciador, setEsAuspiciador] = useState(tipoMovimiento === "ingreso");
  const [esProveedor, setEsProveedor] = useState(tipoMovimiento === "gasto");
  const [contacto, setContacto] = useState("");
  const [rut, setRut] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [parecidos, setParecidos] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    obtenerContrapartes({ estado: "activas" }).then((datos) => {
      setTodasContrapartes(datos.map((d) => ({ id: d.id, nombre: d.nombre, rut: d.rut })));
      if (contraparteSeleccionadaId) {
        const found = datos.find((d) => d.id === contraparteSeleccionadaId);
        if (found) setSeleccionada({ id: found.id, nombre: found.nombre });
      }
    });
  }, [contraparteSeleccionadaId]);

  const filtradas = todasContrapartes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase().trim()) ||
    (c.rut && c.rut.toLowerCase().includes(busqueda.toLowerCase().trim()))
  );

  const handleSeleccionar = (cp: { id: string; nombre: string }) => {
    setSeleccionada(cp);
    alSeleccionar(cp);
    setDesplegado(false);
    setBusqueda("");
  };

  const handleLimpiar = () => {
    setSeleccionada(null);
    alLimpiar?.();
    setBusqueda("");
  };

  const abrirCreacionEnLinea = async () => {
    setNombreNuevo(busqueda.trim());
    setEsAuspiciador(tipoMovimiento === "ingreso");
    setEsProveedor(tipoMovimiento === "gasto");
    setContacto("");
    setRut("");

    if (busqueda.trim().length >= 3) {
      const sugerencias = await buscarParecidosContrapartes(busqueda.trim());
      setParecidos(sugerencias);
    } else {
      setParecidos([]);
    }

    setModalCrear(true);
    setDesplegado(false);
  };

  const handleCrearEnLinea = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    const res = await crearContraparte({
      nombre: nombreNuevo,
      esAuspiciador,
      esProveedor,
      contacto: contacto.trim() || null,
      rut: rut.trim() || null,
    });

    setGuardando(false);

    if (!res.exito || !res.contraparte) {
      toast.error(res.error || "No se pudo registrar la contraparte.");
      return;
    }

    toast.success(`Contraparte «${res.contraparte.nombre}» creada.`);
    const nueva = { id: res.contraparte.id, nombre: res.contraparte.nombre };
    setTodasContrapartes((prev) => [...prev, { ...nueva, rut: res.contraparte?.rut || null }]);
    handleSeleccionar(nueva);
    setModalCrear(false);
  };

  return (
    <div className="space-y-1.5 relative">
      <Label htmlFor={id}>
        {label} {requerido && "*"}
      </Label>

      {seleccionada ? (
        <div className="flex items-center justify-between h-12 w-full rounded-xl border border-borde bg-superficie px-3.5 text-sm text-texto">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-acento shrink-0" />
            <span className="font-semibold truncate">{seleccionada.nombre}</span>
          </div>

          <button
            type="button"
            onClick={handleLimpiar}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-texto-suave hover:bg-fondo hover:text-texto cursor-pointer"
            title="Quitar contraparte"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Input
              id={id}
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setDesplegado(true);
              }}
              onFocus={() => setDesplegado(true)}
              placeholder="Buscar o escribir para crear..."
              className="h-12 pl-10 pr-4"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-texto-suave" />
          </div>

          {/* Menú desplegable flotante */}
          {desplegado && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-borde bg-superficie p-1.5 shadow-xl animate-in fade-in zoom-in-95">
              {filtradas.length > 0 ? (
                filtradas.slice(0, 6).map((cp) => (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => handleSeleccionar(cp)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm rounded-xl hover:bg-fondo text-texto transition-colors cursor-pointer"
                  >
                    <span className="font-medium truncate">{cp.nombre}</span>
                    {cp.rut && <span className="text-xs text-texto-suave ml-2">{cp.rut}</span>}
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-texto-suave">
                  No se encontraron coincidencias.
                </div>
              )}

              {busqueda.trim().length >= 2 && (
                <div className="pt-1 mt-1 border-t border-borde/40">
                  <button
                    type="button"
                    onClick={abrirCreacionEnLinea}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-acento hover:bg-acento/10 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Crear «{busqueda.trim()}» en un toque</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-gasto">{error}</p>}

      {/* Modal / Sheet Creación en línea rápida */}
      <Sheet
        abierta={modalCrear}
        alCerrar={() => setModalCrear(false)}
        posicion="centro"
        titulo="Crear contraparte en línea"
        descripcion="Completa rápidamente para continuar con el registro."
      >
        <form onSubmit={handleCrearEnLinea} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cpNombreRapido">Nombre o Razón Social *</Label>
            <Input
              id="cpNombreRapido"
              type="text"
              required
              minLength={2}
              maxLength={120}
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              autoFocus
            />
          </div>

          {/* Detección de parecidos */}
          {parecidos.length > 0 && (
            <div className="p-3 rounded-xl border border-falta-texto/30 bg-falta-fondo text-xs text-falta-texto space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>¿Es alguna de estas contrapartes existentes?</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {parecidos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setModalCrear(false);
                      handleSeleccionar(p);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-fondo text-texto font-medium hover:bg-borde transition-colors cursor-pointer"
                  >
                    Usar «{p.nombre}»
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <Label>Tipo de relación</Label>
            <div className="flex items-center gap-5">
              <label className="inline-flex items-center gap-2 text-xs text-texto cursor-pointer">
                <Checkbox
                  checked={esAuspiciador}
                  onCheckedChange={(c) => setEsAuspiciador(Boolean(c))}
                />
                <span>Auspiciador</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs text-texto cursor-pointer">
                <Checkbox
                  checked={esProveedor}
                  onCheckedChange={(c) => setEsProveedor(Boolean(c))}
                />
                <span>Proveedor</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="cpRutRapido">RUT (opcional)</Label>
              <Input
                id="cpRutRapido"
                type="text"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="12.345.678-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cpContactoRapido">Contacto (opcional)</Label>
              <Input
                id="cpContactoRapido"
                type="text"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="+56 9 1234 5678"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-borde/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalCrear(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando || !nombreNuevo.trim()}>
              {guardando ? "Creando..." : "Crear y seleccionar"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
