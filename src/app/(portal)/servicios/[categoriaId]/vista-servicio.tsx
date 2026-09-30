"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MessageCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit2,
  Trash2,
  ExternalLink,
  X,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { formatearMonto } from "@/lib/presentacion/formato";
import {
  CargoDTO,
  crearCargo,
  editarCargo,
  anularCargo,
} from "@/dominio/servicios/cargos";
import { registrarPagoInscripciones } from "@/dominio/inscripciones/binomios/pagos";

interface VistaServicioProps {
  categoria: {
    id: string;
    nombre: string;
    tipo: string;
    sujetoAsociado: string | null;
    tarifaBaseClp: number | null;
    activa: boolean;
  };
  cargos: CargoDTO[];
  totales: {
    totalCargos: number;
    totalRecaudado: number;
    totalPorCobrar: number;
    cantidadTotal: number;
  };
  caballos: { id: string; nombre: string; clubId: string; clubNombre?: string }[];
  jinetes: { id: string; nombre: string; clubId: string; clubNombre?: string }[];
  clubes: { id: string; nombre: string }[];
  binomios: { id: string; nombre: string; clubNombre?: string }[];
  puedeInscribir: boolean;
}

export function VistaServicio({
  categoria,
  cargos,
  totales,
  caballos,
  jinetes,
  clubes,
  binomios,
  puedeInscribir,
}: VistaServicioProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filtros
  const [pestana, setPestana] = useState<"todos" | "por_cobrar" | "pagados">("todos");
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false);
  const [cargoACobrar, setCargoACobrar] = useState<CargoDTO | null>(null);
  const [cargoAEditar, setCargoAEditar] = useState<CargoDTO | null>(null);
  const [cargoAAnular, setCargoAAnular] = useState<CargoDTO | null>(null);

  // Formulario Asignar
  const [sujetoSeleccionadoId, setSujetoSeleccionadoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [tarifaClp, setTarifaClp] = useState(categoria.tarifaBaseClp || 0);
  const [descripcion, setDescripcion] = useState("");
  const [pagarAhora, setPagarAhora] = useState(false);
  const [medioPago, setMedioPago] = useState<"transferencia" | "efectivo">("transferencia");
  const [nombreOrigen, setNombreOrigen] = useState("");

  // Formulario Cobrar Rápido
  const [montoCobroClp, setMontoCobroClp] = useState(0);
  const [medioPagoCobro, setMedioPagoCobro] = useState<"transferencia" | "efectivo">("transferencia");
  const [nombreOrigenCobro, setNombreOrigenCobro] = useState("");

  // Formulario Editar
  const [editCantidad, setEditCantidad] = useState(1);
  const [editTarifaClp, setEditTarifaClp] = useState(0);
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editMotivo, setEditMotivo] = useState("");

  // Formulario Anular
  const [motivoAnulacion, setMotivoAnulacion] = useState("");

  const abrirModalAsignar = () => {
    setSujetoSeleccionadoId("");
    setCantidad(1);
    setTarifaClp(categoria.tarifaBaseClp || 0);
    setDescripcion("");
    setPagarAhora(false);
    setMedioPago("transferencia");
    setNombreOrigen("");
    setModalAsignarAbierto(true);
  };

  const abrirModalCobrar = (cargo: CargoDTO) => {
    setCargoACobrar(cargo);
    setMontoCobroClp(cargo.saldoClp);
    setMedioPagoCobro("transferencia");
    setNombreOrigenCobro("");
  };

  const abrirModalEditar = (cargo: CargoDTO) => {
    setCargoAEditar(cargo);
    setEditCantidad(cargo.cantidad);
    setEditTarifaClp(cargo.tarifaClp);
    setEditDescripcion(cargo.descripcion || "");
    setEditMotivo("");
  };

  const abrirModalAnular = (cargo: CargoDTO) => {
    setCargoAAnular(cargo);
    setMotivoAnulacion("");
  };

  // Filtrado de cargos
  const cargosFiltrados = cargos.filter((c) => {
    if (pestana === "por_cobrar" && c.saldoClp <= 0) return false;
    if (pestana === "pagados" && c.saldoClp > 0) return false;

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const coincideSujeto = c.sujetoNombre.toLowerCase().includes(q);
      const coincideDetalle = c.sujetoDetalle?.toLowerCase().includes(q) || false;
      const coincideDesc = c.descripcion?.toLowerCase().includes(q) || false;
      if (!coincideSujeto && !coincideDetalle && !coincideDesc) return false;
    }

    return true;
  });

  // Copiar mensaje para WhatsApp
  const handleCopiarWhatsApp = (cargo: CargoDTO) => {
    const texto = `Hola! Te escribo de Tesorería por el servicio de *${categoria.nombre}* para *${cargo.sujetoNombre}*.\n` +
      `Monto: ${formatearMonto(cargo.montoClp)}` +
      (cargo.pagadoClp > 0 ? ` (Abonado: ${formatearMonto(cargo.pagadoClp)})` : "") +
      `\n*Saldo pendiente: ${formatearMonto(cargo.saldoClp)}*.\n` +
      `Por favor indícanos o adjúntanos el comprobante si ya realizaste la transferencia. ¡Muchas gracias!`;

    navigator.clipboard.writeText(texto).then(() => {
      toast.success("Mensaje para WhatsApp copiado al portapapeles");
    }).catch(() => {
      toast.error("No se pudo copiar el mensaje");
    });
  };

  // Acción: Crear Cargo
  const handleConfirmarAsignacion = () => {
    if (!sujetoSeleccionadoId) {
      toast.error("Selecciona un destinatario para el servicio.");
      return;
    }
    if (tarifaClp < 0 || cantidad <= 0) {
      toast.error("Verifica la cantidad y el valor del servicio.");
      return;
    }

    startTransition(async () => {
      const payload: any = {
        categoriaId: categoria.id,
        cantidad,
        tarifaClp,
        descripcion: descripcion.trim() || undefined,
        claveCliente: `cargo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };

      if (categoria.sujetoAsociado === "caballo") payload.caballoId = sujetoSeleccionadoId;
      else if (categoria.sujetoAsociado === "jinete") payload.jineteId = sujetoSeleccionadoId;
      else if (categoria.sujetoAsociado === "club") payload.clubId = sujetoSeleccionadoId;
      else if (categoria.sujetoAsociado === "binomio") payload.binomioId = sujetoSeleccionadoId;

      if (pagarAhora) {
        payload.pagoInmediato = {
          medioPago,
          nombreOrigen: nombreOrigen.trim() || undefined,
        };
      }

      const res = await crearCargo(payload);
      if (res.exito) {
        toast.success("Servicio asignado correctamente.");
        setModalAsignarAbierto(false);
        router.refresh();
      } else {
        toast.error(res.error || "Error al asignar el servicio.");
      }
    });
  };

  // Acción: Cobrar Rápido
  const handleConfirmarCobro = () => {
    if (!cargoACobrar) return;
    if (montoCobroClp <= 0 || montoCobroClp > cargoACobrar.saldoClp) {
      toast.error(`El monto debe estar entre $1 y ${formatearMonto(cargoACobrar.saldoClp)}.`);
      return;
    }

    startTransition(async () => {
      const hoy = new Date().toISOString().split("T")[0];
      const res = await registrarPagoInscripciones({
        montoClp: montoCobroClp,
        fecha: hoy,
        fechaPago: hoy,
        medioPago: medioPagoCobro,
        nombreOrigen: nombreOrigenCobro.trim() || undefined,
        sinRespaldo: true,
        claveCliente: `pago-cargo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        reparto: [
          {
            tipo: "cargo",
            id: cargoACobrar.id,
            montoClp: montoCobroClp,
          },
        ],
      });

      if (res.exito) {
        toast.success("Pago registrado exitosamente.");
        setCargoACobrar(null);
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo registrar el pago.");
      }
    });
  };

  // Acción: Editar
  const handleConfirmarEdicion = () => {
    if (!cargoAEditar) return;
    if (editCantidad <= 0 || editTarifaClp < 0) {
      toast.error("La cantidad y la tarifa deben ser válidas.");
      return;
    }

    startTransition(async () => {
      const res = await editarCargo({
        id: cargoAEditar.id,
        version: cargoAEditar.version,
        cantidad: editCantidad,
        tarifaClp: editTarifaClp,
        descripcion: editDescripcion.trim() || undefined,
        motivoAjuste: editMotivo.trim() || undefined,
      });

      if (res.exito) {
        toast.success("Servicio actualizado correctamente.");
        setCargoAEditar(null);
        router.refresh();
      } else {
        toast.error(res.error || "Error al actualizar.");
      }
    });
  };

  // Acción: Anular
  const handleConfirmarAnulacion = () => {
    if (!cargoAAnular) return;
    if (!motivoAnulacion.trim()) {
      toast.error("Debes indicar un motivo para la anulación.");
      return;
    }

    startTransition(async () => {
      const res = await anularCargo(
        cargoAAnular.id,
        motivoAnulacion.trim(),
        cargoAAnular.version
      );

      if (res.exito) {
        toast.success("Servicio anulado.");
        setCargoAAnular(null);
        router.refresh();
      } else {
        toast.error(res.error || "Error al anular.");
      }
    });
  };

  // Nombre sujeto tipo
  const sujetoEtiqueta =
    categoria.sujetoAsociado === "caballo"
      ? "Caballo"
      : categoria.sujetoAsociado === "jinete"
      ? "Jinete"
      : categoria.sujetoAsociado === "club"
      ? "Club"
      : categoria.sujetoAsociado === "binomio"
      ? "Binomio"
      : "Sujeto";

  return (
    <div className="space-y-5">
      {/* Cabecera y Resumen de Métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-superficie p-4 sm:p-5 rounded-2xl border border-borde/70 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {categoria.sujetoAsociado === "caballo"
                ? "🐎"
                : categoria.sujetoAsociado === "jinete"
                ? "👤"
                : categoria.sujetoAsociado === "club"
                ? "🏛️"
                : "🏷️"}
            </span>
            <h1 className="text-lg font-bold text-texto">{categoria.nombre}</h1>
          </div>
          <p className="text-xs text-texto-suave mt-1">
            Asociado a <span className="font-medium text-texto">{sujetoEtiqueta}s</span>
            {categoria.tarifaBaseClp !== null && (
              <> · Tarifa estándar: <span className="font-semibold text-acento">{formatearMonto(categoria.tarifaBaseClp)}</span></>
            )}
          </p>
        </div>

        {puedeInscribir && (
          <Button
            onClick={abrirModalAsignar}
            className="flex items-center gap-1.5 bg-acento text-sobre-acento hover:opacity-95 rounded-xl font-semibold text-xs h-10 px-4 cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Asignar {sujetoEtiqueta}</span>
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-superficie p-3.5 sm:p-4 rounded-xl border border-borde/70">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-texto-suave">Asignados</p>
          <p className="text-lg sm:text-xl font-bold text-texto mt-0.5">{totales.cantidadTotal}</p>
          <p className="text-[11px] text-texto-suave truncate mt-0.5">
            Total {formatearMonto(totales.totalCargos)}
          </p>
        </div>

        <div className="bg-superficie p-3.5 sm:p-4 rounded-xl border border-borde/70">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-texto-suave">Recaudado</p>
          <p className="text-lg sm:text-xl font-bold text-ingreso mt-0.5">
            {formatearMonto(totales.totalRecaudado)}
          </p>
          <p className="text-[11px] text-texto-suave truncate mt-0.5">
            {totales.totalCargos > 0
              ? `${Math.round((totales.totalRecaudado / totales.totalCargos) * 100)}% cubierto`
              : "0%"}
          </p>
        </div>

        <div className="bg-superficie p-3.5 sm:p-4 rounded-xl border border-borde/70">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-texto-suave">Por Cobrar</p>
          <p
            className={`text-lg sm:text-xl font-bold mt-0.5 ${
              totales.totalPorCobrar > 0 ? "text-falta-texto" : "text-ingreso"
            }`}
          >
            {formatearMonto(totales.totalPorCobrar)}
          </p>
          <p className="text-[11px] text-texto-suave truncate mt-0.5">
            {cargos.filter((c) => c.saldoClp > 0).length} pendientes
          </p>
        </div>
      </div>

      {/* Filtros de Pestañas y Búsqueda */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-borde/70 pb-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPestana("todos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                pestana === "todos"
                  ? "bg-acento/10 text-acento"
                  : "text-texto-suave hover:text-texto hover:bg-fondo"
              }`}
            >
              Todos ({cargos.length})
            </button>
            <button
              onClick={() => setPestana("por_cobrar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                pestana === "por_cobrar"
                  ? "bg-falta-fondo text-falta-texto"
                  : "text-texto-suave hover:text-texto hover:bg-fondo"
              }`}
            >
              Por cobrar ({cargos.filter((c) => c.saldoClp > 0).length})
            </button>
            <button
              onClick={() => setPestana("pagados")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                pestana === "pagados"
                  ? "bg-listo-fondo text-listo-texto"
                  : "text-texto-suave hover:text-texto hover:bg-fondo"
              }`}
            >
              Pagados ({cargos.filter((c) => c.saldoClp === 0).length})
            </button>
          </div>

          <div className="relative w-44 sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-texto-suave" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="h-8 pl-8 text-xs rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Listado de Cargos */}
      {cargosFiltrados.length === 0 ? (
        <div className="bg-superficie rounded-2xl border border-borde/60 p-8 text-center">
          <p className="text-sm font-medium text-texto-suave">
            {cargos.length === 0
              ? `No se han asignado ${sujetoEtiqueta.toLowerCase()}s a este servicio todavía.`
              : "No hay registros que coincidan con el filtro actual."}
          </p>
          {puedeInscribir && cargos.length === 0 && (
            <Button
              onClick={abrirModalAsignar}
              variant="outline"
              className="mt-3 text-xs rounded-xl"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Asignar primer {sujetoEtiqueta.toLowerCase()}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {cargosFiltrados.map((cargo) => {
            const estaPagado = cargo.saldoClp === 0;
            const esParcial = cargo.pagadoClp > 0 && cargo.saldoClp > 0;

            const urlSujeto =
              cargo.sujetoTipo === "caballo"
                ? `/participantes/caballos/${cargo.sujetoId}`
                : cargo.sujetoTipo === "jinete"
                ? `/participantes/jinetes/${cargo.sujetoId}`
                : undefined;

            return (
              <div
                key={cargo.id}
                className="bg-superficie rounded-xl border border-borde/70 p-3.5 sm:p-4 transition-colors hover:border-acento/40 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {urlSujeto ? (
                        <Link
                          href={urlSujeto}
                          className="font-bold text-sm text-texto hover:text-acento transition-colors flex items-center gap-1 group"
                        >
                          <span className="truncate">{cargo.sujetoNombre}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-texto-suave" />
                        </Link>
                      ) : (
                        <span className="font-bold text-sm text-texto truncate">
                          {cargo.sujetoNombre}
                        </span>
                      )}

                      {/* Chip de Semáforo */}
                      {estaPagado ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-listo-fondo px-2 py-0.5 text-[11px] font-semibold text-listo-texto">
                          <CheckCircle2 className="h-3 w-3" />
                          Pagado
                        </span>
                      ) : esParcial ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-falta-fondo px-2 py-0.5 text-[11px] font-semibold text-falta-texto">
                          <Clock className="h-3 w-3" />
                          Parcial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-problema-fondo px-2 py-0.5 text-[11px] font-semibold text-gasto">
                          <AlertCircle className="h-3 w-3" />
                          Pendiente
                        </span>
                      )}
                    </div>

                    {cargo.sujetoDetalle && (
                      <p className="text-xs text-texto-suave mt-0.5 truncate">
                        {cargo.sujetoDetalle}
                      </p>
                    )}

                    {cargo.descripcion && (
                      <p className="text-xs text-texto-suave/90 mt-1 italic">
                        &ldquo;{cargo.descripcion}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-texto">
                      {formatearMonto(cargo.montoClp)}
                    </p>
                    <p className="text-[11px] text-texto-suave">
                      {cargo.cantidad > 1 && `${cargo.cantidad} × ${formatearMonto(cargo.tarifaClp)}`}
                    </p>
                    {cargo.pagadoClp > 0 && (
                      <p className="text-[11px] text-ingreso font-medium">
                        Pagado: {formatearMonto(cargo.pagadoClp)}
                      </p>
                    )}
                    {cargo.saldoClp > 0 && cargo.pagadoClp > 0 && (
                      <p className="text-[11px] text-falta-texto font-semibold">
                        Resta: {formatearMonto(cargo.saldoClp)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Barra de Acciones */}
                <div className="flex items-center justify-between pt-2 border-t border-borde/40 text-xs">
                  <span className="text-[11px] text-texto-suave">
                    Registrado {new Date(cargo.creadoEn).toLocaleDateString("es-CL")}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {cargo.saldoClp > 0 && (
                      <>
                        <button
                          onClick={() => handleCopiarWhatsApp(cargo)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-fondo hover:bg-fondo-secundario text-texto-suave hover:text-texto font-medium transition-colors cursor-pointer text-xs"
                          title="Copiar recordatorio para WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-ingreso" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>

                        {puedeInscribir && (
                          <button
                            onClick={() => abrirModalCobrar(cargo)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-acento/10 hover:bg-acento/20 text-acento font-semibold transition-colors cursor-pointer text-xs"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Cobrar</span>
                          </button>
                        )}
                      </>
                    )}

                    {puedeInscribir && (
                      <>
                        <button
                          onClick={() => abrirModalEditar(cargo)}
                          className="p-1 rounded-lg text-texto-suave hover:text-texto hover:bg-fondo transition-colors cursor-pointer"
                          title="Ajustar servicio"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {cargo.pagadoClp === 0 && (
                          <button
                            onClick={() => abrirModalAnular(cargo)}
                            className="p-1 rounded-lg text-texto-suave hover:text-gasto hover:bg-problema-fondo/40 transition-colors cursor-pointer"
                            title="Anular servicio"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Asignar Servicio */}
      <Sheet
        abierta={modalAsignarAbierto}
        alCerrar={() => setModalAsignarAbierto(false)}
        posicion="centro"
        titulo={`Asignar ${categoria.nombre}`}
        descripcion={`Asigna este servicio a un ${sujetoEtiqueta.toLowerCase()} para el evento en curso.`}
      >
        <div className="space-y-4 pt-4">
          <div>
            <Label className="text-xs font-semibold text-texto mb-1 block">
              Seleccionar {sujetoEtiqueta} <span className="text-gasto">*</span>
            </Label>
            <select
              value={sujetoSeleccionadoId}
              onChange={(e) => setSujetoSeleccionadoId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-borde bg-superficie text-sm text-texto focus:outline-hidden focus:ring-2 focus:ring-acento/30"
            >
              <option value="">-- Elige un {sujetoEtiqueta.toLowerCase()} --</option>
              {categoria.sujetoAsociado === "caballo" &&
                caballos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.clubNombre ? `(${c.clubNombre})` : ""}
                  </option>
                ))}
              {categoria.sujetoAsociado === "jinete" &&
                jinetes.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nombre} {j.clubNombre ? `(${j.clubNombre})` : ""}
                  </option>
                ))}
              {categoria.sujetoAsociado === "club" &&
                clubes.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.nombre}
                  </option>
                ))}
              {categoria.sujetoAsociado === "binomio" &&
                binomios.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} {b.clubNombre ? `(${b.clubNombre})` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-texto mb-1 block">Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 text-sm rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-texto mb-1 block">Tarifa Unitaria (CLP)</Label>
              <Input
                type="number"
                min={0}
                value={tarifaClp}
                onChange={(e) => setTarifaClp(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-10 text-sm rounded-xl font-semibold"
              />
            </div>
          </div>

          <div className="bg-fondo p-3 rounded-xl border border-borde/60 flex items-center justify-between">
            <span className="text-xs text-texto-suave font-medium">Total a cobrar:</span>
            <span className="text-base font-bold text-texto">
              {formatearMonto(cantidad * tarifaClp)}
            </span>
          </div>

          <div>
            <Label className="text-xs font-semibold text-texto mb-1 block">Observación (opcional)</Label>
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Pesebrera #12, viruta extra..."
              className="h-10 text-sm rounded-xl"
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
                <div>
                  <Label className="text-xs font-medium text-texto mb-1 block">Medio de Pago</Label>
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

                <div>
                  <Label className="text-xs font-medium text-texto mb-1 block">Titular / Origen (opcional)</Label>
                  <Input
                    value={nombreOrigen}
                    onChange={(e) => setNombreOrigen(e.target.value)}
                    placeholder="Nombre de quien transfiere"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setModalAsignarAbierto(false)}
              className="text-xs rounded-xl"
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarAsignacion}
              className="bg-acento text-sobre-acento hover:opacity-95 text-xs font-semibold rounded-xl"
              disabled={isPending}
            >
              {isPending ? "Guardando..." : "Confirmar Asignación"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Modal: Cobrar Rápido */}
      <Sheet
        abierta={Boolean(cargoACobrar)}
        alCerrar={() => setCargoACobrar(null)}
        posicion="centro"
        titulo="Registrar Pago"
        descripcion={`Pago para ${cargoACobrar?.sujetoNombre} · Saldo: ${formatearMonto(cargoACobrar?.saldoClp || 0)}`}
      >
        <div className="space-y-4 pt-4">
          <div>
            <Label className="text-xs font-semibold text-texto mb-1 block">Monto a pagar (CLP)</Label>
            <Input
              type="number"
              min={1}
              max={cargoACobrar?.saldoClp || 0}
              value={montoCobroClp}
              onChange={(e) => setMontoCobroClp(parseInt(e.target.value) || 0)}
              className="h-10 text-sm rounded-xl font-bold"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-texto mb-1 block">Medio de Pago</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMedioPagoCobro("transferencia")}
                className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  medioPagoCobro === "transferencia"
                    ? "bg-acento text-sobre-acento"
                    : "bg-superficie text-texto border border-borde"
                }`}
              >
                Transferencia
              </button>
              <button
                type="button"
                onClick={() => setMedioPagoCobro("efectivo")}
                className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  medioPagoCobro === "efectivo"
                    ? "bg-acento text-sobre-acento"
                    : "bg-superficie text-texto border border-borde"
                }`}
              >
                Efectivo
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-texto mb-1 block">
              Titular / Nombre origen (opcional)
            </Label>
            <Input
              value={nombreOrigenCobro}
              onChange={(e) => setNombreOrigenCobro(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="h-10 text-sm rounded-xl"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCargoACobrar(null)}
              className="text-xs rounded-xl"
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarCobro}
              className="bg-acento text-sobre-acento hover:opacity-95 text-xs font-semibold rounded-xl"
              disabled={isPending}
            >
              {isPending ? "Registrando..." : "Registrar Pago"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Modal: Editar Servicio */}
      <Sheet
        abierta={Boolean(cargoAEditar)}
        alCerrar={() => setCargoAEditar(null)}
        posicion="centro"
        titulo="Ajustar Servicio"
        descripcion={`Modificar condiciones del servicio para ${cargoAEditar?.sujetoNombre}.`}
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-texto mb-1 block">Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={editCantidad}
                onChange={(e) => setEditCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 text-sm rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-texto mb-1 block">Tarifa (CLP)</Label>
              <Input
                type="number"
                min={0}
                value={editTarifaClp}
                onChange={(e) => setEditTarifaClp(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-10 text-sm rounded-xl font-semibold"
              />
            </div>
          </div>

          <div className="bg-fondo p-3 rounded-xl border border-borde/60 flex items-center justify-between">
            <span className="text-xs text-texto-suave font-medium">Nuevo Total:</span>
            <span className="text-base font-bold text-texto">
              {formatearMonto(editCantidad * editTarifaClp)}
            </span>
          </div>

          <div>
            <Label className="text-xs font-semibold text-texto mb-1 block">Descripción / Nota</Label>
            <Input
              value={editDescripcion}
              onChange={(e) => setEditDescripcion(e.target.value)}
              className="h-10 text-sm rounded-xl"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-texto mb-1 block">
              Motivo del Ajuste (auditoría)
            </Label>
            <Input
              value={editMotivo}
              onChange={(e) => setEditMotivo(e.target.value)}
              placeholder="Ej. Cambio de categoría o descuento acordado"
              className="h-10 text-sm rounded-xl"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCargoAEditar(null)}
              className="text-xs rounded-xl"
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarEdicion}
              className="bg-acento text-sobre-acento hover:opacity-95 text-xs font-semibold rounded-xl"
              disabled={isPending}
            >
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Modal: Anular Servicio */}
      <Sheet
        abierta={Boolean(cargoAAnular)}
        alCerrar={() => setCargoAAnular(null)}
        posicion="centro"
        titulo="Anular Servicio"
        descripcion={`¿Seguro que deseas anular el servicio de ${cargoAAnular?.sujetoNombre}? Esta acción quedará registrada en auditoría.`}
      >
        <div className="space-y-4 pt-4">
          <div className="bg-problema-fondo/40 p-3 rounded-xl border border-problema/20 text-xs text-gasto">
            Atención: Solo es posible anular servicios que no tengan pagos o abonos vigentes.
          </div>

          <div>
            <Label className="text-xs font-semibold text-texto mb-1 block">
              Motivo de Anulación <span className="text-gasto">*</span>
            </Label>
            <Input
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              placeholder="Ej. Caballo no asistirá al concurso"
              className="h-10 text-sm rounded-xl"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCargoAAnular(null)}
              className="text-xs rounded-xl"
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarAnulacion}
              className="bg-gasto text-white hover:opacity-95 text-xs font-semibold rounded-xl"
              disabled={isPending}
            >
              {isPending ? "Anulando..." : "Confirmar Anulación"}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
