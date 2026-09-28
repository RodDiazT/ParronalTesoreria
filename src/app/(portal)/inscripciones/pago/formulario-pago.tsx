"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Calendar,
  CreditCard,
  User,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CapturaRespaldo, ArchivoSeleccionado } from "@/components/app/captura-respaldo";
import { RepartoPago, ItemCobrableParaReparto } from "@/components/app/reparto-pago";
import { formatearMonto } from "@/lib/presentacion/formato";
import { registrarPagoInscripcionesAction } from "@/dominio/inscripciones/binomios/pagos";
import { obtenerFechaHoyChile } from "@/dominio/movimientos/reglas";

interface FormularioPagoInscripcionProps {
  itemsCobrables: any[];
  binomios: any[];
  jinetes: any[];
  clubes: any[];
  preseleccion: {
    binomioId?: string;
    jineteId?: string;
    clubId?: string;
  };
}

export function FormularioPagoInscripcion({
  itemsCobrables,
  binomios,
  jinetes,
  clubes,
  preseleccion,
}: FormularioPagoInscripcionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Tipo de filtro
  const tipoInicial = preseleccion.binomioId
    ? "binomio"
    : preseleccion.jineteId
    ? "jinete"
    : preseleccion.clubId
    ? "club"
    : "binomio";

  const [tipoFiltro, setTipoFiltro] = useState<"binomio" | "jinete" | "club" | "todos">(
    tipoInicial
  );
  const [filtroId, setFiltroId] = useState(
    preseleccion.binomioId || preseleccion.jineteId || preseleccion.clubId || ""
  );

  // Filtrar ítems cobrables según sujeto
  const itemsFiltrados: ItemCobrableParaReparto[] = itemsCobrables.filter((it) => {
    if (tipoFiltro === "todos" || !filtroId) return true;
    if (tipoFiltro === "binomio") return it.binomioId === filtroId;
    if (tipoFiltro === "jinete") return it.jineteId === filtroId;
    if (tipoFiltro === "club") return it.clubId === filtroId;
    return true;
  });

  // Saldo total de los ítems filtrados para sugerir monto
  const saldoTotalFiltrado = itemsFiltrados.reduce((a, b) => a + b.saldo, 0);

  // Datos del pago
  const [montoPago, setMontoPago] = useState<number>(saldoTotalFiltrado);
  const [fecha, setFecha] = useState<string>(obtenerFechaHoyChile());
  const [medioPago, setMedioPago] = useState<"transferencia" | "efectivo" | "tarjeta" | "cheque">("transferencia");
  const [nombreOrigen, setNombreOrigen] = useState("");
  const [observacion, setObservacion] = useState("");
  const [sinRespaldo, setSinRespaldo] = useState(false);
  const [archivos, setArchivos] = useState<ArchivoSeleccionado[]>([]);

  // Reparto { [itemId]: montoAsignado }
  const [repartoValores, setRepartoValores] = useState<Record<string, number>>({});

  // Idempotencia
  const [claveCliente] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `pago-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  const sumaReparto = Object.values(repartoValores).reduce((a, b) => a + b, 0);
  const porAsignarCalculado = Math.max(0, montoPago - sumaReparto);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (montoPago <= 0) {
      toast.error("El monto del pago debe ser mayor a 0.");
      return;
    }

    if (sumaReparto > montoPago) {
      toast.error("El monto asignado supera el total del pago recibido.");
      return;
    }

    if (archivos.length === 0 && !sinRespaldo) {
      toast.error("Debes adjuntar comprobante o marcar 'Sin respaldo'.");
      return;
    }

    if (sinRespaldo && observacion.trim().length < 5) {
      toast.error("Al no tener respaldo, debes ingresar una observación explicativa.");
      return;
    }

    // Armar lista de reparto
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

    const payload = {
      montoClp: montoPago,
      fecha,
      medioPago,
      nombreOrigen: nombreOrigen.trim() || null,
      observacion: observacion.trim() || null,
      sinRespaldo,
      claveCliente,
      reparto: repartoArray,
    };

    const formData = new FormData();
    formData.append("datos", JSON.stringify(payload));
    for (const a of archivos) {
      formData.append("archivos", a.file);
    }

    startTransition(async () => {
      try {
        const res = await registrarPagoInscripcionesAction(formData);
        if (res.exito) {
          toast.success("Pago de inscripciones registrado exitosamente.");
          router.push("/inscripciones");
          router.refresh();
        } else {
          toast.error(res.error || "No se pudo registrar el pago.");
        }
      } catch (err: any) {
        toast.error(err.message || "Error al procesar el pago.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      {/* 1. Selector de Sujeto / Filtro */}
      <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-texto">Sujeto a Cobrar</h2>
        <div className="grid grid-cols-4 gap-2">
          <Button
            type="button"
            size="sm"
            variant={tipoFiltro === "binomio" ? "default" : "outline"}
            onClick={() => {
              setTipoFiltro("binomio");
              setFiltroId(binomios[0]?.id || "");
              setRepartoValores({});
            }}
          >
            Binomio
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tipoFiltro === "jinete" ? "default" : "outline"}
            onClick={() => {
              setTipoFiltro("jinete");
              setFiltroId(jinetes[0]?.id || "");
              setRepartoValores({});
            }}
          >
            Jinete
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tipoFiltro === "club" ? "default" : "outline"}
            onClick={() => {
              setTipoFiltro("club");
              setFiltroId(clubes[0]?.id || "");
              setRepartoValores({});
            }}
          >
            Club
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tipoFiltro === "todos" ? "default" : "outline"}
            onClick={() => {
              setTipoFiltro("todos");
              setFiltroId("");
              setRepartoValores({});
            }}
          >
            Todos
          </Button>
        </div>

        {tipoFiltro === "binomio" && (
          <div>
            <Label>Seleccionar Binomio</Label>
            <select
              value={filtroId}
              onChange={(e) => {
                setFiltroId(e.target.value);
                setRepartoValores({});
              }}
              className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
            >
              <option value="">Selecciona un binomio...</option>
              {binomios.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.jinete.nombre} / {b.caballo.nombre} ({b.club.nombre})
                </option>
              ))}
            </select>
          </div>
        )}

        {tipoFiltro === "jinete" && (
          <div>
            <Label>Seleccionar Jinete</Label>
            <select
              value={filtroId}
              onChange={(e) => {
                setFiltroId(e.target.value);
                setRepartoValores({});
              }}
              className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
            >
              <option value="">Selecciona un jinete...</option>
              {jinetes.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {tipoFiltro === "club" && (
          <div>
            <Label>Seleccionar Club</Label>
            <select
              value={filtroId}
              onChange={(e) => {
                setFiltroId(e.target.value);
                setRepartoValores({});
              }}
              className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
            >
              <option value="">Selecciona un club...</option>
              {clubes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Datos del Pago */}
      <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-texto">Datos del Pago Recibido</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Monto recibido (CLP) *</Label>
            <Input
              type="number"
              min="1"
              value={montoPago || ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMontoPago(val);
              }}
              placeholder="Ej: 50000"
            />
            {saldoTotalFiltrado > 0 && (
              <button
                type="button"
                onClick={() => setMontoPago(saldoTotalFiltrado)}
                className="text-xs text-marca hover:underline mt-1"
              >
                Pagar total pendiente ({formatearMonto(saldoTotalFiltrado)})
              </button>
            )}
          </div>

          <div>
            <Label>Fecha del pago *</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div>
            <Label>Medio de pago *</Label>
            <select
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value as any)}
              className="w-full h-10 px-3 rounded-md border border-borde bg-fondo text-sm text-texto"
            >
              <option value="transferencia">Transferencia bancaria</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta (Débito/Crédito)</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {medioPago === "transferencia" && (
            <div>
              <Label>Nombre / Titular de la cuenta origen</Label>
              <Input
                placeholder="Ej: Juan Pérez"
                value={nombreOrigen}
                onChange={(e) => setNombreOrigen(e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <Label>Observación (opcional)</Label>
          <Input
            placeholder="Detalles sobre el pago..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </div>

        {/* Respaldo / Comprobante */}
        <div className="pt-2 border-t border-borde space-y-3">
          <Label className="text-sm font-semibold text-texto">
            Comprobante de Pago *
          </Label>
          {!sinRespaldo && (
            <CapturaRespaldo
              archivos={archivos}
              onChange={setArchivos}
              maxArchivos={3}
              deshabilitado={isPending}
            />
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sin-respaldo-pago"
              checked={sinRespaldo}
              onCheckedChange={(c) => setSinRespaldo(Boolean(c))}
              disabled={isPending}
            />
            <Label
              htmlFor="sin-respaldo-pago"
              className="text-xs font-medium text-texto cursor-pointer"
            >
              No dispongo de comprobante digital (requiere observación obligatoria)
            </Label>
          </div>
        </div>
      </div>

      {/* 3. Tabla de Reparto */}
      <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-texto">Imputación a Ítems (Reparto)</h2>
          <span className="text-xs text-texto-suave">
            {itemsFiltrados.length} ítems pendientes
          </span>
        </div>

        {itemsFiltrados.length === 0 ? (
          <p className="text-xs text-texto-suave p-4 text-center">
            No hay ítems con saldo pendiente para el sujeto seleccionado.
            Si el pago no se asigna a ningún ítem ahora, quedará 100% como saldo &quot;Por asignar&quot;.
          </p>
        ) : (
          <RepartoPago
            montoPago={montoPago}
            items={itemsFiltrados}
            valores={repartoValores}
            alCambiar={setRepartoValores}
          />
        )}
      </div>

      {/* 4. Resumen y Botón de Envío */}
      <div className="rounded-xl border border-borde bg-fondo-tarjeta p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-texto-suave">Total pago recibido:</span>
          <span className="font-bold text-texto">{formatearMonto(montoPago)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-texto-suave">Total asignado a ítems:</span>
          <span className="font-semibold text-emerald-600">{formatearMonto(sumaReparto)}</span>
        </div>
        {porAsignarCalculado > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-amber-600 font-medium">Quedará por asignar en el movimiento:</span>
            <span className="font-bold text-amber-600">{formatearMonto(porAsignarCalculado)}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-marca text-white hover:bg-marca/90 h-11 text-base font-semibold"
          disabled={isPending || montoPago <= 0 || sumaReparto > montoPago}
        >
          {isPending ? "Registrando Pago..." : `Confirmar y Registrar Pago (${formatearMonto(montoPago)})`}
        </Button>
      </div>
    </form>
  );
}
