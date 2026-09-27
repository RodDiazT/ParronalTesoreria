"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Ban,
  Upload,
  Eye,
  Trash2,
  Tag,
  DollarSign,
  Calendar,
  Building2,
  User,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Estado } from "@/components/app/estado";
import { Monto } from "@/components/app/monto";
import { Fecha } from "@/components/app/fecha";
import {
  validarMovimiento,
  observarMovimiento,
  reenviarMovimiento,
  anularMovimiento,
  clasificarMovimiento,
  agregarRespaldoAction,
  anularRespaldo,
} from "@/dominio/movimientos/acciones";
import { marcarPagadoAction } from "@/dominio/movimientos/abonos";
import { obtenerFechaHoyChile } from "@/dominio/movimientos/reglas";

interface FichaMovimientoProps {
  movimiento: any;
  eventosAuditoria: any[];
  categorias: any[];
  contrapartes: any[];
  usuarioActual: {
    id: string;
    rol: string;
  };
}

export function FichaMovimiento({
  movimiento: initialMovimiento,
  eventosAuditoria,
  categorias,
  contrapartes,
  usuarioActual,
}: FichaMovimientoProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [movimiento, setMovimiento] = useState(initialMovimiento);

  // Modales
  const [modalObservar, setModalObservar] = useState(false);
  const [comentarioObservacion, setComentarioObservacion] = useState("");

  const [modalAnular, setModalAnular] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");

  const [modalPagar, setModalPagar] = useState(false);
  const [montoPagar, setMontoPagar] = useState(movimiento.montoClp.toString());
  const [fechaPagoPagar, setFechaPagoPagar] = useState(obtenerFechaHoyChile());
  const [medioPagoPagar, setMedioPagoPagar] = useState<"transferencia" | "efectivo" | "otro">("transferencia");
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);

  const [modalClasificar, setModalClasificar] = useState(false);
  const [categoriaClasificarId, setCategoriaClasificarId] = useState("");
  const [contraparteClasificarId, setContraparteClasificarId] = useState("");

  const [modalSubirRespaldo, setModalSubirRespaldo] = useState(false);
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null);

  const [modalAnularRespaldoId, setModalAnularRespaldoId] = useState<string | null>(null);
  const [motivoAnulacionRespaldo, setMotivoAnulacionRespaldo] = useState("");
  const [justificacionSinRespaldo, setJustificacionSinRespaldo] = useState("");

  const [visorImagenUrl, setVisorImagenUrl] = useState<string | null>(null);

  const esAdmin = usuarioActual.rol === "administrador";
  const esObservador = usuarioActual.rol === "observador";
  const esPropio =
    movimiento.enviadoAValidarPorId === usuarioActual.id ||
    (!movimiento.enviadoAValidarPorId && movimiento.registradoPorId === usuarioActual.id);

  // 1. Validar
  const manejarValidar = () => {
    startTransition(async () => {
      const res = await validarMovimiento(movimiento.id, movimiento.version);
      if (res.exito && res.movimiento) {
        setMovimiento(res.movimiento);
        toast.success("Movimiento validado correctamente.");
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo validar el movimiento.");
      }
    });
  };

  // 2. Observar
  const manejarObservar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentarioObservacion.trim()) return;

    startTransition(async () => {
      const res = await observarMovimiento(
        movimiento.id,
        comentarioObservacion,
        movimiento.version
      );
      if (res.exito && res.movimiento) {
        setMovimiento(res.movimiento);
        setModalObservar(false);
        toast.success("Movimiento observado y devuelto para corrección.");
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo observar el movimiento.");
      }
    });
  };

  // 3. Reenviar
  const manejarReenviar = () => {
    startTransition(async () => {
      const res = await reenviarMovimiento(movimiento.id, movimiento.version);
      if (res.exito && res.movimiento) {
        setMovimiento(res.movimiento);
        toast.success("Movimiento reenviado a la bandeja de validación.");
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo reenviar el movimiento.");
      }
    });
  };

  // 4. Anular
  const manejarAnular = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoAnulacion.trim()) return;

    startTransition(async () => {
      const res = await anularMovimiento(
        movimiento.id,
        motivoAnulacion,
        movimiento.version
      );
      if (res.exito && res.movimiento) {
        setMovimiento(res.movimiento);
        setModalAnular(false);
        toast.success("Movimiento anulado correctamente.");
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo anular el movimiento.");
      }
    });
  };

  // 5. Marcar pagado o abono
  const manejarMarcarPagado = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseInt(montoPagar.replace(/\D/g, ""), 10);
    if (!monto || monto <= 0) return;

    const fd = new FormData();
    fd.append("montoClp", monto.toString());
    fd.append("fechaPago", fechaPagoPagar);
    fd.append("medioPago", medioPagoPagar);
    if (archivoComprobante) {
      fd.append("archivo", archivoComprobante);
    }

    startTransition(async () => {
      const res = await marcarPagadoAction(movimiento.id, fd, movimiento.version);
      if (res.exito) {
        setModalPagar(false);
        toast.success(
          res.tipo === "abono"
            ? "Abono registrado con éxito."
            : "Movimiento marcado como pagado."
        );
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo registrar el pago.");
      }
    });
  };

  // 6. Clasificar
  const manejarClasificar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoriaClasificarId) return;

    startTransition(async () => {
      const res = await clasificarMovimiento(
        movimiento.id,
        categoriaClasificarId,
        contraparteClasificarId || null,
        movimiento.version
      );
      if (res.exito && res.movimiento) {
        setMovimiento(res.movimiento);
        setModalClasificar(false);
        toast.success("Ingreso clasificado correctamente.");
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo clasificar el ingreso.");
      }
    });
  };

  // 7. Subir respaldo posterior
  const manejarSubirRespaldo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivoNuevo) return;

    const fd = new FormData();
    fd.append("archivo", archivoNuevo);

    startTransition(async () => {
      const res = await agregarRespaldoAction(movimiento.id, fd);
      if (res.exito) {
        setModalSubirRespaldo(false);
        setArchivoNuevo(null);
        toast.success("Respaldo agregado con éxito.");
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo agregar el respaldo.");
      }
    });
  };

  // 8. Anular respaldo
  const manejarAnularRespaldo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAnularRespaldoId || !motivoAnulacionRespaldo.trim()) return;

    startTransition(async () => {
      const res = await anularRespaldo(
        modalAnularRespaldoId,
        motivoAnulacionRespaldo,
        justificacionSinRespaldo
      );
      if (res.exito) {
        setModalAnularRespaldoId(null);
        setMotivoAnulacionRespaldo("");
        setJustificacionSinRespaldo("");
        toast.success("Respaldo anulado.");
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo anular el respaldo.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Botón Volver */}
      <div className="flex items-center justify-between">
        <Link
          href="/movimientos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a movimientos</span>
        </Link>
        <span className="text-xs text-stone-400">ID: {movimiento.id.slice(0, 8)}...</span>
      </div>

      {/* Cartel de Anulado si aplica */}
      {movimiento.anulado && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Ban className="w-4 h-4 text-rose-600" />
            Movimiento Anulado
          </p>
          <p>
            <strong>Motivo:</strong> {movimiento.motivoAnulacion}
          </p>
          {movimiento.anuladoPor && (
            <p className="text-[11px] text-rose-600">
              Por {movimiento.anuladoPor.nombre} el{" "}
              {new Date(movimiento.anuladoEn).toLocaleString("es-CL")}
            </p>
          )}
        </div>
      )}

      {/* Cartel de Observación si aplica */}
      {movimiento.estadoValidacion === "observado" && movimiento.comentarioObservacion && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            Movimiento Observado (Requiere corrección)
          </p>
          <p className="italic">«{movimiento.comentarioObservacion}»</p>
          {esPropio && (
            <p className="text-[11px] text-amber-700 font-medium pt-1">
              Edita los datos o adjunta la boleta faltante y pulsa &quot;Reenviar a validación&quot;.
            </p>
          )}
        </div>
      )}

      {/* Tarjeta Principal de Detalle */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <span
              className={`text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                movimiento.tipo === "gasto"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {movimiento.tipo}
            </span>
            <h1 className="text-xl font-bold text-stone-900 mt-1">
              {movimiento.descripcion ||
                movimiento.categoria?.nombre ||
                (movimiento.sinIdentificar ? "Ingreso sin identificar" : "Movimiento")}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Ocurrido el{" "}
              <strong className="text-stone-700">
                <Fecha valor={movimiento.fecha} />
              </strong>
            </p>
          </div>

          <div className="text-right">
            <Monto
              valor={movimiento.montoClp}
              tipo={movimiento.tipo}
              anulado={movimiento.anulado}
              especie={movimiento.naturaleza === "especie"}
              className="text-2xl font-black block"
            />
            <div className="mt-1">
              <Estado
                estado={
                  movimiento.anulado
                    ? "anulado"
                    : movimiento.estadoValidacion === "observado"
                    ? "observado"
                    : movimiento.estadoValidacion === "por_validar"
                    ? "por_validar"
                    : movimiento.estadoPago === "pendiente"
                    ? movimiento.tipo === "ingreso"
                      ? "por_cobrar"
                      : "por_pagar"
                    : "validado"
                }
                entidad="movimiento"
              />
            </div>
          </div>
        </div>

        {/* Compromiso original vs Saldo si tiene abonos */}
        {movimiento.montoOriginalClp > movimiento.montoClp && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs flex justify-between items-center text-amber-900">
            <div>
              <span className="font-semibold block">Compromiso inicial:</span>
              <span className="text-stone-600 line-through">
                ${movimiento.montoOriginalClp.toLocaleString("es-CL")}
              </span>
            </div>
            <div className="text-right">
              <span className="font-semibold block">Saldo pendiente actual:</span>
              <span className="font-bold text-amber-800 text-sm">
                ${movimiento.montoClp.toLocaleString("es-CL")}
              </span>
            </div>
          </div>
        )}

        {/* Si es un abono de otro movimiento */}
        {movimiento.abonoDe && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <div>
              <span>Este movimiento es un abono a: </span>
              <strong>{movimiento.abonoDe.descripcion || "Compromiso original"}</strong>
            </div>
            <Link
              href={`/movimientos/${movimiento.abonoDe.id}`}
              className="font-semibold underline flex items-center gap-1 text-blue-700"
            >
              Ver original
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Grilla de atributos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-stone-500 block">Categoría:</span>
            {movimiento.sinIdentificar ? (
              <span className="font-semibold text-amber-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Sin identificar (Por clasificar)
              </span>
            ) : (
              <span className="font-semibold text-stone-800">
                {movimiento.categoria?.nombre || "—"}
              </span>
            )}
          </div>

          <div>
            <span className="text-stone-500 block">Contraparte:</span>
            <span className="font-semibold text-stone-800">
              {movimiento.contraparte?.nombre || "—"}
            </span>
          </div>

          <div>
            <span className="text-stone-500 block">Estado de pago:</span>
            <span className="font-semibold text-stone-800 capitalize">
              {movimiento.estadoPago === "pagado"
                ? movimiento.tipo === "gasto"
                  ? "Pagado"
                  : "Recibido"
                : "Pendiente"}
            </span>
            {movimiento.fechaPago && (
              <span className="text-stone-500 block text-[11px]">
                Pagado el <Fecha valor={movimiento.fechaPago} />
              </span>
            )}
          </div>

          {movimiento.medioPago && (
            <div>
              <span className="text-stone-500 block">Medio de pago:</span>
              <span className="font-semibold text-stone-800 capitalize">
                {movimiento.medioPago}
              </span>
            </div>
          )}

          {movimiento.nombreOrigen && (
            <div>
              <span className="text-stone-500 block">Nombre de origen:</span>
              <span className="font-semibold text-stone-800">{movimiento.nombreOrigen}</span>
            </div>
          )}

          {movimiento.pagadoPor && (
            <div>
              <span className="text-stone-500 block">Reembolso adeudado a:</span>
              <span className="font-semibold text-amber-800 font-bold">
                {movimiento.pagadoPor.nombre}
              </span>
            </div>
          )}

          <div>
            <span className="text-stone-500 block">Registrado por:</span>
            <span className="font-medium text-stone-800">
              {movimiento.registradoPor?.nombre || "—"}
            </span>
          </div>

          {movimiento.validadoPor && (
            <div>
              <span className="text-stone-500 block">Validado por:</span>
              <span className="font-medium text-emerald-800 font-bold">
                {movimiento.validadoPor.nombre}
              </span>
            </div>
          )}
        </div>

        {/* Observación / Justificación */}
        {movimiento.observacion && (
          <div className="p-3 bg-stone-50 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-stone-600 block">
              {movimiento.sinRespaldo ? "Justificación (Sin respaldo):" : "Observación:"}
            </span>
            <p className="text-stone-800 italic">«{movimiento.observacion}»</p>
          </div>
        )}

        {/* Sección de Abonos vinculados si existen */}
        {movimiento.abonos && movimiento.abonos.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-stone-200">
            <span className="text-xs font-bold text-stone-800 block">
              Abonos registrados a este compromiso ({movimiento.abonos.length}):
            </span>
            <div className="space-y-1.5">
              {movimiento.abonos.map((ab: any) => (
                <div
                  key={ab.id}
                  className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs"
                >
                  <div>
                    <span className="font-semibold text-stone-800">
                      ${ab.montoClp.toLocaleString("es-CL")}
                    </span>
                    <span className="text-stone-500 block text-[11px]">
                      Fecha pago: <Fecha valor={ab.fechaPago} /> · {ab.medioPago}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Estado estado={ab.estadoValidacion} entidad="movimiento" />
                    <Link
                      href={`/movimientos/${ab.id}`}
                      className="text-emerald-700 hover:underline font-semibold"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección de Respaldos (oculto a observador según §3.8 y §4) */}
        <div className="space-y-3 pt-3 border-t border-stone-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Respaldos y Boletas
            </h3>
            {!movimiento.anulado && !esObservador && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setModalSubirRespaldo(true)}
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Agregar respaldo
              </Button>
            )}
          </div>

          {esObservador ? (
            <p className="text-xs text-stone-500 italic">
              {movimiento.cantidadRespaldos > 0
                ? `${movimiento.cantidadRespaldos} archivo(s) de respaldo adjunto(s). Los comprobantes están restringidos por privacidad normada.`
                : "Sin respaldos adjuntos."}
            </p>
          ) : movimiento.respaldos && movimiento.respaldos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {movimiento.respaldos.map((r: any) => (
                <div
                  key={r.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    r.anulado
                      ? "bg-stone-100 border-stone-200 opacity-60"
                      : "bg-white border-stone-200 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {r.tipoMime === "application/pdf" ? (
                      <div className="w-9 h-9 rounded bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-rose-600" />
                      </div>
                    ) : (
                      <img
                        src={`/api/respaldos/${r.id}`}
                        alt="Comprobante"
                        className="w-9 h-9 rounded object-cover border border-stone-200 shrink-0 cursor-pointer"
                        onClick={() => setVisorImagenUrl(`/api/respaldos/${r.id}`)}
                      />
                    )}
                    <div className="truncate text-xs">
                      <span className="font-medium text-stone-900 block truncate">
                        {r.esComprobantePago ? "Comprobante de pago" : "Respaldo"}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        {Math.round(r.bytes / 1024)} KB · {r.subidoPor?.nombre}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={`/api/respaldos/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-stone-500 hover:text-emerald-700"
                      title="Abrir respaldo"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    {!movimiento.anulado && !r.anulado && (esAdmin || esPropio) && (
                      <button
                        type="button"
                        onClick={() => setModalAnularRespaldoId(r.id)}
                        className="p-1 text-stone-400 hover:text-rose-600"
                        title="Anular respaldo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic">
              {movimiento.sinRespaldo
                ? "Movimiento marcado sin respaldo físico ni digital."
                : "No hay respaldos adjuntos."}
            </p>
          )}
        </div>

        {/* Botones de Acción contextuales */}
        {!movimiento.anulado && (
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-stone-200">
            {/* Si está por validar y es admin (y no lo envió él) */}
            {movimiento.estadoValidacion === "por_validar" && esAdmin && !esPropio && (
              <>
                <Button
                  type="button"
                  disabled={isPending || movimiento.sinIdentificar}
                  onClick={manejarValidar}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-10 px-4"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Validar movimiento
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => setModalObservar(true)}
                  className="text-amber-800 border-amber-300 hover:bg-amber-50 font-semibold text-xs h-10 px-4"
                >
                  <MessageSquare className="w-4 h-4 mr-1.5" />
                  Observar
                </Button>
              </>
            )}

            {/* Si está observado y es el autor */}
            {movimiento.estadoValidacion === "observado" && esPropio && (
              <Button
                type="button"
                disabled={isPending}
                onClick={manejarReenviar}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-10 px-4"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Reenviar a validación
              </Button>
            )}

            {/* Marcar pagado si está pendiente */}
            {movimiento.estadoPago === "pendiente" && !esObservador && (
              <Button
                type="button"
                disabled={isPending}
                onClick={() => setModalPagar(true)}
                className="bg-stone-900 hover:bg-black text-white font-semibold text-xs h-10 px-4"
              >
                <DollarSign className="w-4 h-4 mr-1.5" />
                {movimiento.tipo === "gasto" ? "Marcar pagado / Abonar" : "Marcar recibido / Abonar"}
              </Button>
            )}

            {/* Clasificar si es sinIdentificar y es admin */}
            {movimiento.sinIdentificar && esAdmin && (
              <Button
                type="button"
                disabled={isPending}
                onClick={() => setModalClasificar(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-10 px-4"
              >
                <Tag className="w-4 h-4 mr-1.5" />
                Clasificar ingreso
              </Button>
            )}

            {/* Anular */}
            {(esAdmin || (esPropio && movimiento.estadoValidacion === "por_validar")) && (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setModalAnular(true)}
                className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs h-10 px-3.5 ml-auto"
              >
                <Ban className="w-4 h-4 mr-1.5" />
                Anular
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Línea de tiempo de Auditoría (§3.10) */}
      {!esObservador && eventosAuditoria.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-stone-500" />
            Línea de tiempo de auditoría ({eventosAuditoria.length})
          </h3>

          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-stone-200">
            {eventosAuditoria.map((ev) => (
              <div key={ev.id} className="relative pl-7 text-xs space-y-1">
                <span className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-stone-100 border-2 border-emerald-600 -translate-x-1/2" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900 capitalize">
                    {ev.accion.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {new Date(ev.creadoEn).toLocaleString("es-CL")}
                  </span>
                </div>
                <p className="text-stone-600">
                  Por <strong>{ev.usuario?.nombre || ev.usuario?.correo}</strong>
                </p>
                {ev.despues?.motivo && (
                  <p className="text-stone-500 italic">«{ev.despues.motivo}»</p>
                )}
                {ev.despues?.comentarioObservacion && (
                  <p className="text-amber-800 italic">«{ev.despues.comentarioObservacion}»</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Observar Movimiento */}
      {modalObservar && (
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
              Ingresa el comentario que verá el ayudante para corregir el registro (máx. 300 caracteres):
            </p>
            <Textarea
              value={comentarioObservacion}
              onChange={(e) => setComentarioObservacion(e.target.value)}
              placeholder="Ej: La boleta no se lee bien, por favor sube otra foto..."
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

      {/* MODAL: Anular Movimiento */}
      {modalAnular && (
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
              Esta acción es irreversible y quedará registrada en auditoría. El movimiento dejará de
              sumar en caja.
            </p>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-stone-700">Motivo de anulación *</Label>
              <Textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="Ej: Registro duplicado, gasto cancelado por proveedor..."
                maxLength={300}
                rows={3}
                required
                autoFocus
              />
            </div>
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

      {/* MODAL: Marcar Pagado o Abonar */}
      {modalPagar && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={manejarMarcarPagado}
            className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-stone-200 text-xs"
          >
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              {movimiento.tipo === "gasto" ? "Registrar Pago / Abono" : "Registrar Recepción / Abono"}
            </h3>

            <div className="p-3 bg-stone-50 rounded-lg text-stone-700 space-y-1">
              <div className="flex justify-between">
                <span>Saldo pendiente actual:</span>
                <strong className="text-stone-900">${movimiento.montoClp.toLocaleString("es-CL")}</strong>
              </div>
              <p className="text-[11px] text-stone-500">
                Si ingresas un monto menor, se creará un abono parcial enlazado.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-stone-700">Monto a pagar *</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={montoPagar}
                onChange={(e) => setMontoPagar(e.target.value)}
                className="h-10 text-base font-bold bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-stone-700">Fecha de pago *</Label>
                <Input
                  type="date"
                  value={fechaPagoPagar}
                  onChange={(e) => setFechaPagoPagar(e.target.value)}
                  max={obtenerFechaHoyChile()}
                  className="h-10 bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-stone-700">Medio de pago *</Label>
                <select
                  value={medioPagoPagar}
                  onChange={(e) => setMedioPagoPagar(e.target.value as any)}
                  className="w-full h-10 px-2 rounded-md border border-stone-300 bg-white"
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-stone-700">
                Comprobante de pago (Opcional)
              </Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setArchivoComprobante(e.target.files?.[0] || null)}
                className="h-10 text-xs bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalPagar(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Confirmar pago
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Clasificar Ingreso sin identificar */}
      {modalClasificar && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={manejarClasificar}
            className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-stone-200 text-xs"
          >
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-amber-600" />
              Clasificar ingreso
            </h3>
            <p className="text-stone-600">
              Selecciona la categoría definitiva para que este ingreso pueda ser validado:
            </p>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-stone-700">Categoría *</Label>
              <select
                value={categoriaClasificarId}
                onChange={(e) => setCategoriaClasificarId(e.target.value)}
                className="w-full h-10 px-2 rounded-md border border-stone-300 bg-white"
                required
              >
                <option value="">Seleccionar categoría...</option>
                {categorias
                  .filter((c) => c.tipo === "ingreso" && !c.claveSistema)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-stone-700">Contraparte (Opcional)</Label>
              <select
                value={contraparteClasificarId}
                onChange={(e) => setContraparteClasificarId(e.target.value)}
                className="w-full h-10 px-2 rounded-md border border-stone-300 bg-white"
              >
                <option value="">Seleccionar contraparte...</option>
                {contrapartes.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalClasificar(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || !categoriaClasificarId}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Guardar clasificación
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Subir Respaldo adicional */}
      {modalSubirRespaldo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={manejarSubirRespaldo}
            className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-stone-200 text-xs"
          >
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-600" />
              Adjuntar respaldo adicional
            </h3>
            <p className="text-stone-600">
              Selecciona una fotografía (JPEG/PNG) o documento PDF. Si eres ayudante y el movimiento
              ya está validado, quedará marcado como nuevo para el administrador.
            </p>
            <Input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setArchivoNuevo(e.target.files?.[0] || null)}
              required
              className="h-10 bg-white"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalSubirRespaldo(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || !archivoNuevo}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Subir respaldo
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Anular Respaldo */}
      {modalAnularRespaldoId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={manejarAnularRespaldo}
            className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-stone-200 text-xs"
          >
            <h3 className="font-bold text-sm text-rose-700 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-600" />
              Anular archivo de respaldo
            </h3>
            <p className="text-stone-600">
              El archivo dejará de ser visible en el detalle. El motivo quedará registrado en
              auditoría.
            </p>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-stone-700">Motivo de anulación *</Label>
              <Input
                type="text"
                value={motivoAnulacionRespaldo}
                onChange={(e) => setMotivoAnulacionRespaldo(e.target.value)}
                placeholder="Ej: Archivo borroso, subido por equivocación..."
                required
                className="h-9 bg-white"
              />
            </div>
            {movimiento.respaldos?.length === 1 && !movimiento.sinRespaldo && (
              <div className="space-y-1 pt-1">
                <Label className="text-[11px] font-semibold text-stone-700">
                  Justificación de &apos;Sin respaldo&apos; (Al anular el único comprobante) *
                </Label>
                <Textarea
                  value={justificacionSinRespaldo}
                  onChange={(e) => setJustificacionSinRespaldo(e.target.value)}
                  placeholder="Justifica por qué el movimiento queda sin respaldo..."
                  required
                  rows={2}
                  className="bg-white"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalAnularRespaldoId(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || !motivoAnulacionRespaldo.trim()}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold"
              >
                Anular respaldo
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Visor de Imagen en Grande */}
      {visorImagenUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setVisorImagenUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={visorImagenUrl}
              alt="Vista ampliada"
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            <p className="text-center text-xs text-white/80 mt-2">Toca en cualquier parte para cerrar</p>
          </div>
        </div>
      )}
    </div>
  );
}
