"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  Calendar,
  Phone,
  ShieldCheck,
  Edit2,
  Trash2,
  Download,
  AlertTriangle,
  Plus,
  GitMerge,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import { Rol, RelacionApoderado } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { AlertasJinete } from "@/components/app/alertas-jinete";
import { SelectorClub } from "@/components/app/selector-club";
import { SelectorApoderado } from "@/components/app/selector-apoderado";
import { SelectorJinete } from "@/components/app/selector-jinete";
import {
  editarJinete,
  desactivarJinete,
  reactivarJinete,
  vincularApoderado,
  desvincularApoderado,
  registrarAutorizacion,
  fusionarJinetes,
  suprimirDatosJinete,
  descargarDatosParticipante,
} from "@/dominio/inscripciones/participantes/acciones";
import { obtenerHoyEnChile } from "@/dominio/inscripciones/participantes/reglas";

interface FichaJineteProps {
  jinete: any;
  rol: Rol;
}

export function FichaJinete({ jinete, rol }: FichaJineteProps) {
  const router = useRouter();
  const esAdmin = rol === "administrador";
  const esObservador = rol === "observador";
  const puedeCompletar = rol === "administrador" || rol === "ayudante";

  // Modal Edición
  const [modalEditar, setModalEditar] = useState(false);
  const [nombreEdit, setNombreEdit] = useState(jinete.nombre);
  const [clubIdEdit, setClubIdEdit] = useState(jinete.clubId);
  const [fechaNacEdit, setFechaNacEdit] = useState(
    jinete.fechaNacimiento
      ? new Date(jinete.fechaNacimiento).toISOString().split("T")[0]
      : ""
  );
  const [contactoEdit, setContactoEdit] = useState(jinete.contacto || "");
  const [rutEdit, setRutEdit] = useState(jinete.rut || "");

  // Modal Vincular Apoderado
  const [modalVincularAp, setModalVincularAp] = useState(false);
  const [nuevoApId, setNuevoApId] = useState("");
  const [relacionAp, setRelacionAp] = useState<RelacionApoderado>("madre");

  // Modal Registrar Autorización
  const [modalAutorizacion, setModalAutorizacion] = useState(false);
  const hoyChile = obtenerHoyEnChile();
  const fechaHoyStr = `${hoyChile[0]}-${String(hoyChile[1]).padStart(2, "0")}-${String(
    hoyChile[2]
  ).padStart(2, "0")}`;
  const [fechaAut, setFechaAut] = useState(fechaHoyStr);

  // Modal Fusión
  const [modalFusion, setModalFusion] = useState(false);
  const [duplicadoId, setDuplicadoId] = useState("");

  const [procesando, setProcesando] = useState(false);

  // Manejo de Edición
  const handleGuardarEdicion = async () => {
    if (!nombreEdit.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (!clubIdEdit) {
      toast.error("El club es obligatorio.");
      return;
    }

    setProcesando(true);
    try {
      const res = await editarJinete(jinete.id, jinete.version, {
        nombre: nombreEdit.trim(),
        clubId: clubIdEdit,
        fechaNacimiento: fechaNacEdit.trim() || null,
        contacto: contactoEdit.trim() || null,
        rut: rutEdit.trim() || null,
      });

      if (res.exito) {
        toast.success("Jinete actualizado correctamente.");
        setModalEditar(false);
        router.refresh();
      } else {
        toast.error(res.error || "No fue posible actualizar.");
      }
    } finally {
      setProcesando(false);
    }
  };

  // Manejo Vincular Apoderado
  const handleVincularApoderado = async () => {
    if (!nuevoApId) {
      toast.error("Selecciona un apoderado.");
      return;
    }

    setProcesando(true);
    try {
      const res = await vincularApoderado(jinete.id, {
        apoderadoId: nuevoApId,
        relacion: relacionAp,
      });

      if (res.exito) {
        toast.success("Apoderado vinculado exitosamente.");
        setModalVincularAp(false);
        setNuevoApId("");
        router.refresh();
      } else {
        toast.error(res.error || "Error al vincular apoderado.");
      }
    } finally {
      setProcesando(false);
    }
  };

  // Manejo Desvincular Apoderado
  const handleDesvincularApoderado = async (apoderadoId: string) => {
    if (!confirm("¿Deseas quitar este apoderado del jinete?")) return;

    setProcesando(true);
    try {
      const res = await desvincularApoderado(jinete.id, apoderadoId);
      if (res.exito) {
        toast.success("Apoderado desvinculado.");
        router.refresh();
      } else {
        toast.error(res.error || "Error al desvincular.");
      }
    } finally {
      setProcesando(false);
    }
  };

  // Manejo Registrar Autorización
  const handleRegistrarAutorizacion = async () => {
    if (!fechaAut) {
      toast.error("Ingresa la fecha de recepción.");
      return;
    }

    setProcesando(true);
    try {
      const res = await registrarAutorizacion(jinete.id, fechaAut);
      if (res.exito) {
        toast.success("Autorización registrada exitosamente.");
        setModalAutorizacion(false);
        router.refresh();
      } else {
        toast.error(res.error || "Error al registrar autorización.");
      }
    } finally {
      setProcesando(false);
    }
  };

  // Manejo Desactivar / Reactivar
  const handleToggleActivo = async () => {
    const accionTexto = jinete.activo ? "desactivar" : "reactivar";
    if (!confirm(`¿Estás seguro de ${accionTexto} a este jinete?`)) return;

    setProcesando(true);
    try {
      const res = jinete.activo
        ? await desactivarJinete(jinete.id)
        : await reactivarJinete(jinete.id);

      if (res.exito) {
        toast.success(`Jinete ${jinete.activo ? "desactivado" : "reactivado"} exitosamente.`);
        router.refresh();
      } else {
        toast.error(res.error || "Error al cambiar estado.");
      }
    } finally {
      setProcesando(false);
    }
  };

  // Manejo Fusión
  const handleFusionar = async () => {
    if (!duplicadoId) {
      toast.error("Selecciona el jinete duplicado a absorber.");
      return;
    }

    if (!confirm("Esta acción absorberá los datos del duplicado y no se puede deshacer. ¿Continuar?")) {
      return;
    }

    setProcesando(true);
    try {
      const res = await fusionarJinetes(jinete.id, duplicadoId);
      if (res.exito) {
        toast.success("Fusión completada exitosamente.");
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

  // Manejo Suprimir Datos (Ley de Privacidad)
  const handleSuprimirDatos = async () => {
    if (!confirm("¿Deseas eliminar los datos de contacto y RUT de este jinete conforme a la Ley de Privacidad?")) {
      return;
    }

    setProcesando(true);
    try {
      const res = await suprimirDatosJinete(jinete.id);
      if (res.exito) {
        toast.success("Datos de contacto suprimidos.");
        router.refresh();
      } else {
        toast.error(res.error || "Error al suprimir datos.");
      }
    } finally {
      setProcesando(false);
    }
  };

  // Descarga CSV Portabilidad
  const handleDescargarCsv = async () => {
    try {
      const res = await descargarDatosParticipante("jinete", jinete.id);
      if (res.exito && res.contenidoCsv) {
        const blob = new Blob([res.contenidoCsv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.nombreArchivo || `jinete_${jinete.id}.csv`);
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
      {/* 1. Encabezado de la Ficha */}
      <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-texto">{jinete.nombre}</h1>
              {!jinete.activo && (
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-fuera-fondo text-fuera-texto font-medium">
                  Inactivo
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-texto-secundario">
              <Building2 className="w-3.5 h-3.5 text-texto-suave" />
              <span>Club: {jinete.club?.nombre || "Sin club"}</span>
            </div>
          </div>

          {esAdmin && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalEditar(true)}
                className="h-8 rounded-xl text-xs gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </Button>
            </div>
          )}
        </div>

        {/* Alertas completas del Jinete */}
        {jinete.alertas && jinete.alertas.length > 0 && (
          <AlertasJinete alertas={jinete.alertas} modo="completo" className="pt-1" />
        )}

        {/* Datos Personales (Protegidos al Observador) */}
        {!esObservador ? (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-borde text-xs">
            <div className="p-2.5 rounded-2xl bg-fondo space-y-0.5">
              <span className="text-[11px] text-texto-suave block">Edad en el concurso</span>
              <span className="font-semibold text-texto">
                {jinete.edad !== null ? `${jinete.edad} años` : "Sin fecha registrada"}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-fondo space-y-0.5">
              <span className="text-[11px] text-texto-suave block">Fecha de nacimiento</span>
              <span className="font-semibold text-texto">
                {jinete.fechaNacimiento
                  ? new Date(jinete.fechaNacimiento).toISOString().split("T")[0]
                  : "No registrada"}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-fondo space-y-0.5">
              <span className="text-[11px] text-texto-suave block">Contacto directo</span>
              <span className="font-semibold text-texto truncate block">
                {jinete.contacto || "No registrado"}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-fondo space-y-0.5">
              <span className="text-[11px] text-texto-suave block">RUT</span>
              <span className="font-semibold text-texto">{jinete.rut || "No registrado"}</span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-fondo text-xs text-texto-secundario">
            Datos personales restringidos para el rol observador.
          </div>
        )}
      </div>

      {/* 2. Sección Apoderados (Oculta al Observador) */}
      {!esObservador && (
        <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
          <div className="flex items-center justify-between border-b border-borde pb-2.5">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-acento" />
              <h3 className="text-sm font-bold text-texto">
                Apoderados y Contactos de Emergencia
              </h3>
            </div>
            {puedeCompletar && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalVincularAp(true)}
                className="h-8 rounded-xl text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </Button>
            )}
          </div>

          {jinete.apoderados && jinete.apoderados.length > 0 ? (
            <div className="space-y-2">
              {jinete.apoderados.map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-borde bg-fondo"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-texto">{a.nombre}</div>
                    <div className="text-[11px] text-texto-secundario capitalize">
                      {a.relacion.replace("_", " ")}
                    </div>
                    {a.telefono && (
                      <a
                        href={`tel:${a.telefono}`}
                        className="inline-flex items-center gap-1 text-xs text-acento font-medium hover:underline pt-0.5"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{a.telefono}</span>
                      </a>
                    )}
                  </div>

                  {esAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDesvincularApoderado(a.apoderadoId)}
                      className="p-1.5 rounded-full text-problema hover:bg-problema-fondo transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-fondo text-center text-xs text-texto-secundario">
              No tiene apoderados registrados.
            </div>
          )}
        </div>
      )}

      {/* 3. Sección Autorización (<14 años) */}
      {!esObservador && jinete.edad !== null && jinete.edad < 14 && (
        <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
          <div className="flex items-center justify-between border-b border-borde pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-acento" />
              <h3 className="text-sm font-bold text-texto">Autorización de Menor de 14 Años</h3>
            </div>
            {puedeCompletar && !jinete.autorizacionApoderadoFecha && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalAutorizacion(true)}
                className="h-8 rounded-xl text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar</span>
              </Button>
            )}
          </div>

          {jinete.autorizacionApoderadoFecha ? (
            <div className="p-3 rounded-2xl bg-listo-fondo/40 border border-listo-borde/40 text-xs text-listo-texto space-y-0.5">
              <div className="font-semibold">Autorización recibida</div>
              <div className="text-[11px] opacity-90">
                Fecha registrada:{" "}
                {new Date(jinete.autorizacionApoderadoFecha).toISOString().split("T")[0]}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-falta-fondo/50 border border-falta-borde/50 text-xs text-falta-texto space-y-1">
              <div className="font-semibold">Falta registrar la autorización</div>
              <div className="text-[11px]">
                La comisión debe dejar constancia de la recepción de la autorización del apoderado.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Binomios del Evento */}
      {jinete.binomios && jinete.binomios.length > 0 && (
        <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
          <h3 className="text-sm font-bold text-texto border-b border-borde pb-2">
            Binomios Registrados
          </h3>
          <div className="space-y-2">
            {jinete.binomios.map((b: any) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 rounded-2xl border border-borde bg-fondo text-xs"
              >
                <div>
                  <span className="font-semibold text-texto block">{b.caballoNombre}</span>
                  <span className="text-[11px] text-texto-secundario">{b.eventoNombre}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Acciones Administrativas */}
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
              <span>{jinete.activo ? "Desactivar" : "Reactivar"}</span>
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

      {/* Sheet Editar Jinete */}
      <Sheet
        abierta={modalEditar}
        alCerrar={() => setModalEditar(false)}
        posicion="abajo"
        titulo="Editar Jinete"
        descripcion="Modifica los datos del jinete"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">Nombre completo</Label>
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

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">Fecha de nacimiento</Label>
            <Input
              type="date"
              value={fechaNacEdit}
              onChange={(e) => setFechaNacEdit(e.target.value)}
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
              disabled={procesando || !nombreEdit.trim() || !clubIdEdit}
              onClick={handleGuardarEdicion}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {procesando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Sheet Vincular Apoderado */}
      <Sheet
        abierta={modalVincularAp}
        alCerrar={() => setModalVincularAp(false)}
        posicion="abajo"
        titulo="Vincular Apoderado"
        descripcion="Asigna un apoderado responsable para este jinete"
      >
        <div className="space-y-4 py-2">
          <SelectorApoderado
            apoderadoSeleccionadoId={nuevoApId}
            alSeleccionar={(a) => setNuevoApId(a.id)}
            alLimpiar={() => setNuevoApId("")}
            label="Apoderado"
            requerido
          />

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">Relación con el jinete</Label>
            <select
              value={relacionAp}
              onChange={(e) => setRelacionAp(e.target.value as RelacionApoderado)}
              className="w-full h-10 px-3 rounded-2xl border border-borde bg-superficie text-xs font-medium text-texto"
            >
              <option value="madre">Madre</option>
              <option value="padre">Padre</option>
              <option value="tutor_legal">Tutor legal</option>
              <option value="otro_familiar">Otro familiar</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalVincularAp(false)}
              className="flex-1 rounded-2xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={procesando || !nuevoApId}
              onClick={handleVincularApoderado}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {procesando ? "Vinculando..." : "Vincular"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Sheet Registrar Autorización */}
      <Sheet
        abierta={modalAutorizacion}
        alCerrar={() => setModalAutorizacion(false)}
        posicion="abajo"
        titulo="Registrar Autorización"
        descripcion="Constancia de recepción de la autorización del menor de 14 años"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">Fecha de recepción</Label>
            <Input
              type="date"
              value={fechaAut}
              onChange={(e) => setFechaAut(e.target.value)}
              className="rounded-2xl"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalAutorizacion(false)}
              className="flex-1 rounded-2xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={procesando || !fechaAut}
              onClick={handleRegistrarAutorizacion}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {procesando ? "Registrando..." : "Registrar autorización"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Sheet Fusión de Jinete */}
      <Sheet
        abierta={modalFusion}
        alCerrar={() => setModalFusion(false)}
        posicion="abajo"
        titulo="Fusionar con Duplicado"
        descripcion={`Este jinete (${jinete.nombre}) se conservará y absorberá los vínculos y binomios del duplicado.`}
      >
        <div className="space-y-4 py-2">
          <SelectorJinete
            jineteSeleccionadoId={duplicadoId}
            alSeleccionar={(j) => setDuplicadoId(j.id)}
            alLimpiar={() => setDuplicadoId("")}
            label="Jinete duplicado que será absorbido y desactivado"
            requerido
          />

          <div className="p-3 rounded-2xl bg-falta-fondo/50 border border-falta-borde/50 text-xs text-falta-texto">
            Se transferirán sus apoderados y binomios al jinete actual. El registro duplicado
            quedará inactivo con referencia a este.
          </div>

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
              disabled={procesando || !duplicadoId || duplicadoId === jinete.id}
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
