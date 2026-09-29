"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Building2,
  DollarSign,
  ArrowRight,
  AlertTriangle,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  ArrowRightLeft,
  XCircle,
  FileText,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { EstadoItemBadge } from "@/components/app/estado-item";
import { AlertasJinete } from "@/components/app/alertas-jinete";
import { EstadoCuenta } from "@/components/app/estado-cuenta";
import { formatearMonto, formatearFecha } from "@/lib/presentacion/formato";
import {
  cambiarPrueba,
  cambiarParBinomio,
  cambiarClubBinomio,
  moverInscripcion,
  ajustarItem,
  anularItem,
  anularBinomio,
} from "@/dominio/inscripciones/binomios/acciones";
import { desasignarPago } from "@/dominio/inscripciones/binomios/pagos";

interface FichaBinomioProps {
  binomio: any;
  pruebas: any[];
  clubes: any[];
  jinetes: any[];
  caballos: any[];
  otrosBinomios: any[];
  estadoCuentaDatos: any;
  rol: string;
}

export function FichaBinomio({
  binomio,
  pruebas,
  clubes,
  jinetes,
  caballos,
  otrosBinomios,
  estadoCuentaDatos,
  rol,
}: FichaBinomioProps) {
  const router = useRouter();
  const puedeModificar = rol === "administrador" || rol === "ayudante";
  const esAdmin = rol === "administrador";
  const esObservador = rol === "observador";

  const [procesando, setProcesando] = useState(false);

  // Modales
  const [modalCambiarPrueba, setModalCambiarPrueba] = useState(false);
  const [itemParaCambiarPrueba, setItemParaCambiarPrueba] = useState<any>(null);
  const [nuevaPruebaId, setNuevaPruebaId] = useState("");

  const [modalAjustar, setModalAjustar] = useState(false);
  const [itemParaAjustar, setItemParaAjustar] = useState<any>(null);
  const [nuevoMontoAjuste, setNuevoMontoAjuste] = useState(0);
  const [motivoAjuste, setMotivoAjuste] = useState("");

  const [modalMover, setModalMover] = useState(false);
  const [itemParaMover, setItemParaMover] = useState<any>(null);
  const [destinoBinomioId, setDestinoBinomioId] = useState("");

  const [modalCambiarPar, setModalCambiarPar] = useState(false);
  const [cambiarTipoPar, setCambiarTipoPar] = useState<"jinete" | "caballo">("jinete");
  const [nuevoParticipanteId, setNuevoParticipanteId] = useState("");

  const [modalCambiarClub, setModalCambiarClub] = useState(false);
  const [nuevoClubId, setNuevoClubId] = useState(binomio.club.id);

  const [modalAnularItem, setModalAnularItem] = useState(false);
  const [itemParaAnular, setItemParaAnular] = useState<any>(null);
  const [motivoAnulacionItem, setMotivoAnulacionItem] = useState("");

  const [modalAnularBinomio, setModalAnularBinomio] = useState(false);
  const [motivoAnularBinomio, setMotivoAnularBinomio] = useState("");

  const [modalDesasignar, setModalDesasignar] = useState(false);
  const [pagoParaDesasignar, setPagoParaDesasignar] = useState<any>(null);
  const [motivoDesasignar, setMotivoDesasignar] = useState("");

  // Totales
  const totalMonto = binomio.inscripciones.reduce(
    (a: number, b: any) => a + (b.calculo?.monto ?? b.montoClp),
    0
  );
  const totalPagado = binomio.inscripciones.reduce(
    (a: number, b: any) => a + (b.calculo?.pagado ?? 0),
    0
  );
  const totalSaldo = Math.max(0, totalMonto - totalPagado);

  // Manejador Cambiar Prueba
  const handleCambiarPrueba = async () => {
    if (!nuevaPruebaId || !itemParaCambiarPrueba) {
      toast.error("Selecciona una nueva prueba.");
      return;
    }
    setProcesando(true);
    try {
      const res = await cambiarPrueba(itemParaCambiarPrueba.id, nuevaPruebaId);
      if (res.exito) {
        toast.success("Prueba cambiada exitosamente.");
        setModalCambiarPrueba(false);
        router.refresh();
      } else {
        toast.error(res.error || "Error al cambiar la prueba.");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al cambiar la prueba.");
    } finally {
      setProcesando(false);
    }
  };

  // Manejador Ajustar Ítem
  const handleAjustarItem = async () => {
    if (!itemParaAjustar) return;
    if (motivoAjuste.trim().length < 10) {
      toast.error("El motivo debe tener al menos 10 caracteres.");
      return;
    }
    setProcesando(true);
    try {
      const res = await ajustarItem(
        "inscripcion",
        itemParaAjustar.id,
        nuevoMontoAjuste,
        motivoAjuste.trim()
      );
      if (res.exito) {
        toast.success("Ajuste guardado.");
        setModalAjustar(false);
        setMotivoAjuste("");
        router.refresh();
      } else {
        toast.error(res.error || "Error al ajustar.");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al ajustar.");
    } finally {
      setProcesando(false);
    }
  };

  // Manejador Mover Inscripción
  const handleMoverInscripcion = async () => {
    if (!itemParaMover || !destinoBinomioId) {
      toast.error("Selecciona el binomio de destino.");
      return;
    }
    setProcesando(true);
    try {
      const res = await moverInscripcion(itemParaMover.id, destinoBinomioId);
      if (res.exito) {
        toast.success("Inscripción transferida con éxito.");
        setModalMover(false);
        router.refresh();
      } else {
        toast.error(res.error || "Error al transferir inscripción.");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al transferir inscripción.");
    } finally {
      setProcesando(false);
    }
  };

  // Manejador Cambiar Par Binomio
  const handleCambiarPar = async () => {
    if (!nuevoParticipanteId) {
      toast.error("Selecciona el nuevo participante.");
      return;
    }
    setProcesando(true);
    try {
      const res = await cambiarParBinomio(
        binomio.id,
        cambiarTipoPar === "jinete" ? nuevoParticipanteId : binomio.jineteId,
        cambiarTipoPar === "caballo" ? nuevoParticipanteId : binomio.caballoId
      );
      if (res.exito) {
        toast.success("Binomio actualizado.");
        setModalCambiarPar(false);
        router.refresh();
      } else {
        toast.error(res.error || "Error al actualizar binomio.");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar binomio.");
    } finally {
      setProcesando(false);
    }
  };

  // Manejador Cambiar Club
  const handleCambiarClub = async () => {
    if (!nuevoClubId) return;
    setProcesando(true);
    try {
      const res = await cambiarClubBinomio(binomio.id, nuevoClubId);
      if (res.exito) {
        toast.success("Club del binomio actualizado.");
        setModalCambiarClub(false);
        router.refresh();
      } else {
        toast.error(res.error || "Error al cambiar club.");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al cambiar club.");
    } finally {
      setProcesando(false);
    }
  };

  // Manejador Anular Ítem
  const handleAnularItem = async () => {
    if (!itemParaAnular) return;
    if (motivoAnulacionItem.trim().length < 10) {
      toast.error("El motivo de anulación debe tener al menos 10 caracteres.");
      return;
    }
    setProcesando(true);
    try {
      const res = await anularItem(
        "inscripcion",
        itemParaAnular.id,
        motivoAnulacionItem.trim()
      );
      if (res.exito) {
        toast.success("Ítem anulado con éxito.");
        setModalAnularItem(false);
        setMotivoAnulacionItem("");
        router.refresh();
      } else {
        toast.error(res.error || "Error al anular ítem.");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al anular ítem.");
    } finally {
      setProcesando(false);
    }
  };

  // Manejador Anular Binomio Completo
  const handleAnularBinomio = async () => {
    if (motivoAnularBinomio.trim().length < 10) {
      toast.error("El motivo de anulación debe tener al menos 10 caracteres.");
      return;
    }
    setProcesando(true);
    try {
      const res = await anularBinomio(binomio.id, motivoAnularBinomio.trim());
      if (res.exito) {
        toast.success("Binomio anulado con éxito.");
        setModalAnularBinomio(false);
        router.push("/inscripciones");
      } else {
        toast.error(res.error || "Error al anular binomio.");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al anular binomio.");
    } finally {
      setProcesando(false);
    }
  };

  // Manejador Desasignar Pago
  const handleDesasignarPago = async () => {
    if (!pagoParaDesasignar) return;
    if (motivoDesasignar.trim().length < 10) {
      toast.error("El motivo de desasignación debe tener al menos 10 caracteres.");
      return;
    }
    setProcesando(true);
    try {
      const res = await desasignarPago(pagoParaDesasignar.id, motivoDesasignar.trim());
      if (res.exito) {
        toast.success("Pago desasignado. El saldo volvió a quedar por asignar en el movimiento.");
        setModalDesasignar(false);
        setMotivoDesasignar("");
        router.refresh();
      } else {
        toast.error(res.error || "Error al desasignar pago.");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al desasignar pago.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Encabezado y tarjetas del binomio */}
      <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-texto">
                {binomio.jinete.nombre}
              </h2>
              <span className="text-texto-suave">/</span>
              <h3 className="text-lg font-medium text-texto-suave">
                {binomio.caballo.nombre}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-texto-suave">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {binomio.club.nombre}
              </span>
              <span>•</span>
              <Link
                href={`/participantes/jinetes/${binomio.jinete.id}`}
                className="text-marca hover:underline"
              >
                Ficha Jinete
              </Link>
              <span>•</span>
              <Link
                href={`/participantes/caballos/${binomio.caballo.id}`}
                className="text-marca hover:underline"
              >
                Ficha Caballo
              </Link>
            </div>
          </div>

          {/* Botones de acción rápida */}
          <div className="flex flex-wrap items-center gap-2">
            {puedeModificar && !binomio.anulado && (
              <>
                <Link
                  href={`/movimientos/nuevo?tipo=ingreso&categoria=inscripciones&binomioId=${binomio.id}`}
                  className="inline-flex items-center justify-center rounded-xl font-semibold text-xs px-3 py-1.5 bg-marca text-white hover:bg-marca/90 transition-colors shadow-sm"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Registrar pago
                </Link>
                <Link
                  href={`/inscripciones/binomios/${binomio.id}/retirar`}
                  className="inline-flex items-center justify-center rounded-xl font-semibold text-xs px-3 py-1.5 border border-borde bg-superficie hover:bg-superficie/80 text-texto transition-colors"
                >
                  <ArrowRight className="w-4 h-4 mr-1" />
                  Retirar
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Alertas del Jinete */}
        {!esObservador && binomio.alertas && binomio.alertas.length > 0 && (
          <AlertasJinete alertas={binomio.alertas} />
        )}

        {/* Resumen Financiero */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-borde">
          <div className="p-3 rounded-lg bg-fondo-subutil">
            <span className="text-xs text-texto-suave">Total Inscripciones</span>
            <p className="text-lg font-bold text-texto">{formatearMonto(totalMonto)}</p>
          </div>
          <div className="p-3 rounded-lg bg-fondo-subutil">
            <span className="text-xs text-texto-suave">Total Pagado</span>
            <p className="text-lg font-bold text-emerald-600">{formatearMonto(totalPagado)}</p>
          </div>
          <div className="p-3 rounded-lg bg-fondo-subutil">
            <span className="text-xs text-texto-suave">Saldo Pendiente</span>
            <p className={`text-lg font-bold ${totalSaldo > 0 ? "text-amber-600" : "text-texto"}`}>
              {formatearMonto(totalSaldo)}
            </p>
          </div>
        </div>

        {/* Opciones de edición de binomio */}
        {puedeModificar && !binomio.anulado && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-borde text-xs">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-8 text-texto-suave"
              onClick={() => {
                setCambiarTipoPar("jinete");
                setNuevoParticipanteId("");
                setModalCambiarPar(true);
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Cambiar Jinete/Caballo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-8 text-texto-suave"
              onClick={() => setModalCambiarClub(true)}
            >
              <Building2 className="w-3.5 h-3.5 mr-1" />
              Cambiar Club
            </Button>
            {esAdmin && totalPagado === 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setModalAnularBinomio(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Anular binomio completo
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 2. Pruebas Inscritas */}
      <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-texto">Pruebas Inscritas</h3>
        <div className="space-y-3">
          {binomio.inscripciones.map((ins: any) => {
            const c = ins.calculo || {
              monto: ins.montoClp,
              pagado: 0,
              saldo: ins.montoClp,
              estado: "pendiente",
            };
            return (
              <div
                key={ins.id}
                className="p-3 rounded-lg border border-borde bg-fondo flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-texto">{ins.prueba.nombre}</span>
                    <EstadoItemBadge estado={c.estado} monto={c.monto} saldo={c.saldo} />
                    {ins.ajuste !== null && ins.ajuste !== undefined && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Ajustado ({formatearMonto(ins.ajuste)})
                      </span>
                    )}
                  </div>
                  {!esObservador && ins.avisoEdad && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {ins.avisoEdad === "no_cumple_edad"
                        ? "Jinete fuera del rango de edad para esta prueba"
                        : "Edad del jinete no acreditada"}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-texto-suave">
                    <span>Monto: {formatearMonto(c.monto)}</span>
                    <span>Pagado: {formatearMonto(c.pagado)}</span>
                    <span>Saldo: {formatearMonto(c.saldo)}</span>
                  </div>
                </div>

                {puedeModificar && !ins.anulado && !ins.retirado && (
                  <div className="flex items-center gap-1 text-xs">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => {
                        setItemParaCambiarPrueba(ins);
                        setNuevaPruebaId("");
                        setModalCambiarPrueba(true);
                      }}
                    >
                      Cambiar prueba
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => {
                        setItemParaAjustar(ins);
                        setNuevoMontoAjuste(c.monto);
                        setMotivoAjuste("");
                        setModalAjustar(true);
                      }}
                    >
                      Ajustar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => {
                        setItemParaMover(ins);
                        setDestinoBinomioId("");
                        setModalMover(true);
                      }}
                    >
                      Mover
                    </Button>
                    {c.pagado === 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setItemParaAnular(ins);
                          setMotivoAnulacionItem("");
                          setModalAnularItem(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Movimientos de Ingreso Asociados */}
      {binomio.movimientos && binomio.movimientos.length > 0 && (
        <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-texto">Movimientos de Ingreso Asociados</h3>
          <div className="space-y-3">
            {binomio.movimientos.map((mov: any) => (
              <div
                key={mov.id}
                className="p-3 rounded-lg border border-borde bg-fondo flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-sm text-texto block">
                    {mov.descripcion || mov.categoria?.nombre || "Ingreso"}
                  </span>
                  <span className="text-texto-suave">
                    {mov.categoria?.nombre} · {formatearFecha(mov.fecha)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-600">
                    +{formatearMonto(mov.montoClp)}
                  </span>
                  <Link
                    href={`/movimientos/${mov.id}`}
                    className="text-marca hover:underline text-xs"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Historial de Pagos y Devoluciones */}
      <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-texto">Historial de Pagos</h3>
        {/* Recolectar todos los pagos vinculados */}
        {(() => {
          const todosLosPagos: any[] = [];
          for (const ins of binomio.inscripciones) {
            for (const p of ins.pagos || []) {
              if (!p.anulado) {
                todosLosPagos.push({ ...p, itemNombre: ins.prueba.nombre });
              }
            }
          }

          if (todosLosPagos.length === 0) {
            return <p className="text-xs text-texto-suave">No hay pagos registrados para este binomio.</p>;
          }

          return (
            <div className="space-y-2">
              {todosLosPagos.map((pago: any) => (
                <div
                  key={pago.id}
                  className="p-3 rounded-lg border border-borde bg-fondo flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-texto">{pago.itemNombre}</span>
                      <span className="font-bold text-emerald-600">+{formatearMonto(pago.montoClp)}</span>
                      {pago.movimiento?.estadoValidacion === "por_validar" && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200">
                          Por validar
                        </span>
                      )}
                    </div>
                    <div className="text-texto-suave flex items-center gap-2">
                      <span>{formatearFecha(pago.creadoEn)}</span>
                      <span>•</span>
                      <span>Medio: {pago.movimiento?.medioPago || "Transferencia"}</span>
                      {pago.movimiento?.id && (
                        <>
                          <span>•</span>
                          <Link
                            href={`/movimientos/${pago.movimiento.id}`}
                            className="text-marca hover:underline"
                          >
                            Ver movimiento
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                  {esAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setPagoParaDesasignar(pago);
                        setMotivoDesasignar("");
                        setModalDesasignar(true);
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Desasignar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* 5. Estado de Cuenta y Cobranza WhatsApp */}
      {!esObservador && estadoCuentaDatos && (
        <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
          <EstadoCuenta
            sujeto={{ binomioId: binomio.id }}
            datos={estadoCuentaDatos}
          />
        </div>
      )}

      {/* 6. Historial de Auditoría */}
      {!esObservador && binomio.auditorias && binomio.auditorias.length > 0 && (
        <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-texto">Auditoría de Cambios</h3>
          <div className="space-y-2">
            {binomio.auditorias.map((a: any) => (
              <div
                key={a.id}
                className="p-2.5 rounded bg-fondo border border-borde text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-texto-suave">
                  <span className="font-semibold text-texto">
                    {a.usuario?.nombre || "Sistema"} — {a.accion}
                  </span>
                  <span>{formatearFecha(a.creadoEn)}</span>
                </div>
                {a.motivo && <p className="text-texto-suave italic">&quot;{a.motivo}&quot;</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Cambiar Prueba */}
      {modalCambiarPrueba && itemParaCambiarPrueba && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-fondo-tarjeta rounded-xl border border-borde p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-texto">Cambiar Prueba</h3>
            <p className="text-xs text-texto-suave">
              Prueba actual: <span className="font-semibold text-texto">{itemParaCambiarPrueba.prueba.nombre}</span>
            </p>
            <div>
              <Label>Nueva Prueba</Label>
              <select
                value={nuevaPruebaId}
                onChange={(e) => setNuevaPruebaId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
              >
                <option value="">Selecciona una prueba...</option>
                {pruebas
                  .filter((p) => p.id !== itemParaCambiarPrueba.pruebaId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({formatearMonto(p.tarifaClp)})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalCambiarPrueba(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-marca text-white hover:bg-marca/90"
                onClick={handleCambiarPrueba}
                disabled={procesando || !nuevaPruebaId}
              >
                {procesando ? "Cambiando..." : "Confirmar Cambio"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ajustar Monto */}
      {modalAjustar && itemParaAjustar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-fondo-tarjeta rounded-xl border border-borde p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-texto">
              Ajustar Monto de Inscripción
            </h3>
            <div className="space-y-3">
              <div>
                <Label>Nuevo Monto (CLP)</Label>
                <Input
                  type="number"
                  min="0"
                  value={nuevoMontoAjuste}
                  onChange={(e) => setNuevoMontoAjuste(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Motivo del ajuste (obligatorio, mín. 10 caracteres)</Label>
                <Input
                  placeholder="Ej: Descuento autorizado por la directiva..."
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                />
                <span className="text-[11px] text-texto-suave">
                  {motivoAjuste.length}/10 caracteres mínimos
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalAjustar(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-marca text-white hover:bg-marca/90"
                onClick={handleAjustarItem}
                disabled={procesando || motivoAjuste.trim().length < 10}
              >
                {procesando ? "Guardando..." : "Guardar Ajuste"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Mover Inscripción */}
      {modalMover && itemParaMover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-fondo-tarjeta rounded-xl border border-borde p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-texto">Transferir a Otro Binomio</h3>
            <p className="text-xs text-texto-suave">
              Inscripción: <span className="font-semibold text-texto">{itemParaMover.prueba.nombre}</span>
            </p>
            <div>
              <Label>Binomio de Destino</Label>
              <select
                value={destinoBinomioId}
                onChange={(e) => setDestinoBinomioId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
              >
                <option value="">Selecciona un binomio...</option>
                {otrosBinomios.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.jinete.nombre} / {b.caballo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalMover(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-marca text-white hover:bg-marca/90"
                onClick={handleMoverInscripcion}
                disabled={procesando || !destinoBinomioId}
              >
                {procesando ? "Transfiriendo..." : "Confirmar Transferencia"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cambiar Par Binomio */}
      {modalCambiarPar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-fondo-tarjeta rounded-xl border border-borde p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-texto">Cambiar Par del Binomio</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={cambiarTipoPar === "jinete" ? "default" : "outline"}
                onClick={() => {
                  setCambiarTipoPar("jinete");
                  setNuevoParticipanteId("");
                }}
              >
                Cambiar Jinete
              </Button>
              <Button
                size="sm"
                variant={cambiarTipoPar === "caballo" ? "default" : "outline"}
                onClick={() => {
                  setCambiarTipoPar("caballo");
                  setNuevoParticipanteId("");
                }}
              >
                Cambiar Caballo
              </Button>
            </div>
            <div>
              <Label>Nuevo {cambiarTipoPar === "jinete" ? "Jinete" : "Caballo"}</Label>
              <select
                value={nuevoParticipanteId}
                onChange={(e) => setNuevoParticipanteId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
              >
                <option value="">Selecciona...</option>
                {cambiarTipoPar === "jinete"
                  ? jinetes
                      .filter((j) => j.id !== binomio.jineteId)
                      .map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.nombre}
                        </option>
                      ))
                  : caballos
                      .filter((c) => c.id !== binomio.caballoId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalCambiarPar(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-marca text-white hover:bg-marca/90"
                onClick={handleCambiarPar}
                disabled={procesando || !nuevoParticipanteId}
              >
                {procesando ? "Guardando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cambiar Club */}
      {modalCambiarClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-fondo-tarjeta rounded-xl border border-borde p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-texto">Cambiar Club del Binomio</h3>
            <div>
              <Label>Club</Label>
              <select
                value={nuevoClubId}
                onChange={(e) => setNuevoClubId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
              >
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalCambiarClub(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-marca text-white hover:bg-marca/90"
                onClick={handleCambiarClub}
                disabled={procesando || nuevoClubId === binomio.club.id}
              >
                {procesando ? "Guardando..." : "Confirmar Cambio de Club"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Anular Ítem */}
      {modalAnularItem && itemParaAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-fondo-tarjeta rounded-xl border border-borde p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-red-600">
              Anular Inscripción
            </h3>
            <p className="text-xs text-texto-suave">
              Esta acción anulará el ítem. Solo se puede realizar si no tiene pagos registrados.
            </p>
            <div>
              <Label>Motivo de anulación (obligatorio, mín. 10 caracteres)</Label>
              <Input
                placeholder="Ej: Inscrito por error por duplicado..."
                value={motivoAnulacionItem}
                onChange={(e) => setMotivoAnulacionItem(e.target.value)}
              />
              <span className="text-[11px] text-texto-suave">
                {motivoAnulacionItem.length}/10 caracteres mínimos
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalAnularItem(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleAnularItem}
                disabled={procesando || motivoAnulacionItem.trim().length < 10}
              >
                {procesando ? "Anulando..." : "Confirmar Anulación"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Anular Binomio Completo */}
      {modalAnularBinomio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-fondo-tarjeta rounded-xl border border-borde p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-red-600">Anular Binomio Completo</h3>
            <p className="text-xs text-texto-suave">
              Se anularán todas las inscripciones y cargos de este binomio. Esta acción no se puede deshacer.
            </p>
            <div>
              <Label>Motivo de anulación (obligatorio, mín. 10 caracteres)</Label>
              <Input
                placeholder="Ej: Binomio no asistirá al concurso..."
                value={motivoAnularBinomio}
                onChange={(e) => setMotivoAnularBinomio(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalAnularBinomio(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleAnularBinomio}
                disabled={procesando || motivoAnularBinomio.trim().length < 10}
              >
                {procesando ? "Anulando..." : "Anular Binomio"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Desasignar Pago */}
      {modalDesasignar && pagoParaDesasignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-fondo-tarjeta rounded-xl border border-borde p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-red-600">Desasignar Pago</h3>
            <p className="text-xs text-texto-suave">
              El monto de <span className="font-semibold text-texto">{formatearMonto(pagoParaDesasignar.montoClp)}</span> volverá al saldo disponible del movimiento para ser reasignado a otro ítem.
            </p>
            <div>
              <Label>Motivo de la desasignación (obligatorio, mín. 10 caracteres)</Label>
              <Input
                placeholder="Ej: Error al imputar pago a este binomio..."
                value={motivoDesasignar}
                onChange={(e) => setMotivoDesasignar(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalDesasignar(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDesasignarPago}
                disabled={procesando || motivoDesasignar.trim().length < 10}
              >
                {procesando ? "Desasignando..." : "Confirmar Desasignación"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
