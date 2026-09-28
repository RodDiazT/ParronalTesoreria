"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CapturaRespaldo, ArchivoSeleccionado } from "@/components/app/captura-respaldo";
import { registrarTraspasoAction } from "@/dominio/dashboard/acciones";
import { obtenerFechaHoyChile } from "@/dominio/movimientos/reglas";
import { toast } from "sonner";

const MEDIOS = [
  { valor: "transferencia", etiqueta: "Banco (Transferencia)" },
  { valor: "efectivo", etiqueta: "Efectivo (Caja chica / Cancha)" },
  { valor: "otro", etiqueta: "Otro medio" },
];

export function FormularioTraspaso() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [desde, setDesde] = useState<"transferencia" | "efectivo" | "otro">("transferencia");
  const [hacia, setHacia] = useState<"transferencia" | "efectivo" | "otro">("efectivo");
  const [montoTexto, setMontoTexto] = useState("");
  const [fecha, setFecha] = useState(obtenerFechaHoyChile());
  const [observacion, setObservacion] = useState("");
  const [archivos, setArchivos] = useState<ArchivoSeleccionado[]>([]);
  const [claveCliente, setClaveCliente] = useState("");

  useEffect(() => {
    setClaveCliente(crypto.randomUUID());
  }, []);

  // Si 'desde' cambia y es igual a 'hacia', ajustar 'hacia' al primer medio distinto
  const handleCambioDesde = (nuevoDesde: "transferencia" | "efectivo" | "otro") => {
    setDesde(nuevoDesde);
    if (nuevoDesde === hacia) {
      const otro = MEDIOS.find((m) => m.valor !== nuevoDesde)?.valor as any;
      setHacia(otro || "efectivo");
    }
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir dígitos
    const limpio = e.target.value.replace(/\D/g, "");
    setMontoTexto(limpio);
  };

  const montoNumero = Number(montoTexto) || 0;
  const tieneComprobante = archivos.length > 0;
  const observacionObligatoria = !tieneComprobante;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (montoNumero <= 0) {
      toast.error("El monto debe ser mayor a 0.");
      return;
    }

    if (desde === hacia) {
      toast.error("El medio de origen y destino deben ser distintos.");
      return;
    }

    if (!fecha) {
      toast.error("La fecha del traspaso es obligatoria.");
      return;
    }

    if (observacionObligatoria && (!observacion || observacion.trim().length === 0)) {
      toast.error("Si no adjuntas comprobante, la observación explicativa es obligatoria.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();

      const datos = {
        desde,
        hacia,
        montoClp: montoNumero,
        fecha,
        observacion: observacion.trim() || undefined,
        claveCliente,
      };

      formData.set("datos", JSON.stringify(datos));

      if (archivos.length > 0 && archivos[0]?.file) {
        formData.set("archivo", archivos[0].file);
      }

      const res = await registrarTraspasoAction(formData);

      if (res.exito) {
        toast.success(
          res.nuevo
            ? "Traspaso registrado exitosamente."
            : "Traspaso ya existente recuperado exitosamente."
        );
        router.push("/traspasos");
        router.refresh();
      } else {
        toast.error(res.error || "Error al registrar el traspaso.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-5 shadow-xs">
        {/* Cabecera / Explicación */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-fondo/80 border border-borde text-xs text-texto-suave">
          <Info className="h-4 w-4 text-acento shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Un traspaso mueve dinero entre Banco y Efectivo (ej: retiro para caja chica o depósito de recaudación).{" "}
            <strong className="text-texto font-medium">No afecta el saldo total de caja</strong> ni los ingresos o gastos.
          </p>
        </div>

        {/* Origen y Destino */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-texto">
              Desde (Origen) <span className="text-problema">*</span>
            </Label>
            <select
              value={desde}
              onChange={(e) => handleCambioDesde(e.target.value as any)}
              disabled={isPending}
              className="w-full h-11 rounded-xl border border-borde bg-fondo px-3 text-sm text-texto focus:border-acento focus:outline-none"
            >
              {MEDIOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-texto">
              Hacia (Destino) <span className="text-problema">*</span>
            </Label>
            <select
              value={hacia}
              onChange={(e) => setHacia(e.target.value as any)}
              disabled={isPending}
              className="w-full h-11 rounded-xl border border-borde bg-fondo px-3 text-sm text-texto focus:border-acento focus:outline-none"
            >
              {MEDIOS.map((m) => (
                <option key={m.valor} value={m.valor} disabled={m.valor === desde}>
                  {m.etiqueta} {m.valor === desde ? "(Mismo medio)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Monto con teclado numérico */}
        <div className="space-y-1.5">
          <Label htmlFor="monto" className="text-xs font-semibold text-texto">
            Monto en pesos (CLP) <span className="text-problema">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-suave font-semibold text-base select-none">
              $
            </span>
            <Input
              id="monto"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={montoTexto ? Number(montoTexto).toLocaleString("es-CL") : ""}
              onChange={handleMontoChange}
              placeholder="0"
              disabled={isPending}
              className="pl-8 text-lg font-bold tabular-nums h-12"
              autoFocus
            />
          </div>
        </div>

        {/* Fecha */}
        <div className="space-y-1.5">
          <Label htmlFor="fecha" className="text-xs font-semibold text-texto">
            Fecha de transferencia o giro <span className="text-problema">*</span>
          </Label>
          <Input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            disabled={isPending}
            className="h-11"
          />
        </div>

        {/* Comprobante */}
        <div className="space-y-2 pt-2 border-t border-borde/40">
          <Label className="text-xs font-semibold text-texto flex items-center justify-between">
            <span>Comprobante de respaldo (Foto / PDF)</span>
            <span className="text-[11px] font-normal text-texto-suave">
              {tieneComprobante ? "Adjunto" : "Opcional si justificas"}
            </span>
          </Label>
          <CapturaRespaldo
            archivos={archivos}
            onChange={setArchivos}
            maxArchivos={1}
            deshabilitado={isPending}
          />
        </div>

        {/* Observación */}
        <div className="space-y-1.5">
          <Label htmlFor="observacion" className="text-xs font-semibold text-texto flex items-center justify-between">
            <span>
              Observación {observacionObligatoria && <span className="text-problema">*</span>}
            </span>
            {observacionObligatoria && (
              <span className="text-[11px] font-normal text-problema">
                Obligatoria sin comprobante
              </span>
            )}
          </Label>
          <textarea
            id="observacion"
            rows={3}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder={
              observacionObligatoria
                ? "Explica el motivo del traspaso (ej: retiro de cajero para caja chica)..."
                : "Detalles adicionales (opcional)..."
            }
            disabled={isPending}
            className="w-full rounded-xl border border-borde bg-fondo p-3 text-sm text-texto focus:border-acento focus:outline-none"
          />
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
          className="flex-1 h-12 rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending || montoNumero <= 0 || (observacionObligatoria && !observacion.trim())}
          className="flex-1 h-12 rounded-xl bg-acento text-acento-texto font-semibold hover:opacity-95"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Guardar traspaso
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
