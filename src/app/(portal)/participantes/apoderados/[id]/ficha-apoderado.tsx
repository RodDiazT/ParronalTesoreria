"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  Power,
  GitMerge,
  Trash2,
  Download,
  Edit2,
  ChevronRight,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Rol } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { SelectorApoderado } from "@/components/app/selector-apoderado";
import {
  editarApoderado,
  desactivarApoderado,
  reactivarApoderado,
  fusionarApoderados,
  suprimirDatosApoderado,
  descargarDatosParticipante,
} from "@/dominio/inscripciones/participantes/acciones";

interface FichaApoderadoProps {
  apoderado: any;
  rol: Rol;
}

export function FichaApoderado({ apoderado, rol }: FichaApoderadoProps) {
  const router = useRouter();
  const esAdmin = rol === "administrador";

  const [modalEditar, setModalEditar] = useState(false);
  const [nombreEdit, setNombreEdit] = useState(apoderado.nombre);
  const [telefonoEdit, setTelefonoEdit] = useState(apoderado.telefono || "");

  const [modalFusion, setModalFusion] = useState(false);
  const [duplicadoId, setDuplicadoId] = useState("");

  const [procesando, setProcesando] = useState(false);

  const handleGuardarEdicion = async () => {
    if (!nombreEdit.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (!telefonoEdit.trim() || telefonoEdit.trim().length < 8) {
      toast.error("El teléfono debe tener al menos 8 dígitos.");
      return;
    }

    setProcesando(true);
    try {
      const res = await editarApoderado(apoderado.id, apoderado.version, {
        nombre: nombreEdit.trim(),
        telefono: telefonoEdit.trim(),
      });
      if (res.exito) {
        toast.success("Apoderado actualizado correctamente.");
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
    const accion = apoderado.activo ? "desactivar" : "reactivar";
    if (!confirm(`¿Estás seguro de ${accion} a este apoderado?`)) return;

    setProcesando(true);
    try {
      const res = apoderado.activo
        ? await desactivarApoderado(apoderado.id)
        : await reactivarApoderado(apoderado.id);

      if (res.exito) {
        toast.success(`Apoderado ${apoderado.activo ? "desactivado" : "reactivado"}.`);
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
      toast.error("Selecciona el apoderado duplicado.");
      return;
    }
    if (!confirm("Esta acción absorberá los vínculos del duplicado y no se puede deshacer. ¿Continuar?")) {
      return;
    }

    setProcesando(true);
    try {
      const res = await fusionarApoderados(apoderado.id, duplicadoId);
      if (res.exito) {
        toast.success("Apoderados fusionados exitosamente.");
        setModalFusion(false);
        setDuplicadoId("");
        router.refresh();
      } else {
        toast.error(res.error || "Error en la fusión.");
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleSuprimirDatos = async () => {
    if (!confirm("¿Deseas eliminar el teléfono de este apoderado conforme a la ley?")) {
      return;
    }
    setProcesando(true);
    try {
      const res = await suprimirDatosApoderado(apoderado.id);
      if (res.exito) {
        toast.success("Teléfono suprimido exitosamente.");
        router.refresh();
      } else {
        toast.error(res.error || "Error al suprimir.");
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleDescargarCsv = async () => {
    try {
      const res = await descargarDatosParticipante("apoderado", apoderado.id);
      if (res.exito && res.contenidoCsv) {
        const blob = new Blob([res.contenidoCsv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.nombreArchivo || `apoderado_${apoderado.id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Archivo descargado.");
      }
    } catch {
      toast.error("Error al descargar archivo.");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8">
      {/* 1. Encabezado */}
      <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-texto">{apoderado.nombre}</h1>
              {!apoderado.activo && (
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-fuera-fondo text-fuera-texto font-medium">
                  Inactivo
                </span>
              )}
            </div>
            <div className="text-xs text-texto-secundario">
              {apoderado.jinetes?.length || 0} jinetes a cargo
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

        <div className="pt-2 border-t border-borde">
          <div className="p-3 rounded-2xl bg-fondo flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] text-texto-suave block">Teléfono / WhatsApp</span>
              <span className="font-semibold text-sm text-texto">
                {apoderado.telefono || "Sin teléfono registrado"}
              </span>
            </div>
            {apoderado.telefono && (
              <a
                href={`tel:${apoderado.telefono}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-superficie border border-borde text-xs font-semibold text-acento hover:border-acento transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Llamar</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2. Jinetes Vinculados */}
      <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
        <h3 className="text-sm font-bold text-texto border-b border-borde pb-2">
          Jinetes Vinculados ({apoderado.jinetes?.length || 0})
        </h3>
        {apoderado.jinetes && apoderado.jinetes.length > 0 ? (
          <div className="space-y-1.5">
            {apoderado.jinetes.map((j: any) => (
              <Link
                key={j.id}
                href={`/participantes/jinetes/${j.jineteId}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-borde bg-fondo hover:border-acento text-xs font-medium text-texto transition-colors"
              >
                <div>
                  <div className="font-semibold">{j.nombre}</div>
                  <div className="text-[11px] text-texto-secundario capitalize">
                    {j.clubNombre && `${j.clubNombre} • `}
                    Relación: {j.relacion.replace("_", " ")}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-texto-suave" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-texto-secundario">
            No tiene jinetes vinculados.
          </div>
        )}
      </div>

      {/* 3. Acciones Administrativas */}
      {esAdmin && (
        <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
          <h3 className="text-xs font-bold text-texto-secundario uppercase tracking-wider">
            Administración y Derechos del Titular
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
              <span>{apoderado.activo ? "Desactivar" : "Reactivar"}</span>
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

            <Button
              type="button"
              variant="outline"
              onClick={handleSuprimirDatos}
              disabled={procesando}
              className="h-10 rounded-2xl text-xs gap-1.5 text-problema hover:bg-problema-fondo border-borde"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar teléfono</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleDescargarCsv}
              disabled={procesando}
              className="h-10 rounded-2xl text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar CSV</span>
            </Button>
          </div>
        </div>
      )}

      {/* Sheet Editar Apoderado */}
      <Sheet
        abierta={modalEditar}
        alCerrar={() => setModalEditar(false)}
        posicion="abajo"
        titulo="Editar Apoderado"
        descripcion="Modifica el nombre o teléfono del apoderado"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">Nombre del apoderado</Label>
            <Input
              value={nombreEdit}
              onChange={(e) => setNombreEdit(e.target.value)}
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">Teléfono</Label>
            <Input
              value={telefonoEdit}
              onChange={(e) => setTelefonoEdit(e.target.value)}
              className="rounded-2xl"
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
              disabled={procesando || !nombreEdit.trim() || !telefonoEdit.trim()}
              onClick={handleGuardarEdicion}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {procesando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Sheet Fusión Apoderado */}
      <Sheet
        abierta={modalFusion}
        alCerrar={() => setModalFusion(false)}
        posicion="abajo"
        titulo="Fusionar con Duplicado"
        descripcion={`Este apoderado (${apoderado.nombre}) se conservará y absorberá los jinetes del duplicado.`}
      >
        <div className="space-y-4 py-2">
          <SelectorApoderado
            apoderadoSeleccionadoId={duplicadoId}
            alSeleccionar={(a) => setDuplicadoId(a.id)}
            alLimpiar={() => setDuplicadoId("")}
            label="Apoderado duplicado a absorber"
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
              disabled={procesando || !duplicadoId || duplicadoId === apoderado.id}
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
