"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Ban,
  FileText,
  Eye,
  Check,
  Tag,
  AlertCircle,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Monto } from "@/components/app/monto";
import { Fecha } from "@/components/app/fecha";
import {
  validarMovimiento,
  observarMovimiento,
  anularMovimiento,
  marcarRespaldoVisto,
} from "@/dominio/movimientos/acciones";
import {
  marcarVisto,
  revertirAjuste,
} from "@/dominio/inscripciones/binomios/acciones";
import { formatearMonto } from "@/lib/presentacion/formato";

interface BandejaValidarProps {
  movimientos: any[];
  respaldosNuevos: any[];
  ajustesPendientes?: {
    inscripciones: any[];
    cargos: any[];
    total: number;
  };
  usuarioActual: {
    id: string;
    rol: string;
  };
}

export function BandejaValidar({
  movimientos: initialMovimientos,
  respaldosNuevos: initialRespaldosNuevos,
  ajustesPendientes: initialAjustesPendientes,
  usuarioActual,
}: BandejaValidarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [movimientos, setMovimientos] = useState(initialMovimientos);
  const [respaldosNuevos, setRespaldosNuevos] = useState(initialRespaldosNuevos);
  const [ajustesPendientes, setAjustesPendientes] = useState(
    initialAjustesPendientes || { inscripciones: [], cargos: [], total: 0 }
  );
  const [modalRevertirAjuste, setModalRevertirAjuste] = useState<{
    tipo: "inscripcion" | "cargo";
    id: string;
    version: number;
  } | null>(null);
  const [motivoRevertir, setMotivoRevertir] = useState("");

  const [indiceActual, setIndiceActual] = useState(0);

  // Modales
  const [modalObservar, setModalObservar] = useState(false);
  const [comentarioObservacion, setComentarioObservacion] = useState("");

  const [modalAnular, setModalAnular] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");

  const movActual = movimientos[indiceActual];

  // Regla: nadie valida lo propio
  const esPropio =
    movActual &&
    (movActual.enviadoAValidarPorId === usuarioActual.id ||
      (!movActual.enviadoAValidarPorId && movActual.registradoPorId === usuarioActual.id));

  const avanzar = () => {
    if (indiceActual < movimientos.length - 1) {
      setIndiceActual(indiceActual + 1);
    }
  };

  const retroceder = () => {
    if (indiceActual > 0) {
      setIndiceActual(indiceActual - 1);
    }
  };

  // Validar
  const manejarValidar = () => {
    if (!movActual) return;

    startTransition(async () => {
      const res = await validarMovimiento(movActual.id, movActual.version);
      if (res.exito) {
        toast.success("Movimiento validado.");
        const rest = movimientos.filter((m) => m.id !== movActual.id);
        setMovimientos(rest);
        if (indiceActual >= rest.length && rest.length > 0) {
          setIndiceActual(rest.length - 1);
        }
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo validar el movimiento.");
      }
    });
  };

  // Observar
  const manejarObservar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movActual || !comentarioObservacion.trim()) return;

    startTransition(async () => {
      const res = await observarMovimiento(
        movActual.id,
        comentarioObservacion,
        movActual.version
      );
      if (res.exito) {
        toast.success("Movimiento observado y devuelto.");
        setModalObservar(false);
        setComentarioObservacion("");
        const rest = movimientos.filter((m) => m.id !== movActual.id);
        setMovimientos(rest);
        if (indiceActual >= rest.length && rest.length > 0) {
          setIndiceActual(rest.length - 1);
        }
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo observar el movimiento.");
      }
    });
  };

  // Anular
  const manejarAnular = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movActual || !motivoAnulacion.trim()) return;

    startTransition(async () => {
      const res = await anularMovimiento(
        movActual.id,
        motivoAnulacion,
        movActual.version
      );
      if (res.exito) {
        toast.success("Movimiento anulado.");
        setModalAnular(false);
        setMotivoAnulacion("");
        const rest = movimientos.filter((m) => m.id !== movActual.id);
        setMovimientos(rest);
        if (indiceActual >= rest.length && rest.length > 0) {
          setIndiceActual(rest.length - 1);
        }
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo anular el movimiento.");
      }
    });
  };

  // Marcar respaldo nuevo como visto
  const manejarMarcarVisto = (respaldoId: string) => {
    startTransition(async () => {
      const res = await marcarRespaldoVisto(respaldoId);
      if (res.exito) {
        toast.success("Respaldo marcado como visto.");
        setRespaldosNuevos(respaldosNuevos.filter((r) => r.id !== respaldoId));
        router.refresh();
      } else {
        toast.error("No se pudo marcar como visto.");
      }
    });
  };

  const manejarMarcarVistoAjuste = (tipo: "inscripcion" | "cargo", id: string) => {
    startTransition(async () => {
      const res = await marcarVisto(tipo, id);
      if (res.exito) {
        toast.success("Ajuste marcado como visto.");
        setAjustesPendientes((prev) => ({
          ...prev,
          inscripciones: prev.inscripciones.filter((i) => i.id !== id),
          cargos: prev.cargos.filter((c) => c.id !== id),
          total: Math.max(0, prev.total - 1),
        }));
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo marcar como visto.");
      }
    });
  };

  const manejarRevertirAjuste = () => {
    if (!modalRevertirAjuste) return;
    if (motivoRevertir.trim().length < 10) {
      toast.error("El motivo debe tener al menos 10 caracteres.");
      return;
    }
    startTransition(async () => {
      const res = await revertirAjuste(
        modalRevertirAjuste.tipo,
        modalRevertirAjuste.id,
        modalRevertirAjuste.version,
        motivoRevertir.trim()
      );
      if (res.exito) {
        toast.success("Ajuste revertido correctamente.");
        setAjustesPendientes((prev) => ({
          ...prev,
          inscripciones: prev.inscripciones.filter((i) => i.id !== modalRevertirAjuste.id),
          cargos: prev.cargos.filter((c) => c.id !== modalRevertirAjuste.id),
          total: Math.max(0, prev.total - 1),
        }));
        setModalRevertirAjuste(null);
        setMotivoRevertir("");
        router.refresh();
      } else {
        toast.error(res.error || "Error al revertir ajuste.");
      }
    });
  };


  return (
    <div className="space-y-6">
      {/* Encabezado y Navegador de a uno */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Link href="/movimientos" className="text-stone-500 hover:text-stone-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-stone-900">Validar de a uno</h1>
        </div>

        {movimientos.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full">
              {indiceActual + 1} de {movimientos.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={indiceActual === 0}
                onClick={retroceder}
                aria-label="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={indiceActual === movimientos.length - 1}
                onClick={avanzar}
                aria-label="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Si no hay movimientos pendientes por validar */}
      {movimientos.length === 0 ? (
        <div className="p-8 bg-white border border-stone-200 rounded-xl text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="font-bold text-base text-stone-900">¡Bandeja al día!</h2>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            No hay movimientos pendientes de validación en este momento.
          </p>
          <Link href="/movimientos">
            <Button variant="outline" size="sm" className="mt-2 text-xs">
              Ver todos los movimientos
            </Button>
          </Link>
        </div>
      ) : (
        /* Tarjeta de validación de a uno */
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden space-y-4">
          {/* Alertas destacadas en la parte superior */}
          {esPropio && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>Registro propio:</strong> Por regla de probidad (nadie valida lo suyo), otro
                administrador debe validar este movimiento.
              </span>
            </div>
          )}

          {movActual.sinIdentificar && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Ingreso sin identificar:</strong> Debe ser clasificado con una categoría
                  antes de poder validarlo.
                </span>
              </div>
              <Link
                href={`/movimientos/${movActual.id}`}
                className="font-bold underline text-amber-800 shrink-0"
              >
                Clasificar
              </Link>
            </div>
          )}

          {movActual.sinRespaldo && (
            <div className="p-3 bg-stone-100 border-b border-stone-200 text-xs text-stone-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-stone-500" />
              <span>
                <strong>Registrado sin respaldo:</strong> Justificación ingresada: «
                {movActual.observacion}»
              </span>
            </div>
          )}

          {/* Vista previa en grande del respaldo */}
          <div className="px-5 pt-3">
            {movActual.respaldos && movActual.respaldos.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-stone-600 block">
                  Respaldo adjunto:
                </span>
                <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50 flex items-center justify-center p-2 min-h-64 max-h-96">
                  {movActual.respaldos[0].tipoMime === "application/pdf" ? (
                    <div className="p-6 text-center space-y-2">
                      <FileText className="w-12 h-12 text-rose-600 mx-auto" />
                      <p className="text-xs font-medium text-stone-700">Documento PDF</p>
                      <a
                        href={`/api/respaldos/${movActual.respaldos[0].id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-700 underline font-semibold"
                      >
                        Abrir PDF en nueva pestaña
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <a
                      href={`/api/respaldos/${movActual.respaldos[0].id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block cursor-zoom-in"
                    >
                      <img
                        src={`/api/respaldos/${movActual.respaldos[0].id}`}
                        alt="Comprobante"
                        className="max-h-80 max-w-full object-contain rounded"
                      />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 bg-stone-50 border border-dashed border-stone-200 rounded-xl text-center text-xs text-stone-400">
                Sin archivos de imagen o PDF adjuntos
              </div>
            )}
          </div>

          {/* Datos del Movimiento */}
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-stone-500">
                  {movActual.tipo} · {movActual.naturaleza}
                </span>
                <h2 className="text-lg font-bold text-stone-900">
                  {movActual.descripcion ||
                    movActual.categoria?.nombre ||
                    (movActual.sinIdentificar ? "Ingreso sin identificar" : "Movimiento")}
                </h2>
                <p className="text-xs text-stone-500">
                  Fecha del hecho: <Fecha valor={movActual.fecha} />
                </p>
              </div>

              <div className="text-right">
                <Monto
                  valor={movActual.montoClp}
                  tipo={movActual.tipo}
                  className="text-xl font-black block"
                />
                <span className="text-xs text-stone-500 capitalize">
                  {movActual.estadoPago === "pagado"
                    ? movActual.tipo === "gasto"
                      ? "Pagado"
                      : "Recibido"
                    : "Pendiente"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs border-t border-stone-100 pt-3">
              <div>
                <span className="text-stone-400 block text-[11px]">Categoría:</span>
                <span className="font-semibold text-stone-800">
                  {movActual.categoria?.nombre || "Sin categoría"}
                </span>
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Contraparte:</span>
                <span className="font-semibold text-stone-800">
                  {movActual.contraparte?.nombre || "—"}
                </span>
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Registrado por:</span>
                <span className="font-medium text-stone-700">
                  {movActual.registradoPor?.nombre || "—"}
                </span>
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Medio de pago:</span>
                <span className="font-medium text-stone-700 capitalize">
                  {movActual.medioPago || "—"}
                </span>
              </div>
            </div>

            {/* Botones de acción de la bandeja */}
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-stone-200">
              <Button
                type="button"
                disabled={isPending || esPropio || movActual.sinIdentificar}
                onClick={manejarValidar}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-11 px-5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Validar
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isPending || esPropio}
                onClick={() => setModalObservar(true)}
                className="text-amber-800 border-amber-300 hover:bg-amber-50 font-semibold text-xs h-11 px-4"
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                Observar
              </Button>

              <Link href={`/movimientos/${movActual.id}`}>
                <Button variant="ghost" size="sm" className="h-11 text-xs text-stone-600">
                  Ver detalle completo
                </Button>
              </Link>

              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setModalAnular(true)}
                className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs h-11 px-3.5 ml-auto"
              >
                <Ban className="w-4 h-4 mr-1.5" />
                Anular
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sección 2: Respaldos Nuevos agregados a movimientos validados (§3.4) */}
      {respaldosNuevos.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center justify-between">
            <span>Respaldos nuevos en movimientos validados ({respaldosNuevos.length})</span>
            <span className="text-[11px] text-stone-400 font-normal">
              Subidos después de validar
            </span>
          </h2>

          <div className="space-y-2">
            {respaldosNuevos.map((rn) => (
              <div
                key={rn.id}
                className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-stone-900 block truncate">
                      {rn.movimiento?.descripcion || "Movimiento"} (${rn.movimiento?.montoClp.toLocaleString("es-CL")})
                    </span>
                    <span className="text-stone-500 text-[11px]">
                      Subido por {rn.subidoPor?.nombre || "Ayudante"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/respaldos/${rn.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-stone-500 hover:text-emerald-700"
                    title="Ver archivo"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => manejarMarcarVisto(rn.id)}
                    className="h-8 text-xs font-medium bg-white"
                  >
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Visto
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Observar */}
      {modalObservar && movActual && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={manejarObservar}
            className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-stone-200 text-xs"
          >
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              Observar movimiento
            </h3>
            <p className="text-stone-600">
              Devuelve el movimiento a quien lo envió con un comentario para que lo corrija:
            </p>
            <Textarea
              value={comentarioObservacion}
              onChange={(e) => setComentarioObservacion(e.target.value)}
              placeholder="Ej: La boleta no corresponde al monto indicado..."
              maxLength={300}
              rows={3}
              required
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalObservar(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || !comentarioObservacion.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Enviar observación
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Anular */}
      {modalAnular && movActual && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={manejarAnular}
            className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-stone-200 text-xs"
          >
            <h3 className="font-bold text-sm text-rose-700 flex items-center gap-1.5">
              <Ban className="w-4 h-4 text-rose-600" />
              Anular movimiento
            </h3>
            <p className="text-stone-600">
              El movimiento dejará de sumar y quedará registrado en auditoría.
            </p>
            <Textarea
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              placeholder="Motivo de anulación..."
              maxLength={300}
              rows={3}
              required
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalAnular(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || !motivoAnulacion.trim()}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold"
              >
                Confirmar anulación
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Sección: Ajustes de Inscripción Pendientes de Revisión (Regla 3.3) */}
      {ajustesPendientes.total > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900">
              Ajustes de inscripción realizados por ayudantes ({ajustesPendientes.total})
            </h2>
          </div>

          <div className="space-y-2">
            {ajustesPendientes.inscripciones.map((ins) => (
              <div
                key={ins.id}
                className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-stone-900">
                    <span>
                      {ins.binomio.jinete.nombre} / {ins.binomio.caballo.nombre}
                    </span>
                    <span>•</span>
                    <span>Prueba: {ins.prueba.nombre}</span>
                  </div>
                  <div className="text-stone-600">
                    <span>Nuevo monto: {formatearMonto(ins.montoClp)}</span>
                    {ins.ajuste !== null && ins.ajuste !== undefined && (
                      <span className="ml-1 text-amber-700">
                        (Ajuste: {formatearMonto(ins.ajuste)})
                      </span>
                    )}
                  </div>
                  {ins.motivoAjuste && (
                    <p className="text-stone-500 italic">&quot;{ins.motivoAjuste}&quot;</p>
                  )}
                  <span className="text-[11px] text-stone-400 block">
                    Registrado por {ins.registradoPor?.nombre || "Ayudante"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs bg-white text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                    disabled={isPending}
                    onClick={() => manejarMarcarVistoAjuste("inscripcion", ins.id)}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Visto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs bg-white text-rose-700 hover:bg-rose-50 border-rose-300"
                    disabled={isPending}
                    onClick={() => {
                      setModalRevertirAjuste({
                        tipo: "inscripcion",
                        id: ins.id,
                        version: ins.version,
                      });
                      setMotivoRevertir("");
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Revertir
                  </Button>
                </div>
              </div>
            ))}

            {ajustesPendientes.cargos.map((cargo) => (
              <div
                key={cargo.id}
                className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-stone-900">
                    <span>
                      {cargo.binomio
                        ? `${cargo.binomio.jinete.nombre} / ${cargo.binomio.caballo.nombre}`
                        : cargo.jinete?.nombre || cargo.club?.nombre || "Cargo"}
                    </span>
                    <span>•</span>
                    <span>Concepto: {cargo.concepto.nombre}</span>
                  </div>
                  <div className="text-stone-600">
                    <span>Nuevo monto: {formatearMonto(cargo.montoTotalClp)}</span>
                    {cargo.ajuste !== null && cargo.ajuste !== undefined && (
                      <span className="ml-1 text-amber-700">
                        (Ajuste: {formatearMonto(cargo.ajuste)})
                      </span>
                    )}
                  </div>
                  {cargo.motivoAjuste && (
                    <p className="text-stone-500 italic">&quot;{cargo.motivoAjuste}&quot;</p>
                  )}
                  <span className="text-[11px] text-stone-400 block">
                    Registrado por {cargo.registradoPor?.nombre || "Ayudante"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs bg-white text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                    disabled={isPending}
                    onClick={() => manejarMarcarVistoAjuste("cargo", cargo.id)}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Visto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs bg-white text-rose-700 hover:bg-rose-50 border-rose-300"
                    disabled={isPending}
                    onClick={() => {
                      setModalRevertirAjuste({
                        tipo: "cargo",
                        id: cargo.id,
                        version: cargo.version,
                      });
                      setMotivoRevertir("");
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Revertir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Revertir Ajuste */}
      {modalRevertirAjuste && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-stone-200 text-xs">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              Revertir ajuste de tarifa
            </h3>
            <p className="text-stone-600">
              El valor volverá a la tarifa base original del concepto o prueba.
            </p>
            <Textarea
              value={motivoRevertir}
              onChange={(e) => setMotivoRevertir(e.target.value)}
              placeholder="Motivo de la reversión (mín. 10 caracteres)..."
              maxLength={300}
              rows={3}
              required
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalRevertirAjuste(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isPending || motivoRevertir.trim().length < 10}
                onClick={manejarRevertirAjuste}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold"
              >
                Confirmar reversión
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
