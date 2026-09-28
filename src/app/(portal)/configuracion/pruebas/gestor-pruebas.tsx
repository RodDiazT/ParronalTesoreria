"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trophy, Tag, EyeOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { formatearMonto } from "@/lib/presentacion/formato";
import {
  crearPrueba,
  editarPrueba,
  crearConcepto,
  editarConcepto,
} from "@/dominio/inscripciones/binomios/acciones";

export interface PruebaConfigItem {
  id: string;
  nombre: string;
  tarifaClp: number;
  edadMinima: number | null;
  edadMaxima: number | null;
  orden: number;
  activa: boolean;
  version: number;
}

export interface ConceptoConfigItem {
  id: string;
  nombre: string;
  aplicaA: "binomio" | "participante";
  tarifaClp: number;
  unidad: string | null;
  categoriaReferenciaId: string | null;
  orden: number;
  activo: boolean;
  version: number;
}

interface GestorPruebasProps {
  pruebasIniciales: PruebaConfigItem[];
  conceptosIniciales: ConceptoConfigItem[];
}

export function GestorPruebas({
  pruebasIniciales,
  conceptosIniciales,
}: GestorPruebasProps) {
  const router = useRouter();
  const [pestana, setPestana] = useState<"pruebas" | "conceptos">("pruebas");

  // Modales
  const [modalPrueba, setModalPrueba] = useState<PruebaConfigItem | null | "nuevo">(null);
  const [modalConcepto, setModalConcepto] = useState<ConceptoConfigItem | null | "nuevo">(null);

  // Formulario Prueba
  const [nombrePrueba, setNombrePrueba] = useState("");
  const [tarifaPrueba, setTarifaPrueba] = useState("0");
  const [edadMin, setEdadMin] = useState("");
  const [edadMax, setEdadMax] = useState("");
  const [guardandoPrueba, setGuardandoPrueba] = useState(false);

  // Formulario Concepto
  const [nombreConcepto, setNombreConcepto] = useState("");
  const [aplicaAConcepto, setAplicaAConcepto] = useState<"binomio" | "participante">("binomio");
  const [tarifaConcepto, setTarifaConcepto] = useState("0");
  const [unidadConcepto, setUnidadConcepto] = useState("");
  const [guardandoConcepto, setGuardandoConcepto] = useState(false);

  // Abrir modal de prueba
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

  // Abrir modal de concepto
  const abrirModalConcepto = (c?: ConceptoConfigItem) => {
    if (c) {
      setModalConcepto(c);
      setNombreConcepto(c.nombre);
      setAplicaAConcepto(c.aplicaA);
      setTarifaConcepto(c.tarifaClp.toString());
      setUnidadConcepto(c.unidad || "");
    } else {
      setModalConcepto("nuevo");
      setNombreConcepto("");
      setAplicaAConcepto("binomio");
      setTarifaConcepto("0");
      setUnidadConcepto("");
    }
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

  const handleGuardarConcepto = async (e: React.FormEvent) => {
    e.preventDefault();
    const tarifa = parseInt(tarifaConcepto.replace(/\D/g, ""), 10) || 0;

    try {
      setGuardandoConcepto(true);
      if (modalConcepto === "nuevo") {
        const res = await crearConcepto({
          nombre: nombreConcepto,
          aplicaA: aplicaAConcepto,
          tarifaClp: tarifa,
          unidad: unidadConcepto || null,
        });
        if (!res.exito) {
          toast.error(res.error);
          return;
        }
        toast.success("Concepto creado con éxito.");
      } else if (modalConcepto) {
        const res = await editarConcepto(
          modalConcepto.id,
          {
            nombre: nombreConcepto,
            aplicaA: aplicaAConcepto,
            tarifaClp: tarifa,
            unidad: unidadConcepto || null,
          },
          modalConcepto.version
        );
        if (!res.exito) {
          toast.error(res.error);
          return;
        }
        toast.success("Concepto actualizado.");
      }
      setModalConcepto(null);
      router.refresh();
    } catch {
      toast.error("Ocurrió un error al guardar.");
    } finally {
      setGuardandoConcepto(false);
    }
  };

  const handleToggleConceptoActivo = async (c: ConceptoConfigItem) => {
    try {
      const res = await editarConcepto(c.id, { activo: !c.activo }, c.version);
      if (!res.exito) {
        toast.error(res.error);
        return;
      }
      toast.success(c.activo ? "Concepto desactivado." : "Concepto reactivado.");
      router.refresh();
    } catch {
      toast.error("Error al actualizar estado.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de pestañas */}
      <div className="flex border-b border-borde">
        <button
          onClick={() => setPestana("pruebas")}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            pestana === "pruebas"
              ? "border-acento text-acento"
              : "border-transparent text-texto-suave hover:text-texto"
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Pruebas ({pruebasIniciales.length})</span>
        </button>

        <button
          onClick={() => setPestana("conceptos")}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            pestana === "conceptos"
              ? "border-acento text-acento"
              : "border-transparent text-texto-suave hover:text-texto"
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>Conceptos de cobro ({conceptosIniciales.length})</span>
        </button>
      </div>

      {/* Contenido Pruebas */}
      {pestana === "pruebas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-texto-suave">
              Pruebas hípicas del concurso, tarifas y límites de edad de participantes.
            </p>
            <Button
              onClick={() => abrirModalPrueba()}
              size="sm"
              className="gap-1.5 cursor-pointer text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva prueba</span>
            </Button>
          </div>

          <div className="divide-y divide-borde/40 border border-borde rounded-2xl bg-superficie/40 overflow-hidden">
            {pruebasIniciales.length === 0 ? (
              <div className="p-8 text-center text-xs text-texto-suave">
                Aún no hay pruebas registradas. Haz clic en &quot;Nueva prueba&quot; para crear la primera.
              </div>
            ) : (
              pruebasIniciales.map((p) => (
                <div
                  key={p.id}
                  className={`p-4 flex items-center justify-between gap-3 ${
                    !p.activa ? "opacity-50 bg-superficie/20" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-texto">{p.nombre}</span>
                      {!p.activa && (
                        <span className="text-[10px] bg-borde text-texto-suave px-1.5 py-0.5 rounded">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-texto-suave mt-0.5">
                      Tarifa: <strong className="text-texto">{formatearMonto(p.tarifaClp)}</strong>
                      {(p.edadMinima !== null || p.edadMaxima !== null) && (
                        <span className="ml-2">
                          · Edades: {p.edadMinima ?? "sin mín."} a {p.edadMaxima ?? "sin máx."} años
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirModalPrueba(p)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4 text-texto-suave" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePruebaActiva(p)}
                      className="h-8 w-8 p-0"
                    >
                      {p.activa ? (
                        <EyeOff className="h-4 w-4 text-texto-suave" />
                      ) : (
                        <RotateCcw className="h-4 w-4 text-acento" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Contenido Conceptos */}
      {pestana === "conceptos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-texto-suave">
              Cuota de participación por binomio (automática) y servicios manuales (pensión, alojamiento).
            </p>
            <Button
              onClick={() => abrirModalConcepto()}
              size="sm"
              className="gap-1.5 cursor-pointer text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo concepto</span>
            </Button>
          </div>

          <div className="divide-y divide-borde/40 border border-borde rounded-2xl bg-superficie/40 overflow-hidden">
            {conceptosIniciales.length === 0 ? (
              <div className="p-8 text-center text-xs text-texto-suave">
                Aún no hay conceptos registrados. Puedes crear la cuota de binomio o servicios.
              </div>
            ) : (
              conceptosIniciales.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 flex items-center justify-between gap-3 ${
                    !c.activo ? "opacity-50 bg-superficie/20" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-texto">{c.nombre}</span>
                      <span className="text-[10px] bg-superficie border border-borde px-2 py-0.5 rounded-full font-medium text-texto-suave">
                        {c.aplicaA === "binomio" ? "Cuota automática binomio" : "Servicio participante"}
                      </span>
                      {!c.activo && (
                        <span className="text-[10px] bg-borde text-texto-suave px-1.5 py-0.5 rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-texto-suave mt-0.5">
                      Tarifa: <strong className="text-texto">{formatearMonto(c.tarifaClp)}</strong>
                      {c.unidad && <span className="ml-1">por {c.unidad}</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirModalConcepto(c)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4 text-texto-suave" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleConceptoActivo(c)}
                      className="h-8 w-8 p-0"
                    >
                      {c.activo ? (
                        <EyeOff className="h-4 w-4 text-texto-suave" />
                      ) : (
                        <RotateCcw className="h-4 w-4 text-acento" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Prueba */}
      <Sheet
        abierta={modalPrueba !== null}
        alCerrar={() => setModalPrueba(null)}
        posicion="abajo"
        titulo={modalPrueba === "nuevo" ? "Nueva prueba" : "Editar prueba"}
      >
        <form onSubmit={handleGuardarPrueba} className="space-y-4 py-2">
          <div>
            <Label htmlFor="nombrePrueba">Nombre de la prueba</Label>
            <Input
              id="nombrePrueba"
              value={nombrePrueba}
              onChange={(e) => setNombrePrueba(e.target.value)}
              placeholder="Ej: Prueba Abierta 1,10m"
              required
            />
          </div>

          <div>
            <Label htmlFor="tarifaPrueba">Tarifa (CLP)</Label>
            <Input
              id="tarifaPrueba"
              type="text"
              inputMode="numeric"
              value={tarifaPrueba}
              onChange={(e) => setTarifaPrueba(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edadMin">Edad mínima (opcional)</Label>
              <Input
                id="edadMin"
                type="number"
                value={edadMin}
                onChange={(e) => setEdadMin(e.target.value)}
                placeholder="Sin mín."
              />
            </div>
            <div>
              <Label htmlFor="edadMax">Edad máxima (opcional)</Label>
              <Input
                id="edadMax"
                type="number"
                value={edadMax}
                onChange={(e) => setEdadMax(e.target.value)}
                placeholder="Sin máx."
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalPrueba(null)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardandoPrueba} className="flex-1">
              {guardandoPrueba ? "Guardando..." : "Guardar prueba"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Modal Concepto */}
      <Sheet
        abierta={modalConcepto !== null}
        alCerrar={() => setModalConcepto(null)}
        posicion="abajo"
        titulo={modalConcepto === "nuevo" ? "Nuevo concepto" : "Editar concepto"}
      >
        <form onSubmit={handleGuardarConcepto} className="space-y-4 py-2">
          <div>
            <Label htmlFor="nombreConcepto">Nombre del concepto</Label>
            <Input
              id="nombreConcepto"
              value={nombreConcepto}
              onChange={(e) => setNombreConcepto(e.target.value)}
              placeholder="Ej: Cuota de participación, Pensión de pesebrera"
              required
            />
          </div>

          <div>
            <Label>Se cobra a</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setAplicaAConcepto("binomio")}
                className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                  aplicaAConcepto === "binomio"
                    ? "border-acento bg-acento/10 text-acento"
                    : "border-borde bg-superficie text-texto-suave"
                }`}
              >
                Binomio (Automática)
              </button>
              <button
                type="button"
                onClick={() => setAplicaAConcepto("participante")}
                className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                  aplicaAConcepto === "participante"
                    ? "border-acento bg-acento/10 text-acento"
                    : "border-borde bg-superficie text-texto-suave"
                }`}
              >
                Jinete o Club (Manual)
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="tarifaConcepto">Tarifa unitaria (CLP)</Label>
            <Input
              id="tarifaConcepto"
              type="text"
              inputMode="numeric"
              value={tarifaConcepto}
              onChange={(e) => setTarifaConcepto(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="unidadConcepto">Unidad (opcional)</Label>
            <Input
              id="unidadConcepto"
              value={unidadConcepto}
              onChange={(e) => setUnidadConcepto(e.target.value)}
              placeholder="Ej: noche, día, persona"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalConcepto(null)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardandoConcepto} className="flex-1">
              {guardandoConcepto ? "Guardando..." : "Guardar concepto"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
