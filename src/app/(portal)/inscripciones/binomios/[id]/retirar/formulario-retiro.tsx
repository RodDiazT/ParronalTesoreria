"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  DollarSign,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CapturaRespaldo, ArchivoSeleccionado } from "@/components/app/captura-respaldo";
import { formatearMonto } from "@/lib/presentacion/formato";
import { retirarAction } from "@/dominio/inscripciones/binomios/retiros";
import { obtenerFechaHoyChile } from "@/dominio/movimientos/reglas";

interface FormularioRetiroProps {
  binomio: any;
  hayPagosPorValidar: boolean;
}

export function FormularioRetiro({
  binomio,
  hayPagosPorValidar,
}: FormularioRetiroProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filtrar ítems activos (no anulados y no retirados)
  const itemsDisponibles: any[] = [
    ...binomio.inscripciones
      .filter((i: any) => !i.anulado && !i.retirado)
      .map((i: any) => ({
        id: i.id,
        tipo: "inscripcion" as const,
        nombre: i.prueba.nombre,
        monto: i.calculo?.monto ?? i.montoClp,
        pagado: i.calculo?.pagado ?? 0,
        saldo: i.calculo?.saldo ?? i.montoClp,
      })),
    ...binomio.cargos
      .filter((c: any) => !c.anulado && !c.retirado)
      .map((c: any) => ({
        id: c.id,
        tipo: "cargo" as const,
        nombre: c.concepto.nombre,
        monto: c.calculo?.monto ?? c.montoTotalClp,
        pagado: c.calculo?.pagado ?? 0,
        saldo: c.calculo?.saldo ?? c.montoTotalClp,
      })),
  ];

  // Selección de ítems
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const it of itemsDisponibles) {
      init[it.id] = true; // Por defecto todos seleccionados
    }
    return init;
  });

  const [motivo, setMotivo] = useState("");

  // Destino de fondos pagados
  const [tipoDestino, setTipoDestino] = useState<"retencion" | "devolucion">("retencion");

  // Calcular total pagado de los ítems seleccionados
  const totalPagadoSeleccionado = itemsDisponibles
    .filter((it) => seleccionados[it.id])
    .reduce((a, b) => a + b.pagado, 0);

  const [montoDevolucion, setMontoDevolucion] = useState<number>(totalPagadoSeleccionado);
  const [fechaDevolucion, setFechaDevolucion] = useState(obtenerFechaHoyChile());
  const [medioPagoDev, setMedioPagoDev] = useState<"transferencia" | "efectivo">("transferencia");
  const [observacionDev, setObservacionDev] = useState("");
  const [sinRespaldoDev, setSinRespaldoDev] = useState(false);
  const [archivosDev, setArchivosDev] = useState<ArchivoSeleccionado[]>([]);

  // Idempotencia
  const [claveCliente] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `ret-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  const toggleSeleccion = (id: string, checked: boolean) => {
    setSeleccionados((prev) => ({ ...prev, [id]: checked }));
  };

  const handleSeleccionarTodos = () => {
    const nuevo: Record<string, boolean> = {};
    for (const it of itemsDisponibles) {
      nuevo[it.id] = true;
    }
    setSeleccionados(nuevo);
  };

  const handleDeseleccionarTodos = () => {
    setSeleccionados({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (hayPagosPorValidar) {
      toast.error("Hay pagos por validar. Debes validarlos o anularlos primero.");
      return;
    }

    const itemsARetirar = itemsDisponibles
      .filter((it) => seleccionados[it.id])
      .map((it) => ({ id: it.id, tipo: it.tipo }));

    if (itemsARetirar.length === 0) {
      toast.error("Debes seleccionar al menos un ítem a retirar.");
      return;
    }

    if (motivo.trim().length < 10) {
      toast.error("El motivo del retiro debe tener al menos 10 caracteres.");
      return;
    }

    let devolucionData: any = undefined;
    if (tipoDestino === "devolucion" && totalPagadoSeleccionado > 0) {
      if (montoDevolucion <= 0 || montoDevolucion > totalPagadoSeleccionado) {
        toast.error("El monto de devolución no es válido.");
        return;
      }
      if (archivosDev.length === 0 && !sinRespaldoDev) {
        toast.error("Debes adjuntar comprobante de egreso o marcar 'Sin respaldo'.");
        return;
      }
      devolucionData = {
        montoClp: montoDevolucion,
        fecha: fechaDevolucion,
        medioPago: medioPagoDev,
        observacion: observacionDev.trim() || undefined,
        sinRespaldo: sinRespaldoDev,
        claveCliente,
      };
    }

    const payload = {
      binomioId: binomio.id,
      items: itemsARetirar,
      motivo: motivo.trim(),
      devolucion: devolucionData,
    };

    const formData = new FormData();
    formData.append("datos", JSON.stringify(payload));
    for (const a of archivosDev) {
      formData.append("archivos", a.file);
    }

    startTransition(async () => {
      try {
        const res = await retirarAction(formData);
        if (res.exito) {
          toast.success("Retiro procesado con éxito.");
          router.push(`/inscripciones/binomios/${binomio.id}`);
          router.refresh();
        } else {
          toast.error(res.error || "No se pudo procesar el retiro.");
        }
      } catch (err: any) {
        toast.error(err.message || "Error al procesar el retiro.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Alerta de bloqueo si hay pagos por validar */}
      {hayPagosPorValidar && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span>Retiro bloqueado: pagos en revisión</span>
          </div>
          <p className="text-xs">
            Este binomio tiene al menos un pago en estado <strong>por validar</strong> u{" "}
            <strong>observado</strong>. Por política de seguridad, debes validar o anular dicho pago
            en la bandeja de validación antes de procesar el retiro.
          </p>
        </div>
      )}

      {/* 1. Selección de ítems */}
      <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-texto">Pruebas y Cargos a Retirar</h2>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={handleSeleccionarTodos}
              className="text-marca hover:underline"
            >
              Todos
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleDeseleccionarTodos}
              className="text-texto-suave hover:underline"
            >
              Ninguno
            </button>
          </div>
        </div>

        {itemsDisponibles.length === 0 ? (
          <p className="text-xs text-texto-suave">
            No hay pruebas ni cargos activos para retirar en este binomio.
          </p>
        ) : (
          <div className="space-y-2">
            {itemsDisponibles.map((it) => {
              const checked = Boolean(seleccionados[it.id]);
              return (
                <div
                  key={it.id}
                  onClick={() => toggleSeleccion(it.id, !checked)}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    checked
                      ? "border-red-300 bg-red-50/50"
                      : "border-borde bg-fondo opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => toggleSeleccion(it.id, Boolean(c))}
                    />
                    <div>
                      <span className="font-semibold text-texto">{it.nombre}</span>
                      <div className="text-texto-suave flex gap-2">
                        <span>Total: {formatearMonto(it.monto)}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">
                          Pagado: {formatearMonto(it.pagado)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {it.pagado > 0 && (
                    <span className="font-bold text-emerald-600">
                      {formatearMonto(it.pagado)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Motivo del Retiro */}
      <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-texto">Motivo del Retiro *</h2>
        <div>
          <Input
            placeholder="Ej: Caballo lesionado en entrenamiento previo al concurso..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <span className="text-[11px] text-texto-suave">
            {motivo.length}/10 caracteres mínimos requeridos
          </span>
        </div>
      </div>

      {/* 3. Gestión del Dinero Pagado */}
      {totalPagadoSeleccionado > 0 && (
        <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-texto">Fondos Pagados por Retirar</h2>
            <span className="text-sm font-bold text-emerald-600">
              {formatearMonto(totalPagadoSeleccionado)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              size="sm"
              variant={tipoDestino === "retencion" ? "default" : "outline"}
              onClick={() => setTipoDestino("retencion")}
            >
              Retención en Caja
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tipoDestino === "devolucion" ? "default" : "outline"}
              onClick={() => {
                setTipoDestino("devolucion");
                setMontoDevolucion(totalPagadoSeleccionado);
              }}
            >
              Devolución en Dinero
            </Button>
          </div>

          {tipoDestino === "retencion" ? (
            <p className="text-xs text-texto-suave bg-fondo p-3 rounded-lg border border-borde">
              El total de <strong>{formatearMonto(totalPagadoSeleccionado)}</strong> permanecerá
              retenido en la tesorería del club organizador. Si en el futuro se decide restituir
              estos fondos, podrás registrar una devolución posterior desde la pestaña Retiros.
            </p>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Monto a devolver (CLP)</Label>
                  <Input
                    type="number"
                    min="1"
                    max={totalPagadoSeleccionado}
                    value={montoDevolucion}
                    onChange={(e) => setMontoDevolucion(Number(e.target.value))}
                  />
                  {montoDevolucion < totalPagadoSeleccionado && (
                    <span className="text-[11px] text-amber-700">
                      Retenido: {formatearMonto(totalPagadoSeleccionado - montoDevolucion)}
                    </span>
                  )}
                </div>

                <div>
                  <Label>Medio de reintegro</Label>
                  <select
                    value={medioPagoDev}
                    onChange={(e) => setMedioPagoDev(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
                  >
                    <option value="transferencia">Transferencia bancaria</option>
                    <option value="efectivo">Efectivo</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Fecha de reintegro</Label>
                <Input
                  type="date"
                  value={fechaDevolucion}
                  onChange={(e) => setFechaDevolucion(e.target.value)}
                />
              </div>

              <div>
                <Label>Observación adicional (opcional)</Label>
                <Input
                  placeholder="Detalles del reintegro..."
                  value={observacionDev}
                  onChange={(e) => setObservacionDev(e.target.value)}
                />
              </div>

              {/* Comprobante de egreso */}
              <div className="pt-2 border-t border-borde space-y-3">
                <Label className="text-sm font-semibold text-texto">
                  Comprobante de Devolución *
                </Label>
                {!sinRespaldoDev && (
                  <CapturaRespaldo
                    archivos={archivosDev}
                    onChange={setArchivosDev}
                    maxArchivos={2}
                    deshabilitado={isPending}
                  />
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sin-respaldo-dev"
                    checked={sinRespaldoDev}
                    onCheckedChange={(c) => setSinRespaldoDev(Boolean(c))}
                    disabled={isPending}
                  />
                  <Label
                    htmlFor="sin-respaldo-dev"
                    className="text-xs font-medium text-texto cursor-pointer"
                  >
                    Reintegro en efectivo sin comprobante digital
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón de Enviar */}
      <Button
        type="submit"
        variant="destructive"
        className="w-full h-11 text-base font-semibold"
        disabled={
          isPending ||
          hayPagosPorValidar ||
          motivo.trim().length < 10 ||
          Object.values(seleccionados).filter(Boolean).length === 0
        }
      >
        {isPending ? "Procesando Retiro..." : "Confirmar y Ejecutar Retiro"}
      </Button>
    </form>
  );
}
