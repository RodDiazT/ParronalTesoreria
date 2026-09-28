"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Phone, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { ChipEstado } from "@/components/app/estado";
import { actualizarMiPerfil } from "@/dominio/acceso/acciones";

interface PerfilUsuarioProps {
  usuario: {
    id: string;
    nombre: string | null;
    correo: string;
    telefono: string | null;
    imagen: string | null;
  };
  membresiaActiva?: {
    rol: string | null;
  } | null;
}

export function PerfilUsuario({ usuario, membresiaActiva }: PerfilUsuarioProps) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nombre, setNombre] = useState(usuario.nombre || "");
  const [telefono, setTelefono] = useState(usuario.telefono || "");
  const [guardando, setGuardando] = useState(false);

  const abrirModal = () => {
    setNombre(usuario.nombre || "");
    setTelefono(usuario.telefono || "");
    setModalAbierto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre no puede estar vacío.");
      return;
    }

    const telLimpio = telefono.trim();
    if (telLimpio) {
      const digitos = telLimpio.replace(/\D/g, "");
      if (digitos.length < 8) {
        toast.error("El teléfono debe contener al menos 8 dígitos.");
        return;
      }
    }

    try {
      setGuardando(true);
      const res = await actualizarMiPerfil({
        nombre: nombre.trim(),
        telefono: telLimpio ? telLimpio : null,
      });

      if (!res.exito) {
        toast.error(res.error || "No se pudo actualizar el perfil.");
        return;
      }

      toast.success("Perfil actualizado correctamente");
      setModalAbierto(false);
      router.refresh();
    } catch {
      toast.error("Ocurrió un error al actualizar tu perfil.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {usuario.imagen ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={usuario.imagen}
                alt=""
                className="h-14 w-14 rounded-full border border-borde object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-acento text-sobre-acento font-bold text-lg">
                {usuario.nombre?.[0] || usuario.correo[0].toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-texto">
                {usuario.nombre || "Usuario"}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-texto-suave mt-0.5">
                <Mail className="h-3 w-3 text-texto-suave" />
                <span className="font-mono">{usuario.correo}</span>
              </div>
              {usuario.telefono && (
                <div className="flex items-center gap-1.5 text-xs text-texto-suave mt-0.5">
                  <Phone className="h-3 w-3 text-texto-suave" />
                  <span>{usuario.telefono}</span>
                </div>
              )}
              <div className="mt-2">
                {membresiaActiva ? (
                  <ChipEstado
                    tono={
                      membresiaActiva.rol === "administrador"
                        ? "listo"
                        : membresiaActiva.rol === "ayudante"
                        ? "falta"
                        : "fuera"
                    }
                    texto={`Rol: ${membresiaActiva.rol}`}
                  />
                ) : (
                  <ChipEstado tono="falta" texto="Sin membresía activa" />
                )}
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={abrirModal}
            className="flex items-center gap-1.5 text-xs"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Editar perfil</span>
          </Button>
        </div>
      </div>

      <Sheet
        abierta={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
        posicion="centro"
        titulo="Editar mi perfil"
        descripcion="Actualiza tu nombre y teléfono de contacto."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombrePerfil" className="text-xs font-medium text-texto">Nombre completo *</Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-texto-suave" />
              <Input
                id="nombrePerfil"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre completo"
                required
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telefonoPerfil" className="text-xs font-medium text-texto">Teléfono de contacto</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-texto-suave" />
              <Input
                id="telefonoPerfil"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+56 9 1234 5678"
                className="pl-9 text-sm"
              />
            </div>
            <p className="text-[11px] text-texto-suave">
              Opcional. Formato nacional o internacional.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-borde/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalAbierto(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={guardando}
              className="bg-acento hover:bg-acento/90 text-white"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
