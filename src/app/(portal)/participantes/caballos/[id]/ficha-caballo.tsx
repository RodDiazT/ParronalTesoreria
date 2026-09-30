"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Power,
  GitMerge,
  Edit2,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Rol } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { SelectorClub } from "@/components/app/selector-club";
import { SelectorCaballo } from "@/components/app/selector-caballo";
import { formatearMonto } from "@/lib/presentacion/formato";
import {
  editarCaballo,
  desactivarCaballo,
  reactivarCaballo,
  fusionarCaballos,
} from "@/dominio/inscripciones/participantes/acciones";
import { crearCargo } from "@/dominio/servicios/cargos";

interface FichaCaballoProps {
  caballo: any;
  rol: Rol;
  cargos?: any[];
  categoriasServicio?: { id: string; nombre: string; tarifaBaseClp: number | null }[];
}

export function FichaCaballo({
  caballo,
  rol,
  cargos = [],
  categoriasServicio = [],
}: FichaCaballoProps) {
  const router = useRouter();
  const esAdmin = rol === "administrador";

  const [modalEditar, setModalEditar] = useState(false);
  const [nombreEdit, setNombreEdit] = useState(caballo.nombre);
  const [clubIdEdit, setClubIdEdit] = useState(caballo.clubId);

  const [modalFusion, setModalFusion] = useState(false);
  const [duplicadoId, setDuplicadoId] = useState("");

  const [procesando, setProcesando] = useState(false);

  // Modal Asignar Servicio
  const [modalAsignarServicio, setModalAsignarServicio] = useState(false);
  const [categoriaSeleccionadaId, setCategoriaSeleccionadaId] = useState("");
  const [cantidadCargo, setCantidadCargo] = useState(1);
  const [tarifaCargoClp, setTarifaCargoClp] = useState(0);
  const [descripcionCargo, setDescripcionCargo] = useState("");
  const [pagarAhora, setPagarAhora] = useState(false);
  const [medioPago, setMedioPago] = useState<"transferencia" | "efectivo">("transferencia");
  const [nombreOrigen, setNombreOrigen] = useState("");

  const handleCrearCargoCaballo = async () => {
    if (!categoriaSeleccionadaId) {
      toast.error("Selecciona un servicio.");
      return;
    }
    setProcesando(true);
    try {
      const payload: any = {
        categoriaId: categoriaSeleccionadaId,
        caballoId: caballo.id,
        cantidad: cantidadCargo,
        tarifaClp: tarifaCargoClp,
        descripcion: descripcionCargo.trim() || undefined,
        claveCliente: `cargo-caballo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };
      if (pagarAhora) {
        payload.pagoInmediato = {
          medioPago,
          nombreOrigen: nombreOrigen.trim() || undefined,
        };
      }
      const res = await crearCargo(payload);
      if (res.exito) {
        toast.success("Servicio registrado para el caballo.");
        setModalAsignarServicio(false);
        router.refresh();
      } else {
        toast.error(res.error || "Error al registrar servicio.");
      }
    } finally {
      setProcesando(false);
    }
  };

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

      {/* 3. Servicios y Cargos del Caballo */}
      <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
        <div className="flex items-center justify-between border-b border-borde pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🏷️</span>
            <h3 className="text-sm font-bold text-texto">
              Servicios y Cargos del Concurso
            </h3>
          </div>
          {rol !== "observador" && categoriasServicio && categoriasServicio.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCategoriaSeleccionadaId(categoriasServicio[0]?.id || "");
                setTarifaCargoClp(categoriasServicio[0]?.tarifaBaseClp || 0);
                setCantidadCargo(1);
                setDescripcionCargo("");
                setPagarAhora(false);
                setModalAsignarServicio(true);
              }}
              className="h-8 rounded-xl text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Asignar servicio</span>
            </Button>
          )}
        </div>

        {cargos && cargos.length > 0 ? (
          <div className="space-y-2">
            {cargos.map((c: any) => {
              const estaPagado = c.saldoClp === 0;
              const esParcial = c.pagadoClp > 0 && c.saldoClp > 0;

              return (
                <div
                  key={c.id}
                  className="flex items-start justify-between p-3 rounded-2xl border border-borde bg-fondo text-xs gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/servicios/${c.categoriaId}`}
                        className="font-bold text-texto hover:text-acento transition-colors"
                      >
                        {c.categoriaNombre}
                      </Link>
                      {estaPagado ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-listo-fondo px-2 py-0.5 text-[10px] font-semibold text-listo-texto">
                          <CheckCircle2 className="h-3 w-3" />
                          Pagado
                        </span>
                      ) : esParcial ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-falta-fondo px-2 py-0.5 text-[10px] font-semibold text-falta-texto">
                          <Clock className="h-3 w-3" />
                          Parcial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-problema-fondo px-2 py-0.5 text-[10px] font-semibold text-gasto">
                          <AlertCircle className="h-3 w-3" />
                          Pendiente
                        </span>
                      )}
                    </div>
                    {c.cantidad > 1 && (
                      <p className="text-[11px] text-texto-secundario mt-0.5">
                        {c.cantidad} × {formatearMonto(c.tarifaClp)}
                      </p>
                    )}
                    {c.descripcion && (
                      <p className="text-[11px] text-texto-secundario italic mt-0.5">
                        &ldquo;{c.descripcion}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-texto block">{formatearMonto(c.montoClp)}</span>
                    {c.saldoClp > 0 ? (
                      <span className="text-[11px] text-falta-texto font-medium block">
                        Saldo: {formatearMonto(c.saldoClp)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ingreso font-medium block">
                        Completado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-texto-suave py-2">
            No tiene servicios ni cargos operativos registrados en el concurso activo.
          </p>
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

      {/* Sheet Asignar Servicio al Caballo */}
      <Sheet
        abierta={modalAsignarServicio}
        alCerrar={() => setModalAsignarServicio(false)}
        posicion="centro"
        titulo={`Asignar Servicio a ${caballo.nombre}`}
        descripcion="Registra un servicio operativo o cargo para este caballo."
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-texto">Servicio / Categoría</Label>
            <select
              value={categoriaSeleccionadaId}
              onChange={(e) => {
                const catId = e.target.value;
                setCategoriaSeleccionadaId(catId);
                const cat = categoriasServicio?.find((c) => c.id === catId);
                if (cat?.tarifaBaseClp !== undefined && cat.tarifaBaseClp !== null) {
                  setTarifaCargoClp(cat.tarifaBaseClp);
                }
              }}
              className="w-full h-10 px-3 rounded-xl border border-borde bg-superficie text-sm text-texto focus:outline-hidden focus:ring-2 focus:ring-acento/30"
            >
              {categoriasServicio?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}{" "}
                  {cat.tarifaBaseClp !== null ? `(${formatearMonto(cat.tarifaBaseClp)})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-texto">Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={cantidadCargo}
                onChange={(e) => setCantidadCargo(Math.max(1, parseInt(e.target.value) || 1))}
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-texto">Tarifa (CLP)</Label>
              <Input
                type="number"
                min={0}
                value={tarifaCargoClp}
                onChange={(e) => setTarifaCargoClp(Math.max(0, parseInt(e.target.value) || 0))}
                className="rounded-xl h-10 font-semibold"
              />
            </div>
          </div>

          <div className="bg-fondo p-3 rounded-xl border border-borde/60 flex items-center justify-between">
            <span className="text-xs text-texto-suave font-medium">Total:</span>
            <span className="text-base font-bold text-texto">
              {formatearMonto(cantidadCargo * tarifaCargoClp)}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-texto">Observación (opcional)</Label>
            <Input
              value={descripcionCargo}
              onChange={(e) => setDescripcionCargo(e.target.value)}
              placeholder="Ej. Pesebrera #5"
              className="rounded-xl h-10"
            />
          </div>

          <div className="pt-2 border-t border-borde/70 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pagarAhora}
                onChange={(e) => setPagarAhora(e.target.checked)}
                className="h-4 w-4 rounded border-borde text-acento focus:ring-acento"
              />
              <span className="text-xs font-semibold text-texto">
                Registrar pago inmediato ahora
              </span>
            </label>

            {pagarAhora && (
              <div className="bg-fondo/60 p-3 rounded-xl border border-borde/60 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-texto">Medio de Pago</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMedioPago("transferencia")}
                      className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        medioPago === "transferencia"
                          ? "bg-acento text-sobre-acento"
                          : "bg-superficie text-texto border border-borde"
                      }`}
                    >
                      Transferencia
                    </button>
                    <button
                      type="button"
                      onClick={() => setMedioPago("efectivo")}
                      className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        medioPago === "efectivo"
                          ? "bg-acento text-sobre-acento"
                          : "bg-superficie text-texto border border-borde"
                      }`}
                    >
                      Efectivo
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-texto">Titular / Origen</Label>
                  <Input
                    value={nombreOrigen}
                    onChange={(e) => setNombreOrigen(e.target.value)}
                    placeholder="Quien transfiere"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalAsignarServicio(false)}
              className="flex-1 rounded-xl text-xs"
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={procesando || !categoriaSeleccionadaId}
              onClick={handleCrearCargoCaballo}
              className="flex-1 rounded-xl bg-acento text-sobre-acento hover:opacity-95 text-xs font-semibold"
            >
              {procesando ? "Guardando..." : "Confirmar Servicio"}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
