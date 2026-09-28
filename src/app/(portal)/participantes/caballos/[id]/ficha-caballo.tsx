"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Power,
  GitMerge,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { Rol } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { SelectorClub } from "@/components/app/selector-club";
import { SelectorCaballo } from "@/components/app/selector-caballo";
import {
  editarCaballo,
  desactivarCaballo,
  reactivarCaballo,
  fusionarCaballos,
} from "@/dominio/inscripciones/participantes/acciones";

interface FichaCaballoProps {
  caballo: any;
  rol: Rol;
}

export function FichaCaballo({ caballo, rol }: FichaCaballoProps) {
  const router = useRouter();
  const esAdmin = rol === "administrador";

  const [modalEditar, setModalEditar] = useState(false);
  const [nombreEdit, setNombreEdit] = useState(caballo.nombre);
  const [clubIdEdit, setClubIdEdit] = useState(caballo.clubId);

  const [modalFusion, setModalFusion] = useState(false);
  const [duplicadoId, setDuplicadoId] = useState("");

  const [procesando, setProcesando] = useState(false);

  const handleGuardarEdicion = async () => {
    if (!nombreEdit.trim()) {
      toast.error("El nombre del caballo es obligatorio.");
      return;
    }
    if (!clubIdEdit) {
      toast.error("El club es obligatorio.");
      return;
    }

    setProcesando(true);
    try {
      const res = await editarCaballo(caballo.id, caballo.version, {
        nombre: nombreEdit.trim(),
        clubId: clubIdEdit,
      });
      if (res.exito) {
        toast.success("Caballo actualizado correctamente.");
        setModalEditar(false);
        router.refresh();
      } else {
        toast.error(res.error || "No fue posible actualizar.");
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleToggleActivo = async () => {
    const accion = caballo.activo ? "desactivar" : "reactivar";
    if (!confirm(`¿Estás seguro de ${accion} a este caballo?`)) return;

    setProcesando(true);
    try {
      const res = caballo.activo
        ? await desactivarCaballo(caballo.id)
        : await reactivarCaballo(caballo.id);

      if (res.exito) {
        toast.success(`Caballo ${caballo.activo ? "desactivado" : "reactivado"}.`);
        router.refresh();
      } else {
        toast.error(res.error || "Error al cambiar estado.");
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleFusionar = async () => {
    if (!duplicadoId) {
      toast.error("Selecciona el caballo duplicado.");
      return;
    }
    if (!confirm("Esta acción absorberá los binomios del caballo duplicado. ¿Continuar?")) {
      return;
    }

    setProcesando(true);
    try {
      const res = await fusionarCaballos(caballo.id, duplicadoId);
      if (res.exito) {
        toast.success("Caballos fusionados exitosamente.");
        setModalFusion(false);
        setDuplicadoId("");
        router.refresh();
      } else {
        toast.error(res.error || "Error durante la fusión.");
      }
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8">
      {/* 1. Encabezado */}
      <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-texto">{caballo.nombre}</h1>
              {!caballo.activo && (
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-fuera-fondo text-fuera-texto font-medium">
                  Inactivo
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-texto-secundario">
              <Building2 className="w-3.5 h-3.5 text-texto-suave" />
              <span>Club: {caballo.clubNombre || "Sin club"}</span>
            </div>
          </div>

          {esAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalEditar(true)}
              className="h-8 rounded-xl text-xs gap-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Binomios del Caballo */}
      {caballo.binomios && caballo.binomios.length > 0 && (
        <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
          <h3 className="text-sm font-bold text-texto border-b border-borde pb-2">
            Binomios Registrados
          </h3>
          <div className="space-y-2">
            {caballo.binomios.map((b: any) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 rounded-2xl border border-borde bg-fondo text-xs"
              >
                <div>
                  <span className="font-semibold text-texto block">{b.jineteNombre}</span>
                  <span className="text-[11px] text-texto-secundario">{b.eventoNombre}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Acciones Administrativas */}
      {esAdmin && (
        <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
          <h3 className="text-xs font-bold text-texto-secundario uppercase tracking-wider">
            Administración
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleActivo}
              disabled={procesando}
              className="h-10 rounded-2xl text-xs gap-1.5"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{caballo.activo ? "Desactivar" : "Reactivar"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setModalFusion(true)}
              disabled={procesando}
              className="h-10 rounded-2xl text-xs gap-1.5"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Fusionar duplicado</span>
            </Button>
          </div>
        </div>
      )}

      {/* Sheet Editar Caballo */}
      <Sheet
        abierta={modalEditar}
        alCerrar={() => setModalEditar(false)}
        posicion="abajo"
        titulo="Editar Caballo"
        descripcion="Modifica el nombre o club del caballo"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">Nombre del caballo</Label>
            <Input
              value={nombreEdit}
              onChange={(e) => setNombreEdit(e.target.value)}
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <SelectorClub
              clubSeleccionadoId={clubIdEdit}
              alSeleccionar={(c) => setClubIdEdit(c.id)}
              alLimpiar={() => setClubIdEdit("")}
              label="Club"
              requerido
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalEditar(false)}
              className="flex-1 rounded-2xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={procesando || !nombreEdit.trim() || !clubIdEdit}
              onClick={handleGuardarEdicion}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {procesando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Sheet Fusión Caballo */}
      <Sheet
        abierta={modalFusion}
        alCerrar={() => setModalFusion(false)}
        posicion="abajo"
        titulo="Fusionar con Duplicado"
        descripcion={`Este caballo (${caballo.nombre}) se conservará y absorberá los binomios del duplicado.`}
      >
        <div className="space-y-4 py-2">
          <SelectorCaballo
            caballoSeleccionadoId={duplicadoId}
            alSeleccionar={(c) => setDuplicadoId(c.id)}
            alLimpiar={() => setDuplicadoId("")}
            label="Caballo duplicado a absorber"
            requerido
            permitirCrear={false}
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalFusion(false)}
              className="flex-1 rounded-2xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={procesando || !duplicadoId || duplicadoId === caballo.id}
              onClick={handleFusionar}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {procesando ? "Fusionando..." : "Confirmar fusión"}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
