"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowUp, ArrowDown, Edit2, Shield, EyeOff, RotateCcw, ArrowRightLeft } from "lucide-react";
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
} from "@/dominio/organizacion/categorias";

export interface CategoriaItem {
  id: string;
  nombre: string;
  tipo: "ingreso" | "gasto";
  claveSistema: string | null;
  exigeContraparte: boolean;
  activa: boolean;
  orden: number;
  version: number;
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
  const [guardandoCrear, setGuardandoCrear] = useState(false);
  const [sugerenciaReactivar, setSugerenciaReactivar] = useState<{ id: string; nombre: string } | null>(null);

  // Estados del formulario editar
  const [nombreEditado, setNombreEditado] = useState("");
  const [guardandoEditar, setGuardandoEditar] = useState(false);

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

  const handleRenombrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditar) return;

    setGuardandoEditar(true);
    const res = await renombrarCategoria(modalEditar.id, nombreEditado, modalEditar.version);
    setGuardandoEditar(false);

    if (!res.exito) {
      toast.error(res.error || "No se pudo renombrar la categoría.");
      return;
    }

    toast.success("Categoría renombrada.");
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

                    <div className="flex items-center gap-2 mt-1">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-texto-suave hover:text-texto">
                        <Checkbox
                          checked={cat.exigeContraparte}
                          onCheckedChange={() => handleToggleContraparte(cat)}
                          className="h-4 w-4"
                        />
                        <span>Exige contraparte</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setModalEditar(cat);
                      setNombreEditado(cat.nombre);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-texto-suave hover:bg-fondo hover:text-texto cursor-pointer"
                    title="Renombrar"
                    aria-label="Renombrar"
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

                <Button
                  onClick={() => handleReactivar(cat)}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reactivar</span>
                </Button>
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

      {/* Modal / Sheet Renombrar Categoría */}
      <Sheet
        abierta={Boolean(modalEditar)}
        alCerrar={() => setModalEditar(null)}
        posicion="centro"
        titulo="Renombrar categoría"
        descripcion="El nuevo nombre se reflejará en todos los movimientos históricos."
      >
        <form onSubmit={handleRenombrar} className="space-y-4">
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
              autoFocus
            />
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
              disabled={guardandoEditar || !nombreEditado.trim() || nombreEditado === modalEditar?.nombre}
            >
              {guardandoEditar ? "Guardando..." : "Guardar nombre"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
