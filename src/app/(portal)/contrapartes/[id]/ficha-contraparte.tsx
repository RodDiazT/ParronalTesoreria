"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Edit2,
  Trash2,
  GitMerge,
  RotateCcw,
  EyeOff,
  Building2,
  Phone,
  CreditCard,
  History,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet } from "@/components/ui/sheet";
import { ChipEstado } from "@/components/app/estado";
import {
  ContraparteDTO,
  editarContraparte,
  desactivarContraparte,
  reactivarContraparte,
  fusionarContrapartes,
  suprimirDatosContraparte,
} from "@/dominio/organizacion/contrapartes";

interface FichaContraparteProps {
  contraparte: ContraparteDTO;
  otrasContrapartes: { id: string; nombre: string; rut: string | null }[];
  esAdministrador: boolean;
  esObservador: boolean;
}

export function FichaContraparte({
  contraparte,
  otrasContrapartes,
  esAdministrador,
  esObservador,
}: FichaContraparteProps) {
  const router = useRouter();

  // Modales
  const [modalEditar, setModalEditar] = useState(false);
  const [modalFusionar, setModalFusionar] = useState(false);
  const [modalSuprimir, setModalSuprimir] = useState(false);

  // Estados de edición
  const [nombre, setNombre] = useState(contraparte.nombre);
  const [esAuspiciador, setEsAuspiciador] = useState(contraparte.esAuspiciador);
  const [esProveedor, setEsProveedor] = useState(contraparte.esProveedor);
  const [contacto, setContacto] = useState(contraparte.contacto || "");
  const [rut, setRut] = useState(contraparte.rut || "");
  const [guardando, setGuardando] = useState(false);

  // Estados de fusión
  const [otraSeleccionadaId, setOtraSeleccionadaId] = useState("");
  const [fusionando, setFusionando] = useState(false);

  // Estados de supresión
  const [suprimiendo, setSuprimiendo] = useState(false);

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    const res = await editarContraparte(
      contraparte.id,
      {
        nombre,
        esAuspiciador,
        esProveedor,
        contacto: contacto.trim() || null,
        rut: rut.trim() || null,
      },
      contraparte.version
    );

    setGuardando(false);

    if (!res.exito) {
      toast.error(res.error || "Error al actualizar la contraparte.");
      return;
    }

    toast.success("Contraparte actualizada.");
    setModalEditar(false);
    router.refresh();
  };

  const handleDesactivar = async () => {
    if (!confirm("¿Deseas desactivar esta contraparte? No se ofrecerá al registrar nuevos movimientos.")) {
      return;
    }

    const res = await desactivarContraparte(contraparte.id, contraparte.version);
    if (!res.exito) {
      toast.error(res.error || "No se pudo desactivar.");
      return;
    }
    toast.success("Contraparte desactivada.");
    router.refresh();
  };

  const handleReactivar = async () => {
    const res = await reactivarContraparte(contraparte.id, contraparte.version);
    if (!res.exito) {
      toast.error(res.error || "No se pudo reactivar.");
      return;
    }
    toast.success("Contraparte reactivada.");
    router.refresh();
  };

  const handleFusionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otraSeleccionadaId) {
      toast.error("Selecciona la contraparte duplicada para fusionar.");
      return;
    }

    setFusionando(true);
    // Esta contraparte se conserva, la seleccionada es el duplicado que se desactiva
    const res = await fusionarContrapartes(contraparte.id, otraSeleccionadaId);
    setFusionando(false);

    if (!res.exito) {
      toast.error(res.error || "Error al fusionar contrapartes.");
      return;
    }

    toast.success(`Fusión completada. Se reasignaron ${res.movimientosReasignados ?? 0} movimientos.`);
    setModalFusionar(false);
    router.refresh();
  };

  const handleSuprimirDatos = async () => {
    setSuprimiendo(true);
    const res = await suprimirDatosContraparte(contraparte.id, contraparte.version);
    setSuprimiendo(false);

    if (!res.exito) {
      toast.error(res.error || "No se pudieron suprimir los datos.");
      return;
    }

    toast.success("Datos de contacto y RUT eliminados por derecho de privacidad.");
    setModalSuprimir(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-texto leading-tight">
                {contraparte.nombre}
              </h2>
              {!contraparte.activa && <ChipEstado tono="fuera" texto="Desactivada" />}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {contraparte.esAuspiciador && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-listo-fondo text-listo-texto">
                  Auspiciador
                </span>
              )}
              {contraparte.esProveedor && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-falta-fondo text-falta-texto">
                  Proveedor
                </span>
              )}
              {!contraparte.esAuspiciador && !contraparte.esProveedor && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-superficie border border-borde text-texto-suave">
                  Otro tercero
                </span>
              )}
            </div>
          </div>

          {/* Acciones principales de Administrador */}
          {esAdministrador && (
            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNombre(contraparte.nombre);
                  setEsAuspiciador(contraparte.esAuspiciador);
                  setEsProveedor(contraparte.esProveedor);
                  setContacto(contraparte.contacto || "");
                  setRut(contraparte.rut || "");
                  setModalEditar(true);
                }}
                className="gap-1.5 text-xs"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Editar</span>
              </Button>

              {contraparte.activa ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDesactivar}
                  className="gap-1.5 text-xs text-texto-suave hover:text-gasto"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Desactivar</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReactivar}
                  className="gap-1.5 text-xs text-acento"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reactivar</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Datos de contacto y RUT (Ocultos para Observador) */}
        {!esObservador && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-borde/60 text-xs">
            <div className="flex items-center gap-2 text-texto-suave">
              <CreditCard className="h-4 w-4 shrink-0 text-texto-suave/80" />
              <span>
                RUT:{" "}
                <strong className="text-texto font-medium">
                  {contraparte.rut || "No registrado"}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-texto-suave">
              <Phone className="h-4 w-4 shrink-0 text-texto-suave/80" />
              <span>
                Contacto:{" "}
                <strong className="text-texto font-medium">
                  {contraparte.contacto || "No registrado"}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Historial de Movimientos Asociados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-texto uppercase tracking-wider">
            Movimientos registrados ({contraparte.movimientosCount ?? 0})
          </h3>
        </div>

        <div className="p-8 text-center text-xs text-texto-suave rounded-2xl border border-borde bg-superficie">
          <History className="mx-auto h-8 w-8 text-texto-suave/40 mb-2" />
          <p className="font-medium text-texto">Sin movimientos registrados</p>
          <p className="text-[11px] text-texto-suave mt-0.5">
            Los ingresos o gastos asociados a esta contraparte se mostrarán aquí una vez registrados en el portal.
          </p>
        </div>
      </div>

      {/* Opciones avanzadas de Administrador: Fusión y Supresión */}
      {esAdministrador && (
        <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-4">
          <h3 className="text-xs font-bold text-texto uppercase tracking-wider">
            Herramientas de Administración y Privacidad
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOtraSeleccionadaId("");
                setModalFusionar(true);
              }}
              className="gap-2 text-xs justify-start"
            >
              <GitMerge className="h-4 w-4 text-acento" />
              <span>Fusionar duplicados</span>
            </Button>

            {(contraparte.contacto || contraparte.rut) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalSuprimir(true)}
                className="gap-2 text-xs text-gasto hover:bg-problema-fondo/40 border-problema-texto/20 justify-start"
              >
                <ShieldAlert className="h-4 w-4 text-gasto" />
                <span>Eliminar datos de contacto (Ley 19.628 / 21.719)</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Modal Editar */}
      <Sheet
        abierta={modalEditar}
        alCerrar={() => setModalEditar(false)}
        posicion="centro"
        titulo="Editar contraparte"
        descripcion="Modifica la identificación o datos de contacto."
      >
        <form onSubmit={handleEditar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edNombre">Nombre o Razón Social *</Label>
            <Input
              id="edNombre"
              type="text"
              required
              minLength={2}
              maxLength={120}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-2 pt-1">
            <Label>Tipo de relación</Label>
            <div className="flex items-center gap-5">
              <label className="inline-flex items-center gap-2 text-xs text-texto cursor-pointer">
                <Checkbox
                  checked={esAuspiciador}
                  onCheckedChange={(c) => setEsAuspiciador(Boolean(c))}
                />
                <span>Auspiciador</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs text-texto cursor-pointer">
                <Checkbox
                  checked={esProveedor}
                  onCheckedChange={(c) => setEsProveedor(Boolean(c))}
                />
                <span>Proveedor</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="edRut">RUT</Label>
              <Input
                id="edRut"
                type="text"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="12.345.678-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edContacto">Contacto (teléfono o email)</Label>
              <Input
                id="edContacto"
                type="text"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="+56 9 1234 5678"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-borde/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalEditar(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando || !nombre.trim()}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Modal Fusionar Duplicados */}
      <Sheet
        abierta={modalFusionar}
        alCerrar={() => setModalFusionar(false)}
        posicion="centro"
        titulo="Fusionar con otra contraparte"
        descripcion={`Se conservará «${contraparte.nombre}» y se reasignarán los movimientos del duplicado.`}
      >
        <form onSubmit={handleFusionar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otraContraparte">Selecciona la contraparte duplicada</Label>
            <select
              id="otraContraparte"
              value={otraSeleccionadaId}
              onChange={(e) => setOtraSeleccionadaId(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-borde bg-fondo px-3 text-sm text-texto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento cursor-pointer"
            >
              <option value="">Selecciona una contraparte...</option>
              {otrasContrapartes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre} {o.rut ? `(RUT: ${o.rut})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 rounded-xl border border-borde bg-superficie text-xs space-y-1.5 text-texto-suave">
            <p>
              • Los movimientos del duplicado pasarán a <strong>«{contraparte.nombre}»</strong>.
            </p>
            <p>
              • Los datos de contacto o RUT vacíos se completarán con los del duplicado.
            </p>
            <p>
              • La contraparte duplicada quedará desactivada de forma automática.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-borde/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalFusionar(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={fusionando || !otraSeleccionadaId}
              variant="default"
            >
              {fusionando ? "Fusionando..." : "Confirmar fusión"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Modal Suprimir Datos de Contacto (Derecho de Supresión) */}
      <Sheet
        abierta={modalSuprimir}
        alCerrar={() => setModalSuprimir(false)}
        posicion="centro"
        titulo="Eliminar datos de contacto y RUT"
        descripcion="Conforme a los derechos de privacidad de la Ley 19.628 / 21.719."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-problema-texto/30 bg-problema-fondo text-xs text-problema-texto space-y-2">
            <p className="font-semibold">Esta acción es irreversible.</p>
            <p>
              Se borrarán el teléfono, correo y RUT registrados de esta contraparte. El nombre de la empresa/persona y el historial de sus movimientos de dinero se conservarán íntegros para respaldo contable de la comisión.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-borde/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalSuprimir(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={suprimiendo}
              onClick={handleSuprimirDatos}
            >
              {suprimiendo ? "Eliminando..." : "Eliminar datos personales"}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
