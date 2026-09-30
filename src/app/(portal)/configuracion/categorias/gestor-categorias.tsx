"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowUp, ArrowDown, Edit2, Shield, EyeOff, RotateCcw, ArrowRightLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet } from "@/components/ui/sheet";
import {
  crearCategoria,
  renombrarCategoria,
  cambiarTipoCategoria,
  conmutarExigeContraparte,
  desactivarCategoria,
  reactivarCategoria,
  reordenarCategoria,
  eliminarCategoria,
  actualizarCategoria,
} from "@/dominio/organizacion/categorias";

export interface CategoriaItem {
  id: string;
  nombre: string;
  tipo: "ingreso" | "gasto";
  claveSistema: string | null;
  exigeContraparte: boolean;
  sujetoAsociado?: string | null;
  exigeSujeto?: boolean;
  tarifaBaseClp?: number | null;
  activa: boolean;
  orden: number;
  version: number;
  cantidadMovimientos?: number;
}

interface GestorCategoriasProps {
  categoriasIniciales: CategoriaItem[];
}

export function GestorCategorias({ categoriasIniciales }: GestorCategoriasProps) {
  const router = useRouter();
  const [pestana, setPestana] = useState<"ingreso" | "gasto">("ingreso");
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState<CategoriaItem | null>(null);

  // Estados del formulario crear
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoExigeContraparte, setNuevoExigeContraparte] = useState(false);
  const [nuevoSujetoAsociado, setNuevoSujetoAsociado] = useState<string>("");
  const [nuevoExigeSujeto, setNuevoExigeSujeto] = useState(false);
  const [nuevaTarifaBase, setNuevaTarifaBase] = useState<string>("");
  const [guardandoCrear, setGuardandoCrear] = useState(false);
  const [sugerenciaReactivar, setSugerenciaReactivar] = useState<{ id: string; nombre: string } | null>(null);

  // Estados del formulario editar
  const [nombreEditado, setNombreEditado] = useState("");
  const [exigeContraparteEditado, setExigeContraparteEditado] = useState(false);
  const [sujetoAsociadoEditado, setSujetoAsociadoEditado] = useState<string>("");
  const [exigeSujetoEditado, setExigeSujetoEditado] = useState(false);
  const [tarifaBaseEditada, setTarifaBaseEditada] = useState<string>("");
  const [guardandoEditar, setGuardandoEditar] = useState(false);

  // Estados modal eliminar
  const [modalEliminar, setModalEliminar] = useState<CategoriaItem | null>(null);
  const [categoriaDestinoId, setCategoriaDestinoId] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const categoriasFiltradas = categoriasIniciales
    .filter((c) => c.tipo === pestana)
    .sort((a, b) => a.orden - b.orden);

  const activas = categoriasFiltradas.filter((c) => c.activa);
  const desactivadas = categoriasFiltradas.filter((c) => !c.activa);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoCrear(true);
    setSugerenciaReactivar(null);

    const res = await crearCategoria({
      nombre: nuevoNombre,
      tipo: pestana,
      exigeContraparte: nuevoExigeContraparte,
      sujetoAsociado: (nuevoSujetoAsociado as any) || null,
      exigeSujeto: nuevoSujetoAsociado ? nuevoExigeSujeto : false,
      tarifaBaseClp: nuevaTarifaBase ? parseInt(nuevaTarifaBase, 10) : null,
    });

    setGuardandoCrear(false);

    if (!res.exito) {
      if (res.existeDesactivada && res.categoriaId && res.nombre) {
        setSugerenciaReactivar({ id: res.categoriaId, nombre: res.nombre });
      } else {
        toast.error(res.error || "No se pudo crear la categoría.");
      }
      return;
    }

    toast.success("Categoría creada con éxito.");
    setNuevoNombre("");
    setNuevoExigeContraparte(false);
    setNuevoSujetoAsociado("");
    setNuevoExigeSujeto(false);
    setNuevaTarifaBase("");
    setModalCrear(false);
    router.refresh();
  };

  const handleReactivarSugerida = async (id: string) => {
    const cat = categoriasIniciales.find((c) => c.id === id);
    if (!cat) return;

    const res = await reactivarCategoria(id, cat.version);
    if (res.exito) {
      toast.success(`Categoría «${cat.nombre}» reactivada.`);
      setModalCrear(false);
      setSugerenciaReactivar(null);
      setNuevoNombre("");
      router.refresh();
    } else {
      toast.error(res.error || "Error al reactivar.");
    }
  };

  const abrirModalEditar = (cat: CategoriaItem) => {
    setModalEditar(cat);
    setNombreEditado(cat.nombre);
    setExigeContraparteEditado(cat.exigeContraparte);
    setSujetoAsociadoEditado(cat.sujetoAsociado || "");
    setExigeSujetoEditado(Boolean(cat.exigeSujeto));
    setTarifaBaseEditada(cat.tarifaBaseClp ? String(cat.tarifaBaseClp) : "");
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditar) return;

    setGuardandoEditar(true);
    const res = await actualizarCategoria({
      id: modalEditar.id,
      version: modalEditar.version,
      nombre: nombreEditado,
      exigeContraparte: exigeContraparteEditado,
      sujetoAsociado: (sujetoAsociadoEditado as any) || null,
      exigeSujeto: sujetoAsociadoEditado ? exigeSujetoEditado : false,
      tarifaBaseClp: tarifaBaseEditada ? parseInt(tarifaBaseEditada, 10) : null,
    });
    setGuardandoEditar(false);

    if (!res.exito) {
      toast.error(res.error || "No se pudo actualizar la categoría.");
      return;
    }

    toast.success("Categoría actualizada con éxito.");
    setModalEditar(null);
    router.refresh();
  };

  const handleReordenar = async (id: string, direccion: "subir" | "bajar") => {
    const res = await reordenarCategoria(id, direccion);
    if (!res.exito) {
      toast.error(res.error || "No se pudo reordenar.");
      return;
    }
    router.refresh();
  };

  const handleToggleContraparte = async (cat: CategoriaItem) => {
    const res = await conmutarExigeContraparte(cat.id, !cat.exigeContraparte, cat.version);
    if (!res.exito) {
      toast.error(res.error || "Error al modificar la categoría.");
      return;
    }
    toast.success(
      !cat.exigeContraparte
        ? `«${cat.nombre}» ahora exige contraparte obligatoria.`
        : `«${cat.nombre}» ya no exige contraparte obligatoria.`
    );
    router.refresh();
  };

  const handleDesactivar = async (cat: CategoriaItem) => {
    if (cat.claveSistema) {
      toast.error("Las categorías de sistema no se pueden desactivar.");
      return;
    }

    if (!confirm(`¿Deseas desactivar la categoría «${cat.nombre}»? No aparecerá al registrar nuevos movimientos.`)) {
      return;
    }

    const res = await desactivarCategoria(cat.id, cat.version);
    if (!res.exito) {
      toast.error(res.error || "No se pudo desactivar.");
      return;
    }
    toast.success("Categoría desactivada.");
    router.refresh();
  };

  const handleReactivar = async (cat: CategoriaItem) => {
    const res = await reactivarCategoria(cat.id, cat.version);
    if (!res.exito) {
      toast.error(res.error || "No se pudo reactivar.");
      return;
    }
    toast.success("Categoría reactivada.");
    router.refresh();
  };

  const handleCambiarTipo = async (cat: CategoriaItem) => {
    const nuevoTipo = cat.tipo === "ingreso" ? "gasto" : "ingreso";
    if (!confirm(`¿Cambiar «${cat.nombre}» de ${cat.tipo} a ${nuevoTipo}?`)) return;

    const res = await cambiarTipoCategoria(cat.id, nuevoTipo, cat.version);
    if (!res.exito) {
      toast.error(res.error || "No se pudo cambiar el tipo.");
      return;
    }
    toast.success(`Categoría movida a ${nuevoTipo}s.`);
    router.refresh();
  };

  const handleEliminarCategoria = async () => {
    if (!modalEliminar) return;
    const cantMov = modalEliminar.cantidadMovimientos || 0;
    if (cantMov > 0 && !categoriaDestinoId) {
      toast.error("Debes seleccionar una categoría de destino para reasignar los movimientos.");
      return;
    }

    try {
      setEliminando(true);
      const res = await eliminarCategoria(modalEliminar.id, categoriaDestinoId || undefined);
      if (!res.exito) {
        toast.error(res.error || "No se pudo eliminar la categoría.");
        return;
      }
      toast.success("Categoría eliminada con éxito.");
      setModalEliminar(null);
      router.refresh();
    } catch {
      toast.error("Ocurrió un error al eliminar la categoría.");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas Ingresos / Gastos */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex rounded-xl bg-superficie p-1 border border-borde">
          <button
            onClick={() => setPestana("ingreso")}
            className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              pestana === "ingreso"
                ? "bg-fondo text-ingreso shadow-xs"
                : "text-texto-suave hover:text-texto"
            }`}
          >
            Ingresos
          </button>
          <button
            onClick={() => setPestana("gasto")}
            className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              pestana === "gasto"
                ? "bg-fondo text-gasto shadow-xs"
                : "text-texto-suave hover:text-texto"
            }`}
          >
            Gastos
          </button>
        </div>

        <Button
          onClick={() => {
            setNuevoNombre("");
            setNuevoExigeContraparte(pestana === "ingreso");
            setSugerenciaReactivar(null);
            setModalCrear(true);
          }}
          size="sm"
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva categoría</span>
        </Button>
      </div>

      {/* Lista de Categorías Activas */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-texto uppercase tracking-wider">
          Categorías activas ({activas.length})
        </h3>

        {activas.length === 0 ? (
          <div className="p-6 text-center text-xs text-texto-suave bg-superficie rounded-2xl border border-borde">
            No hay categorías activas registradas en esta sección.
          </div>
        ) : (
          <div className="divide-y divide-borde/60 rounded-2xl border border-borde bg-superficie overflow-hidden shadow-xs">
            {activas.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-fondo/50 transition-colors gap-3"
              >
                {/* Nombre y datos */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleReordenar(cat.id, "subir")}
                      disabled={idx === 0}
                      className="p-1 text-texto-suave hover:text-texto disabled:opacity-20 cursor-pointer"
                      title="Subir"
                      aria-label="Subir"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleReordenar(cat.id, "bajar")}
                      disabled={idx === activas.length - 1}
                      className="p-1 text-texto-suave hover:text-texto disabled:opacity-20 cursor-pointer"
                      title="Bajar"
                      aria-label="Bajar"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-texto leading-tight">
                        {cat.nombre}
                      </span>
                      {cat.claveSistema && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-superficie border border-borde px-2 py-0.2 text-[10px] font-bold text-texto-suave"
                          title="Categoría administrada por el sistema"
                        >
                          <Shield className="h-2.5 w-2.5" />
                          Sistema
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-texto-suave hover:text-texto">
                        <Checkbox
                          checked={cat.exigeContraparte}
                          onCheckedChange={() => handleToggleContraparte(cat)}
                          className="h-4 w-4"
                        />
                        <span>Exige contraparte</span>
                      </label>
                      {cat.sujetoAsociado && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                          Asocia {cat.sujetoAsociado === "binomio_prueba" ? "binomio y prueba" : cat.sujetoAsociado} {cat.exigeSujeto ? "(obligatorio)" : "(opcional)"}
                        </span>
                      )}
                      {cat.tarifaBaseClp && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 text-stone-800 dark:text-stone-200 px-2 py-0.5 text-[10px] font-semibold tabular-nums">
                          Tarifa estándar: ${cat.tarifaBaseClp.toLocaleString("es-CL")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => abrirModalEditar(cat)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-texto-suave hover:bg-fondo hover:text-texto cursor-pointer"
                    title="Editar categoría"
                    aria-label="Editar"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  {!cat.claveSistema && (
                    <>
                      <button
                        onClick={() => handleCambiarTipo(cat)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-texto-suave hover:bg-fondo hover:text-texto cursor-pointer"
                        title={`Cambiar a ${cat.tipo === "ingreso" ? "gasto" : "ingreso"}`}
                        aria-label="Cambiar tipo"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDesactivar(cat)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-texto-suave hover:bg-problema-fondo/40 hover:text-gasto cursor-pointer"
                        title="Desactivar categoría"
                        aria-label="Desactivar"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setModalEliminar(cat);
                          setCategoriaDestinoId("");
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 cursor-pointer"
                        title="Eliminar categoría"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Categorías Desactivadas */}
      {desactivadas.length > 0 && (
        <div className="space-y-2.5 pt-4">
          <h3 className="text-xs font-bold text-texto-suave uppercase tracking-wider">
            Desactivadas ({desactivadas.length})
          </h3>

          <div className="divide-y divide-borde/60 rounded-2xl border border-borde bg-superficie/50 overflow-hidden">
            {desactivadas.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3.5 sm:p-4 opacity-75"
              >
                <div>
                  <span className="text-sm font-medium text-texto line-through">
                    {cat.nombre}
                  </span>
                  <p className="text-[11px] text-texto-suave">
                    Oculta al registrar nuevos movimientos
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => handleReactivar(cat)}
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reactivar</span>
                  </Button>

                  {!cat.claveSistema && (
                    <Button
                      onClick={() => {
                        setModalEliminar(cat);
                        setCategoriaDestinoId("");
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal / Sheet Crear Categoría */}
      <Sheet
        abierta={modalCrear}
        alCerrar={() => setModalCrear(false)}
        posicion="centro"
        titulo={`Nueva categoría de ${pestana}`}
        descripcion={`Se añadirá al final de la lista de ${pestana}s.`}
      >
        <form onSubmit={handleCrear} className="space-y-4">
          {sugerenciaReactivar && (
            <div className="p-3.5 rounded-xl border border-falta-texto/30 bg-falta-fondo text-xs text-falta-texto space-y-2">
              <p>
                Ya existe una categoría llamada <strong>«{sugerenciaReactivar.nombre}»</strong> desactivada.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => handleReactivarSugerida(sugerenciaReactivar.id)}
                className="w-full text-xs"
              >
                Reactivar «{sugerenciaReactivar.nombre}»
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="catNombre">Nombre de la categoría *</Label>
            <Input
              id="catNombre"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: Pintura de vallas"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="catSujeto">Asociar a entidad deportiva</Label>
            <select
              id="catSujeto"
              value={nuevoSujetoAsociado}
              onChange={(e) => setNuevoSujetoAsociado(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-stone-300 bg-white text-xs text-stone-800"
            >
              <option value="">Ninguna (general)</option>
              <option value="caballo">Caballo (ej. pensión, pesebrera, herraje)</option>
              <option value="jinete">Jinete (ej. cuota jinete, acreditación)</option>
              <option value="binomio">Binomio (ej. binomio, inscripción)</option>
              <option value="club">Club (ej. cuota club, garantía)</option>
              <option value="prueba">Prueba (ej. auspicio prueba, premios)</option>
              <option value="binomio_prueba">Binomio y Prueba (ej. inscripciones por prueba)</option>
            </select>
          </div>

          {nuevoSujetoAsociado && (
            <>
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="catTarifaBase">Tarifa estándar predeterminada (opcional)</Label>
                <Input
                  id="catTarifaBase"
                  type="number"
                  min={0}
                  step={1000}
                  value={nuevaTarifaBase}
                  onChange={(e) => setNuevaTarifaBase(e.target.value)}
                  placeholder="Ej: 100000"
                />
                <p className="text-[11px] text-texto-suave">
                  Monto sugerido automáticamente al asignar este servicio en terreno.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="catExigeSujeto"
                  checked={nuevoExigeSujeto}
                  onCheckedChange={(c) => setNuevoExigeSujeto(Boolean(c))}
                />
                <Label htmlFor="catExigeSujeto" className="text-xs cursor-pointer font-normal">
                  Es obligatorio seleccionar {nuevoSujetoAsociado} al registrar el movimiento
                </Label>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="catExigeContraparte"
              checked={nuevoExigeContraparte}
              onCheckedChange={(c) => setNuevoExigeContraparte(Boolean(c))}
            />
            <Label htmlFor="catExigeContraparte" className="text-xs cursor-pointer font-normal">
              Exigir contraparte obligatoria al registrar
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-borde/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalCrear(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardandoCrear || !nuevoNombre.trim()}>
              {guardandoCrear ? "Creando..." : "Crear categoría"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Modal / Sheet Editar Categoría */}
      <Sheet
        abierta={Boolean(modalEditar)}
        alCerrar={() => setModalEditar(null)}
        posicion="centro"
        titulo="Editar categoría"
        descripcion="Configura las propiedades y asociaciones de la categoría."
      >
        <form onSubmit={handleEditar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="catNombreEditar">Nombre de la categoría *</Label>
            <Input
              id="catNombreEditar"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={nombreEditado}
              onChange={(e) => setNombreEditado(e.target.value)}
              disabled={Boolean(modalEditar?.claveSistema)}
              autoFocus
            />
            {modalEditar?.claveSistema && (
              <p className="text-[11px] text-stone-500">
                El nombre de las categorías del sistema no se puede modificar.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="catSujetoEditar">Asociar a entidad deportiva</Label>
            <select
              id="catSujetoEditar"
              value={sujetoAsociadoEditado}
              onChange={(e) => setSujetoAsociadoEditado(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-stone-300 bg-white text-xs text-stone-800"
            >
              <option value="">Ninguna (general)</option>
              <option value="caballo">Caballo (ej. pensión, pesebrera, herraje)</option>
              <option value="jinete">Jinete (ej. cuota jinete, acreditación)</option>
              <option value="binomio">Binomio (ej. binomio, inscripción)</option>
              <option value="club">Club (ej. cuota club, garantía)</option>
              <option value="prueba">Prueba (ej. auspicio prueba, premios)</option>
              <option value="binomio_prueba">Binomio y Prueba (ej. inscripciones por prueba)</option>
            </select>
          </div>

          {sujetoAsociadoEditado && (
            <>
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="catTarifaBaseEditar">Tarifa estándar predeterminada (opcional)</Label>
                <Input
                  id="catTarifaBaseEditar"
                  type="number"
                  min={0}
                  step={1000}
                  value={tarifaBaseEditada}
                  onChange={(e) => setTarifaBaseEditada(e.target.value)}
                  placeholder="Ej: 100000"
                />
                <p className="text-[11px] text-texto-suave">
                  Monto sugerido automáticamente al asignar este servicio en terreno.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="catExigeSujetoEditar"
                  checked={exigeSujetoEditado}
                  onCheckedChange={(c) => setExigeSujetoEditado(Boolean(c))}
                />
                <Label htmlFor="catExigeSujetoEditar" className="text-xs cursor-pointer font-normal">
                  Es obligatorio seleccionar {sujetoAsociadoEditado === "binomio_prueba" ? "binomio y prueba" : sujetoAsociadoEditado} al registrar el movimiento
                </Label>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="catExigeContraparteEditar"
              checked={exigeContraparteEditado}
              onCheckedChange={(c) => setExigeContraparteEditado(Boolean(c))}
            />
            <Label htmlFor="catExigeContraparteEditar" className="text-xs cursor-pointer font-normal">
              Exigir contraparte (proveedor/auspiciador) obligatoria al registrar
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-borde/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalEditar(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardandoEditar || !nombreEditado.trim()}
            >
              {guardandoEditar ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Modal / Sheet Eliminar Categoría */}
      <Sheet
        abierta={Boolean(modalEliminar)}
        alCerrar={() => setModalEliminar(null)}
        posicion="centro"
        titulo="Eliminar categoría"
        descripcion={modalEliminar?.nombre}
      >
        {modalEliminar && (
          <div className="space-y-4">
            {(modalEliminar.cantidadMovimientos || 0) === 0 ? (
              <>
                <p className="text-sm text-texto">
                  ¿Estás seguro de eliminar la categoría <strong>«{modalEliminar.nombre}»</strong>? Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-end gap-2 pt-3 border-t border-borde/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalEliminar(null)}
                    disabled={eliminando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleEliminarCategoria}
                    disabled={eliminando}
                  >
                    {eliminando ? "Eliminando..." : "Eliminar"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  Esta categoría tiene <strong>{modalEliminar.cantidadMovimientos}</strong> movimiento(s) asociado(s). Para eliminarla, selecciona la categoría a la cual deseas reasignarlos:
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="catDestino" className="text-xs font-medium text-texto">Categoría de destino *</Label>
                  <select
                    id="catDestino"
                    value={categoriaDestinoId}
                    onChange={(e) => setCategoriaDestinoId(e.target.value)}
                    className="w-full text-sm rounded-md border border-borde bg-superficie px-3 py-2 text-texto focus:outline-none focus:ring-1 focus:ring-acento"
                  >
                    <option value="">-- Seleccionar categoría de destino --</option>
                    {categoriasIniciales
                      .filter(
                        (c) =>
                          c.id !== modalEliminar.id &&
                          c.tipo === modalEliminar.tipo &&
                          c.activa
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.claveSistema ? "(Sistema)" : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-borde/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalEliminar(null)}
                    disabled={eliminando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleEliminarCategoria}
                    disabled={eliminando || !categoriaDestinoId}
                  >
                    {eliminando ? "Reasignando..." : "Reasignar y eliminar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
