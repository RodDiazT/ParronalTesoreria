"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trophy, EyeOff, RotateCcw, Trash2, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { formatearMonto } from "@/lib/presentacion/formato";
import {
  crearPrueba,
  editarPrueba,
  eliminarPrueba,
} from "@/dominio/inscripciones/binomios/acciones";

export interface InscripcionPruebaItem {
  id: string;
  binomioId: string;
  binomio: {
    jinete: { nombre: string };
    caballo: { nombre: string };
  };
}

export interface PruebaConfigItem {
  id: string;
  nombre: string;
  tarifaClp: number;
  edadMinima: number | null;
  edadMaxima: number | null;
  orden: number;
  activa: boolean;
  version: number;
  inscripciones?: InscripcionPruebaItem[];
}

interface GestorPruebasProps {
  pruebasIniciales: PruebaConfigItem[];
}

export function GestorPruebas({ pruebasIniciales }: GestorPruebasProps) {
  const router = useRouter();

  // Modales
  const [modalPrueba, setModalPrueba] = useState<PruebaConfigItem | null | "nuevo">(null);
  const [modalEliminar, setModalEliminar] = useState<PruebaConfigItem | null>(null);
  const [pruebaDestinoId, setPruebaDestinoId] = useState("");
  const [eliminando, setEliminando] = useState(false);

  // Formulario Prueba
  const [nombrePrueba, setNombrePrueba] = useState("");
  const [tarifaPrueba, setTarifaPrueba] = useState("0");
  const [edadMin, setEdadMin] = useState("");
  const [edadMax, setEdadMax] = useState("");
  const [guardandoPrueba, setGuardandoPrueba] = useState(false);

  const abrirModalPrueba = (p?: PruebaConfigItem) => {
    if (p) {
      setModalPrueba(p);
      setNombrePrueba(p.nombre);
      setTarifaPrueba(p.tarifaClp.toString());
      setEdadMin(p.edadMinima !== null ? p.edadMinima.toString() : "");
      setEdadMax(p.edadMaxima !== null ? p.edadMaxima.toString() : "");
    } else {
      setModalPrueba("nuevo");
      setNombrePrueba("");
      setTarifaPrueba("0");
      setEdadMin("");
      setEdadMax("");
    }
  };

  const abrirModalEliminar = (p: PruebaConfigItem) => {
    setModalEliminar(p);
    setPruebaDestinoId("");
  };

  const handleGuardarPrueba = async (e: React.FormEvent) => {
    e.preventDefault();
    const tarifa = parseInt(tarifaPrueba.replace(/\D/g, ""), 10) || 0;
    const min = edadMin.trim() ? parseInt(edadMin, 10) : null;
    const max = edadMax.trim() ? parseInt(edadMax, 10) : null;

    try {
      setGuardandoPrueba(true);
      if (modalPrueba === "nuevo") {
        const res = await crearPrueba({
          nombre: nombrePrueba,
          tarifaClp: tarifa,
          edadMinima: min,
          edadMaxima: max,
        });
        if (!res.exito) {
          toast.error(res.error);
          return;
        }
        toast.success("Prueba creada con éxito.");
      } else if (modalPrueba) {
        const res = await editarPrueba(
          modalPrueba.id,
          {
            nombre: nombrePrueba,
            tarifaClp: tarifa,
            edadMinima: min,
            edadMaxima: max,
          },
          modalPrueba.version
        );
        if (!res.exito) {
          toast.error(res.error);
          return;
        }
        toast.success("Prueba actualizada.");
      }
      setModalPrueba(null);
      router.refresh();
    } catch {
      toast.error("Ocurrió un error al guardar.");
    } finally {
      setGuardandoPrueba(false);
    }
  };

  const handleTogglePruebaActiva = async (p: PruebaConfigItem) => {
    try {
      const res = await editarPrueba(p.id, { activa: !p.activa }, p.version);
      if (!res.exito) {
        toast.error(res.error);
        return;
      }
      toast.success(p.activa ? "Prueba desactivada." : "Prueba reactivada.");
      router.refresh();
    } catch {
      toast.error("Error al actualizar estado.");
    }
  };

  const handleEliminarPrueba = async () => {
    if (!modalEliminar) return;
    const cantIns = modalEliminar.inscripciones?.length || 0;
    if (cantIns > 0 && !pruebaDestinoId) {
      toast.error("Debes seleccionar una prueba de destino para reasignar las inscripciones.");
      return;
    }

    try {
      setEliminando(true);
      const res = await eliminarPrueba(modalEliminar.id, pruebaDestinoId || undefined);
      if (!res.exito) {
        toast.error(res.error);
        return;
      }
      toast.success("Prueba eliminada con éxito.");
      setModalEliminar(null);
      router.refresh();
    } catch {
      toast.error("Ocurrió un error al eliminar la prueba.");
    } finally {
      setEliminando(false);
    }
  };

  // Cálculo de colisiones para modal de eliminación
  const cantInscripcionesModal = modalEliminar?.inscripciones?.length || 0;
  const otrasPruebas = pruebasIniciales.filter(
    (p) => p.id !== modalEliminar?.id && p.activa
  );
  const pruebaDestinoSeleccionada = otrasPruebas.find((p) => p.id === pruebaDestinoId);
  const binomiosDestinoSet = new Set(
    (pruebaDestinoSeleccionada?.inscripciones || []).map((ins) => ins.binomioId)
  );
  const colisiones = (modalEliminar?.inscripciones || []).filter((ins) =>
    binomiosDestinoSet.has(ins.binomioId)
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-texto-suave">
            Pruebas hípicas del concurso, tarifas y límites de edad de participantes.
          </p>
          <Button
            size="sm"
            onClick={() => abrirModalPrueba()}
            className="flex items-center gap-1.5 bg-acento hover:bg-acento/90 text-white font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva prueba</span>
          </Button>
        </div>

        {pruebasIniciales.length === 0 ? (
          <div className="border border-dashed border-borde rounded-xl p-8 text-center bg-superficie">
            <Trophy className="h-8 w-8 mx-auto text-texto-suave mb-2" />
            <p className="text-sm font-semibold text-texto">No hay pruebas configuradas</p>
            <p className="text-xs text-texto-suave mt-1 mb-4">
              Crea las pruebas de tu concurso (ej: Debutantes 0.60m, Abierta 1.10m).
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => abrirModalPrueba()}
              className="text-xs"
            >
              Crear primera prueba
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pruebasIniciales.map((p) => {
              const cantIns = p.inscripciones?.length || 0;
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border transition-all ${
                    p.activa
                      ? "bg-superficie border-borde hover:border-borde-fuerte"
                      : "bg-superficie/40 border-borde/40 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-texto truncate">{p.nombre}</h3>
                        {!p.activa && (
                          <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-medium px-1.5 py-0.5 rounded">
                            Inactiva
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-superficie-hover border border-borde text-texto-suave">
                          <Users className="h-3 w-3" />
                          {cantIns === 0 ? "Sin inscripciones" : `${cantIns} ${cantIns === 1 ? "inscripción" : "inscripciones"}`}
                        </span>
                      </div>
                      <p className="text-base font-bold text-acento mt-1">
                        {formatearMonto(p.tarifaClp)}
                      </p>
                      <div className="text-xs text-texto-suave mt-1 space-y-0.5">
                        {p.edadMinima !== null || p.edadMaxima !== null ? (
                          <p>
                            Edad jinete:{" "}
                            {p.edadMinima !== null && p.edadMaxima !== null
                              ? `${p.edadMinima} a ${p.edadMaxima} años`
                              : p.edadMinima !== null
                              ? `Mínimo ${p.edadMinima} años`
                              : `Máximo ${p.edadMaxima} años`}
                          </p>
                        ) : (
                          <p>Sin restricción de edad</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => abrirModalPrueba(p)}
                        className="h-8 w-8 p-0 text-texto-suave hover:text-texto"
                        title="Editar prueba"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTogglePruebaActiva(p)}
                        className="h-8 w-8 p-0 text-texto-suave hover:text-texto"
                        title={p.activa ? "Desactivar prueba" : "Reactivar prueba"}
                      >
                        {p.activa ? <EyeOff className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => abrirModalEliminar(p)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Eliminar prueba"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Sheet Formulario Prueba */}
      <Sheet abierta={Boolean(modalPrueba)} alCerrar={() => setModalPrueba(null)} posicion="centro">
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-texto">
              {modalPrueba === "nuevo" ? "Nueva prueba" : "Editar prueba"}
            </h2>
            <p className="text-xs text-texto-suave mt-0.5">
              Configura los valores de la prueba para este concurso.
            </p>
          </div>

          <form onSubmit={handleGuardarPrueba} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-texto">Nombre de la prueba *</Label>
              <Input
                value={nombrePrueba}
                onChange={(e) => setNombrePrueba(e.target.value)}
                placeholder="Ej: Debutantes 0.60m"
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-texto">Tarifa inscripción (CLP) *</Label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={tarifaPrueba}
                onChange={(e) => setTarifaPrueba(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-texto">Edad mínima jinete</Label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={edadMin}
                  onChange={(e) => setEdadMin(e.target.value)}
                  placeholder="Opcional"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-texto">Edad máxima jinete</Label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={edadMax}
                  onChange={(e) => setEdadMax(e.target.value)}
                  placeholder="Opcional"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-borde">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalPrueba(null)}
                disabled={guardandoPrueba}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={guardandoPrueba}
                className="bg-acento hover:bg-acento/90 text-white"
              >
                {guardandoPrueba ? "Guardando..." : "Guardar prueba"}
              </Button>
            </div>
          </form>
        </div>
      </Sheet>

      {/* Modal Confirmación de Eliminación / Reasignación */}
      <Sheet abierta={Boolean(modalEliminar)} alCerrar={() => setModalEliminar(null)} posicion="centro">
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-texto">Eliminar prueba</h2>
              <p className="text-xs text-texto-suave">
                {modalEliminar?.nombre}
              </p>
            </div>
          </div>

          {cantInscripcionesModal === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-texto">
                ¿Estás seguro de eliminar la prueba <strong>&ldquo;{modalEliminar?.nombre}&rdquo;</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="pt-4 flex justify-end gap-2 border-t border-borde">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalEliminar(null)}
                  disabled={eliminando}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleEliminarPrueba}
                  disabled={eliminando}
                >
                  {eliminando ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                Esta prueba tiene <strong>{cantInscripcionesModal}</strong> inscripción(es) activa(s). Para eliminarla, selecciona la prueba a la cual deseas reasignarlas:
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-texto">Prueba de destino *</Label>
                <select
                  value={pruebaDestinoId}
                  onChange={(e) => setPruebaDestinoId(e.target.value)}
                  className="w-full text-sm rounded-md border border-borde bg-superficie px-3 py-2 text-texto focus:outline-none focus:ring-1 focus:ring-acento"
                >
                  <option value="">-- Seleccionar prueba de destino --</option>
                  {otrasPruebas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({formatearMonto(p.tarifaClp)})
                    </option>
                  ))}
                </select>
              </div>

              {colisiones.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <p className="font-semibold">Colisión detectada</p>
                    <p className="mt-0.5">
                      No es posible reasignar a esta prueba porque los siguientes binomios ya están inscritos en ella:{" "}
                      <strong>
                        {colisiones
                          .map((c) => `${c.binomio.jinete.nombre} / ${c.binomio.caballo.nombre}`)
                          .join(", ")}
                      </strong>
                      . Debes resolver estas inscripciones previamente.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-2 border-t border-borde">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalEliminar(null)}
                  disabled={eliminando}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleEliminarPrueba}
                  disabled={eliminando || !pruebaDestinoId || colisiones.length > 0}
                >
                  {eliminando ? "Reasignando..." : "Reasignar y eliminar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
