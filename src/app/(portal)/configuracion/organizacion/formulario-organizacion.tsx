"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Building } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarOrganizacion,
  subirLogoOrganizacion,
  quitarLogoOrganizacion,
} from "@/dominio/organizacion/acciones";

interface FormularioOrganizacionProps {
  organizacion: {
    id: string;
    nombre: string;
    logoRuta: string | null;
    version: number;
  };
}

export function FormularioOrganizacion({ organizacion }: FormularioOrganizacionProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState(organizacion.nombre);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [quitandoLogo, setQuitandoLogo] = useState(false);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);

  const handleGuardarNombre = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoNombre(true);
    setErrorNombre(null);

    const res = await actualizarOrganizacion({
      id: organizacion.id,
      nombre,
      version: organizacion.version,
    });

    setGuardandoNombre(false);

    if (!res.exito) {
      setErrorNombre(res.error || "Error al actualizar la organización.");
      toast.error(res.error || "No se pudo actualizar el nombre.");
      return;
    }

    toast.success("Nombre del club actualizado.");
    router.refresh();
  };

  const handleSubirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error("El archivo supera el tamaño máximo permitido de 1 MB.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "svg") {
      toast.error("Por seguridad no se admiten archivos SVG. Usa PNG, JPEG o WebP.");
      return;
    }

    setSubiendoLogo(true);
    const formData = new FormData();
    formData.append("logo", file);
    formData.append("version", organizacion.version.toString());

    const res = await subirLogoOrganizacion(formData);
    setSubiendoLogo(false);

    if (!res.exito) {
      toast.error(res.error || "Error al subir el logo.");
      return;
    }

    toast.success("Logo actualizado correctamente.");
    router.refresh();
  };

  const handleQuitarLogo = async () => {
    if (!confirm("¿Deseas quitar el logo actual del club?")) return;

    setQuitandoLogo(true);
    const res = await quitarLogoOrganizacion(organizacion.version);
    setQuitandoLogo(false);

    if (!res.exito) {
      toast.error(res.error || "Error al quitar el logo.");
      return;
    }

    toast.success("Logo eliminado.");
    router.refresh();
  };

  const inicial = (organizacion.nombre.trim()[0] || "C").toUpperCase();

  return (
    <div className="space-y-8">
      {/* Sección Nombre del Club */}
      <form onSubmit={handleGuardarNombre} className="space-y-4">
        {errorNombre && (
          <div className="rounded-xl border border-problema-texto/30 bg-problema-fondo p-3 text-xs font-medium text-problema-texto">
            {errorNombre}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="nombreOrg">Nombre del Club u Organización *</Label>
          <Input
            id="nombreOrg"
            type="text"
            required
            minLength={3}
            maxLength={120}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Club Ecuestre Parronal"
          />
          <p className="text-[11px] text-texto-suave">
            Aparece en el menú principal, encabezado de reportes y rendición final.
          </p>
        </div>

        <Button
          type="submit"
          disabled={guardandoNombre || nombre === organizacion.nombre}
          className="min-w-[140px]"
        >
          {guardandoNombre ? "Guardando..." : "Guardar nombre"}
        </Button>
      </form>

      {/* Sección Logo del Club */}
      <div className="pt-6 border-t border-borde/60 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-texto">Logo oficial del club</h3>
          <p className="text-xs text-texto-suave mt-0.5">
            Archivos PNG, JPEG o WebP de hasta 1 MB (no se admite SVG por seguridad).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl border border-borde bg-superficie">
          {/* Visualizador del logo o inicial */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm border border-borde/40 overflow-hidden">
            {organizacion.logoRuta ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`/api/organizacion/logo?t=${Date.now()}`}
                alt="Logo del club"
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <span className="text-2xl font-bold text-texto-suave">{inicial}</span>
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleSubirLogo}
                  disabled={subiendoLogo || quitandoLogo}
                />
                <span className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-acento text-sobre-acento text-xs font-semibold hover:opacity-95 active:scale-95 transition-all select-none">
                  <Upload className="h-4 w-4" />
                  <span>{subiendoLogo ? "Subiendo..." : "Subir nuevo logo"}</span>
                </span>
              </label>

              {organizacion.logoRuta && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleQuitarLogo}
                  disabled={subiendoLogo || quitandoLogo}
                  className="text-gasto hover:bg-problema-fondo/40 border-problema-texto/20"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span>{quitandoLogo ? "Quitando..." : "Quitar logo"}</span>
                </Button>
              )}
            </div>

            <p className="text-[11px] text-texto-suave">
              {organizacion.logoRuta
                ? "El logo se muestra en el encabezado de todas las pantallas."
                : "Actualmente se muestra la inicial del club en un círculo neutro."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
