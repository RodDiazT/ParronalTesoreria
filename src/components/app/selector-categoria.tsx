"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { Label } from "@/components/ui/label";
import { obtenerCategoriasSelector } from "@/dominio/organizacion/categorias";

export interface OpcionCategoria {
  id: string;
  nombre: string;
  tipo: "ingreso" | "gasto";
  exigeContraparte: boolean;
  claveSistema: string | null;
  orden: number;
}

interface SelectorCategoriaProps {
  tipo: "ingreso" | "gasto";
  valorSeleccionado?: string;
  claveSistemaSeleccionada?: string;
  alSeleccionar: (categoria: OpcionCategoria) => void;
  id?: string;
  label?: string;
  error?: string;
}

/**
 * Selector desplegable de categorías con botones grandes para una mano en celular.
 * (docs/organizacion/organizacion-evento.md §3.4 y §5.4)
 */
export function SelectorCategoria({
  tipo,
  valorSeleccionado,
  claveSistemaSeleccionada,
  alSeleccionar,
  id = "selector-categoria",
  label = "Categoría *",
  error,
}: SelectorCategoriaProps) {
  const [categorias, setCategorias] = useState<OpcionCategoria[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);

    obtenerCategoriasSelector(tipo)
      .then((data) => {
        if (!cancelado) {
          const cats = data as OpcionCategoria[];
          setCategorias(cats);
          setCargando(false);

          if (!valorSeleccionado && claveSistemaSeleccionada) {
            const encontrada = cats.find(
              (c) =>
                c.claveSistema === claveSistemaSeleccionada ||
                c.nombre.toLowerCase() === claveSistemaSeleccionada.toLowerCase()
            );
            if (encontrada) {
              alSeleccionar(encontrada);
            }
          }
        }
      })
      .catch(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, claveSistemaSeleccionada]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>

      <div className="relative">
        <select
          id={id}
          value={valorSeleccionado || ""}
          disabled={cargando}
          onChange={(e) => {
            const cat = categorias.find((c) => c.id === e.target.value);
            if (cat) alSeleccionar(cat);
          }}
          className="flex h-12 w-full appearance-none rounded-xl border border-borde bg-fondo px-3.5 py-2.5 text-sm text-texto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <option value="" disabled>
            {cargando ? "Cargando categorías..." : "Selecciona una categoría"}
          </option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre} {cat.exigeContraparte ? "(Exige contraparte)" : ""}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-texto-suave">
          <Tag className="h-4 w-4" />
        </div>
      </div>

      {error && <p className="text-xs text-gasto">{error}</p>}
    </div>
  );
}
