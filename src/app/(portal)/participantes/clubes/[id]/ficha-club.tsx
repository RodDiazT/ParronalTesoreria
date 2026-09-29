"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  User,
  Power,
  GitMerge,
  Trash2,
  Download,
  Edit2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Rol } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { SelectorClub } from "@/components/app/selector-club";
import {
  editarClub,
  desactivarClub,
  reactivarClub,
  fusionarClubes,
  suprimirDatosClub,
  descargarDatosParticipante,
} from "@/dominio/inscripciones/participantes/acciones";
import { EstadoCuenta } from "@/components/app/estado-cuenta";

interface FichaClubProps {
  club: any;
  rol: Rol;
  estadoCuentaDatos?: any;
}

export function FichaClub({ club, rol, estadoCuentaDatos }: FichaClubProps) {
  const router = useRouter();
  const esAdmin = rol === "administrador";
  const esObservador = rol === "observador";

  const [modalEditar, setModalEditar] = useState(false);
  const [nombreEdit, setNombreEdit] = useState(club.nombre);
  const [contactoEdit, setContactoEdit] = useState(club.contacto || "");
  const [rutEdit, setRutEdit] = useState(club.rut || "");

  const [modalFusion, setModalFusion] = useState(false);
  const [duplicadoId, setDuplicadoId] = useState("");

  const [procesando, setProcesando] = useState(false);

  const handleGuardarEdicion = async () => {
    if (!nombreEdit.trim()) {
      toast.error("El nombre del club es obligatorio.");
      return;
    }
    setProcesando(true);
    try {
      const res = await editarClub(club.id, club.version, {
        nombre: nombreEdit.trim(),
        contacto: contactoEdit.trim() || null,
        rut: rutEdit.trim() || null,
      });
      if (res.exito) {
        toast.success("Club actualizado correctamente.");
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
    const accion = club.activo ? "desactivar" : "reactivar";
    if (!confirm(`¿Estás seguro de ${accion} a este club?`)) return;

    setProcesando(true);
    try {
      const res = club.activo
        ? await desactivarClub(club.id)
        : await reactivarClub(club.id);

      if (res.exito) {
        toast.success(`Club ${club.activo ? "desactivado" : "reactivado"}.`);
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
      toast.error("Selecciona el club duplicado.");
      return;
    }
    if (!confirm("Esta acción absorberá los jinetes y caballos del club duplicado. ¿Continuar?")) {
      return;
    }

    setProcesando(true);
    try {
      const res = await fusionarClubes(club.id, duplicadoId);
      if (res.exito) {
        toast.success("Clubes fusionados exitosamente.");
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
    if (!confirm("¿Deseas eliminar los datos de contacto y RUT del club conforme a la ley?")) {
      return;
    }
    setProcesando(true);
    try {
      const res = await suprimirDatosClub(club.id);
      if (res.exito) {
        toast.success("Datos suprimidos exitosamente.");
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
      const res = await descargarDatosParticipante("club", club.id);
      if (res.exito && res.contenidoCsv) {
        const blob = new Blob([res.contenidoCsv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.nombreArchivo || `club_${club.id}.csv`);
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
              <h1 className="text-lg font-bold text-texto">{club.nombre}</h1>
              {!club.activo && (
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-fuera-fondo text-fuera-texto font-medium">
                  Inactivo
                </span>
              )}
            </div>
            <div className="text-xs text-texto-secundario">
              {club.jinetes?.length || 0} jinetes • {club.caballos?.length || 0} caballos
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

        {!esObservador ? (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-borde text-xs">
            <div className="p-2.5 rounded-2xl bg-fondo space-y-0.5">
              <span className="text-[11px] text-texto-suave block">Contacto</span>
              <span className="font-semibold text-texto truncate block">
                {club.contacto || "No registrado"}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-fondo space-y-0.5">
              <span className="text-[11px] text-texto-suave block">RUT</span>
              <span className="font-semibold text-texto">{club.rut || "No registrado"}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Estado de Cuenta del Club en el evento activo */}
      {!esObservador && estadoCuentaDatos && (
        <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-texto">Estado de Cuenta del Club</h2>
            <div className="flex items-center gap-2 text-xs">
              <Link
                href="/inscripciones/nueva"
                className="text-marca hover:underline font-medium"
              >
                + Inscribir
              </Link>
              <span className="text-texto-suave">•</span>
              <Link
                href={`/movimientos/nuevo?tipo=ingreso&categoria=inscripciones&clubId=${club.id}`}
                className="text-marca hover:underline font-medium"
              >
                Registrar pago
              </Link>
            </div>
          </div>
          <EstadoCuenta sujeto={{ clubId: club.id }} datos={estadoCuentaDatos} />
        </div>
      )}

      {/* 2. Jinetes del Club */}
      <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
        <h3 className="text-sm font-bold text-texto border-b border-borde pb-2">
          Jinetes del Club ({club.jinetes?.length || 0})
        </h3>
        {club.jinetes && club.jinetes.length > 0 ? (
          <div className="space-y-1.5">
            {club.jinetes.map((j: any) => (
              <Link
                key={j.id}
                href={`/participantes/jinetes/${j.id}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-borde bg-fondo hover:border-acento text-xs font-medium text-texto transition-colors"
              >
                <span>{j.nombre}</span>
                <ChevronRight className="w-3.5 h-3.5 text-texto-suave" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-texto-secundario">
            No tiene jinetes asociados.
          </div>
        )}
      </div>

      {/* 3. Caballos del Club */}
      <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
        <h3 className="text-sm font-bold text-texto border-b border-borde pb-2">
          Caballos del Club ({club.caballos?.length || 0})
        </h3>
        {club.caballos && club.caballos.length > 0 ? (
          <div className="space-y-1.5">
            {club.caballos.map((c: any) => (
              <Link
                key={c.id}
                href={`/participantes/caballos/${c.id}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-borde bg-fondo hover:border-acento text-xs font-medium text-texto transition-colors"
              >
                <span>{c.nombre}</span>
                <ChevronRight className="w-3.5 h-3.5 text-texto-suave" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-texto-secundario">
            No tiene caballos asociados.
          </div>
        )}
      </div>

      {/* 4. Acciones Administrativas */}
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
              <span>{club.activo ? "Desactivar" : "Reactivar"}</span>
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
              <span>Eliminar contacto</span>
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

      {/* Sheet Editar Club */}
      <Sheet
        abierta={modalEditar}
        alCerrar={() => setModalEditar(false)}
        posicion="abajo"
        titulo="Editar Club"
        descripcion="Modifica los datos del club"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">Nombre del club</Label>
            <Input
              value={nombreEdit}
              onChange={(e) => setNombreEdit(e.target.value)}
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">Contacto</Label>
            <Input
              value={contactoEdit}
              onChange={(e) => setContactoEdit(e.target.value)}
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">RUT</Label>
            <Input
              value={rutEdit}
              onChange={(e) => setRutEdit(e.target.value)}
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
              disabled={procesando || !nombreEdit.trim()}
              onClick={handleGuardarEdicion}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {procesando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Sheet Fusión Club */}
      <Sheet
        abierta={modalFusion}
        alCerrar={() => setModalFusion(false)}
        posicion="abajo"
        titulo="Fusionar con Duplicado"
        descripcion={`Este club (${club.nombre}) se conservará y absorberá todos los jinetes y caballos del duplicado.`}
      >
        <div className="space-y-4 py-2">
          <SelectorClub
            clubSeleccionadoId={duplicadoId}
            alSeleccionar={(c) => setDuplicadoId(c.id)}
            alLimpiar={() => setDuplicadoId("")}
            label="Club duplicado a absorber"
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
              disabled={procesando || !duplicadoId || duplicadoId === club.id}
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
