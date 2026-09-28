"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DollarSign,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Building2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RepartoPago, ItemCobrableParaReparto } from "@/components/app/reparto-pago";
import { formatearMonto, formatearFecha } from "@/lib/presentacion/formato";
import { asignarPorAsignar } from "@/dominio/inscripciones/binomios/pagos";
import { devolverSobrante } from "@/dominio/inscripciones/binomios/retiros";
import { CapturaRespaldo, ArchivoSeleccionado } from "@/components/app/captura-respaldo";

interface AsignarVistaProps {
  movimiento: any;
  saldoDisponible: number;
  itemsCobrables: any[];
  binomios: any[];
  jinetes: any[];
  clubes: any[];
}

export function AsignarVista({
  movimiento,
  saldoDisponible,
  itemsCobrables,
  binomios,
  jinetes,
  clubes,
}: AsignarVistaProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modo: "asignar" o "devolver"
  const [modo, setModo] = useState<"asignar" | "devolver">("asignar");

  // Filtro de ítems
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "binomio" | "jinete" | "club">("todos");
  const [filtroId, setFiltroId] = useState("");

  const itemsFiltrados: ItemCobrableParaReparto[] = itemsCobrables.filter((it) => {
    if (tipoFiltro === "todos" || !filtroId) return true;
    if (tipoFiltro === "binomio") return it.binomioId === filtroId;
    if (tipoFiltro === "jinete") return it.jineteId === filtroId;
    if (tipoFiltro === "club") return it.clubId === filtroId;
    return true;
  });

  // Reparto valores
  const [repartoValores, setRepartoValores] = useState<Record<string, number>>({});
  const sumaReparto = Object.values(repartoValores).reduce((a, b) => a + b, 0);

  // Devolución sobrante form
  const [montoDevolucion, setMontoDevolucion] = useState<number>(saldoDisponible);
  const [medioPagoDev, setMedioPagoDev] = useState<"transferencia" | "efectivo">("transferencia");
  const [motivoDev, setMotivoDev] = useState("");
  const [archivosDev, setArchivosDev] = useState<ArchivoSeleccionado[]>([]);

  // Guardar asignación
  const handleConfirmarAsignacion = () => {
    if (sumaReparto <= 0) {
      toast.error("Debes asignar un monto a al menos un ítem.");
      return;
    }

    if (sumaReparto > saldoDisponible) {
      toast.error("El monto asignado supera el saldo disponible del movimiento.");
      return;
    }

    const repartoArray = Object.entries(repartoValores)
      .filter(([_, m]) => m > 0)
      .map(([id, m]) => {
        const it = itemsCobrables.find((i) => i.id === id);
        return {
          id,
          tipo: (it?.tipo || "inscripcion") as "inscripcion" | "cargo",
          montoClp: m,
        };
      });

    startTransition(async () => {
      try {
        const res = await asignarPorAsignar(
          movimiento.id,
          repartoArray,
          movimiento.version
        );
        if (res.exito) {
          toast.success("Saldo asignado con éxito.");
          router.push("/inscripciones?pestana=por-asignar");
          router.refresh();
        } else {
          toast.error(res.error || "Error al asignar saldo.");
        }
      } catch (e: any) {
        toast.error(e.message || "Error al asignar saldo.");
      }
    });
  };

  // Guardar devolución
  const handleConfirmarDevolucion = () => {
    if (montoDevolucion <= 0 || montoDevolucion > saldoDisponible) {
      toast.error("Monto de devolución no válido.");
      return;
    }

    if (motivoDev.trim().length < 10) {
      toast.error("El motivo debe tener al menos 10 caracteres.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await devolverSobrante(
          movimiento.id,
          {
            montoClp: montoDevolucion,
            medioPago: medioPagoDev,
            motivo: motivoDev.trim(),
            cuentaBancaria: undefined,
          },
          []
        );
        if (res.exito) {
          toast.success("Devolución registrada exitosamente.");
          router.push("/inscripciones?pestana=por-asignar");
          router.refresh();
        } else {
          toast.error(res.error || "Error al registrar devolución.");
        }
      } catch (e: any) {
        toast.error(e.message || "Error al registrar devolución.");
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 1. Datos del movimiento */}
      <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-texto-suave">
            Movimiento #{movimiento.id.substring(0, 8)}
          </span>
          <span className="text-xs text-texto-suave">{formatearFecha(movimiento.fecha)}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div>
            <span className="text-xs text-texto-suave">Monto Total</span>
            <p className="text-base font-bold text-texto">{formatearMonto(movimiento.montoClp)}</p>
          </div>
          <div>
            <span className="text-xs text-texto-suave">Medio de Pago</span>
            <p className="text-sm font-medium text-texto capitalize">{movimiento.medioPago}</p>
          </div>
          <div>
            <span className="text-xs text-texto-suave">Origen</span>
            <p className="text-sm font-medium text-texto truncate">
              {movimiento.nombreOrigen || "No especificado"}
            </p>
          </div>
          <div>
            <span className="text-xs text-texto-suave">Saldo por Asignar</span>
            <p className="text-base font-bold text-amber-600">
              {formatearMonto(saldoDisponible)}
            </p>
          </div>
        </div>

        {/* Pagos ya asignados */}
        {movimiento.pagos.length > 0 && (
          <div className="pt-3 border-t border-borde text-xs text-texto-suave space-y-1">
            <span className="font-semibold text-texto">Ya asignado a:</span>
            <ul className="list-disc list-inside">
              {movimiento.pagos.map((p: any) => (
                <li key={p.id}>
                  {p.inscripcion?.prueba?.nombre || p.cargo?.concepto?.nombre || "Ítem"}:{" "}
                  {formatearMonto(p.montoClp)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Selector de Acción */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={modo === "asignar" ? "default" : "outline"}
          onClick={() => setModo("asignar")}
        >
          Imputar a Ítems Pendientes
        </Button>
        <Button
          size="sm"
          variant={modo === "devolver" ? "default" : "outline"}
          onClick={() => setModo("devolver")}
        >
          Devolver Sobrante en Dinero
        </Button>
      </div>

      {modo === "asignar" ? (
        <div className="space-y-6">
          {/* Selector de filtro de ítems */}
          <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-texto">Filtrar Ítems</h2>
            <div className="grid grid-cols-4 gap-2">
              <Button
                size="sm"
                type="button"
                variant={tipoFiltro === "todos" ? "default" : "outline"}
                onClick={() => {
                  setTipoFiltro("todos");
                  setFiltroId("");
                }}
              >
                Todos
              </Button>
              <Button
                size="sm"
                type="button"
                variant={tipoFiltro === "binomio" ? "default" : "outline"}
                onClick={() => {
                  setTipoFiltro("binomio");
                  setFiltroId(binomios[0]?.id || "");
                }}
              >
                Por Binomio
              </Button>
              <Button
                size="sm"
                type="button"
                variant={tipoFiltro === "jinete" ? "default" : "outline"}
                onClick={() => {
                  setTipoFiltro("jinete");
                  setFiltroId(jinetes[0]?.id || "");
                }}
              >
                Por Jinete
              </Button>
              <Button
                size="sm"
                type="button"
                variant={tipoFiltro === "club" ? "default" : "outline"}
                onClick={() => {
                  setTipoFiltro("club");
                  setFiltroId(clubes[0]?.id || "");
                }}
              >
                Por Club
              </Button>
            </div>

            {tipoFiltro === "binomio" && (
              <select
                value={filtroId}
                onChange={(e) => setFiltroId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
              >
                {binomios.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.jinete.nombre} / {b.caballo.nombre}
                  </option>
                ))}
              </select>
            )}

            {tipoFiltro === "jinete" && (
              <select
                value={filtroId}
                onChange={(e) => setFiltroId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
              >
                {jinetes.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nombre}
                  </option>
                ))}
              </select>
            )}

            {tipoFiltro === "club" && (
              <select
                value={filtroId}
                onChange={(e) => setFiltroId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
              >
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tabla de Reparto */}
          <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
            <RepartoPago
              montoPago={saldoDisponible}
              items={itemsFiltrados}
              valores={repartoValores}
              alCambiar={setRepartoValores}
            />
          </div>

          {/* Botón de Confirmar Asignación */}
          <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-texto-suave">Total a asignar:</span>
              <span className="font-bold text-emerald-600">{formatearMonto(sumaReparto)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-texto-suave">Saldo remanente por asignar:</span>
              <span className="font-semibold text-texto">
                {formatearMonto(Math.max(0, saldoDisponible - sumaReparto))}
              </span>
            </div>

            <Button
              className="w-full bg-marca text-white hover:bg-marca/90 h-11 text-base font-semibold"
              disabled={isPending || sumaReparto <= 0 || sumaReparto > saldoDisponible}
              onClick={handleConfirmarAsignacion}
            >
              {isPending
                ? "Asignando..."
                : `Confirmar Asignación (${formatearMonto(sumaReparto)})`}
            </Button>
          </div>
        </div>
      ) : (
        /* Formulario Devolver Sobrante */
        <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-texto">Devolución en Dinero del Sobrante</h2>
          <p className="text-xs text-texto-suave">
            Esta acción creará un movimiento de gasto del sistema en la categoría &quot;Devoluciones&quot;
            por el monto reintegrado.
          </p>

          <div className="space-y-4">
            <div>
              <Label>Monto a devolver (CLP)</Label>
              <Input
                type="number"
                min="1"
                max={saldoDisponible}
                value={montoDevolucion}
                onChange={(e) => setMontoDevolucion(Number(e.target.value))}
              />
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

            <div>
              <Label>Motivo de la devolución (obligatorio, mín. 10 caracteres)</Label>
              <Input
                placeholder="Ej: Pago duplicado transferido por error..."
                value={motivoDev}
                onChange={(e) => setMotivoDev(e.target.value)}
              />
              <span className="text-[11px] text-texto-suave">
                {motivoDev.length}/10 caracteres mínimos
              </span>
            </div>

            <Button
              variant="destructive"
              className="w-full h-11 text-base font-semibold"
              disabled={
                isPending ||
                montoDevolucion <= 0 ||
                montoDevolucion > saldoDisponible ||
                motivoDev.trim().length < 10
              }
              onClick={handleConfirmarDevolucion}
            >
              {isPending
                ? "Procesando devolución..."
                : `Confirmar Devolución (${formatearMonto(montoDevolucion)})`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
