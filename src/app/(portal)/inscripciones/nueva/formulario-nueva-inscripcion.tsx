"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, AlertTriangle, CheckCircle2, DollarSign, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectorJinete } from "@/components/app/selector-jinete";
import { SelectorCaballo } from "@/components/app/selector-caballo";
import { SelectorClub } from "@/components/app/selector-club";
import { AlertasJinete } from "@/components/app/alertas-jinete";
import { AlertaJinete } from "@/dominio/inscripciones/participantes/reglas";
import { formatearMonto } from "@/lib/presentacion/formato";
import { avisoEdadPrueba } from "@/dominio/inscripciones/binomios/reglas";
import { inscribir } from "@/dominio/inscripciones/binomios/acciones";

interface JineteOpcion {
  id: string;
  nombre: string;
  clubId: string;
  clubNombre: string;
  fechaNacimiento: string | Date | null;
  contacto: string | null;
  rut: string | null;
  alertas?: AlertaJinete[];
}

interface CaballoOpcion {
  id: string;
  nombre: string;
  clubId: string;
}

interface ClubOpcion {
  id: string;
  nombre: string;
}

interface PruebaOpcion {
  id: string;
  nombre: string;
  tarifaClp: number;
  edadMinima: number | null;
  edadMaxima: number | null;
}

interface ConceptoCuotaOpcion {
  id: string;
  nombre: string;
  tarifaClp: number;
}

interface FormularioNuevaInscripcionProps {
  jinetes: JineteOpcion[];
  caballos: CaballoOpcion[];
  clubes: ClubOpcion[];
  pruebas: PruebaOpcion[];
  cuotasBinomio: ConceptoCuotaOpcion[];
  evento: { fechaReferenciaEdad?: Date | string | null; fechaInicio?: Date | string };
  preseleccionJineteId?: string;
  preseleccionCaballoId?: string;
}

export function FormularioNuevaInscripcion({
  jinetes,
  caballos,
  clubes,
  pruebas,
  cuotasBinomio,
  evento,
  preseleccionJineteId,
  preseleccionCaballoId,
}: FormularioNuevaInscripcionProps) {
  const router = useRouter();
  const baseKey = useId();

  const [jineteId, setJineteId] = useState(preseleccionJineteId || "");
  const [caballoId, setCaballoId] = useState(preseleccionCaballoId || "");
  const [clubId, setClubId] = useState("");

  // Pruebas seleccionadas: { [pruebaId]: { seleccionada: boolean, montoClp?: number, motivoAjuste?: string } }
  const [pruebasSeleccionadas, setPruebasSeleccionadas] = useState<
    Record<string, { seleccionada: boolean; montoAjustado?: string; motivoAjuste?: string }>
  >({});

  const [guardando, setGuardando] = useState(false);
  const [resultadoExitoso, setResultadoExitoso] = useState<{
    binomioId: string;
    total: number;
  } | null>(null);

  const jineteSeleccionado = jinetes.find((j) => j.id === jineteId);

  // Al seleccionar jinete, prellenar club si no se ha elegido otro
  const handleSeleccionarJinete = (id: string) => {
    setJineteId(id);
    const j = jinetes.find((item) => item.id === id);
    if (j && !clubId) {
      setClubId(j.clubId);
    }
  };

  const handleTogglePrueba = (p: PruebaOpcion, checked: boolean) => {
    setPruebasSeleccionadas((prev) => ({
      ...prev,
      [p.id]: {
        seleccionada: checked,
        montoAjustado: prev[p.id]?.montoAjustado,
        motivoAjuste: prev[p.id]?.motivoAjuste,
      },
    }));
  };

  const handleAjusteMonto = (pruebaId: string, valor: string) => {
    setPruebasSeleccionadas((prev) => ({
      ...prev,
      [pruebaId]: {
        ...prev[pruebaId],
        seleccionada: true,
        montoAjustado: valor,
      },
    }));
  };

  const handleAjusteMotivo = (pruebaId: string, motivo: string) => {
    setPruebasSeleccionadas((prev) => ({
      ...prev,
      [pruebaId]: {
        ...prev[pruebaId],
        seleccionada: true,
        motivoAjuste: motivo,
      },
    }));
  };

  // Cálculo de totales
  const pruebasElegidas = pruebas.filter((p) => pruebasSeleccionadas[p.id]?.seleccionada);
  const subtotalPruebas = pruebasElegidas.reduce((acc, p) => {
    const aj = pruebasSeleccionadas[p.id]?.montoAjustado;
    if (aj !== undefined && aj.trim() !== "") {
      const num = parseInt(aj.replace(/\D/g, ""), 10);
      return acc + (isNaN(num) ? 0 : num);
    }
    return acc + p.tarifaClp;
  }, 0);

  const totalCuotas = cuotasBinomio.reduce((acc, c) => acc + c.tarifaClp, 0);
  const totalGeneral = subtotalPruebas + (pruebasElegidas.length > 0 ? totalCuotas : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jineteId) {
      toast.error("Debes seleccionar un jinete.");
      return;
    }
    if (!caballoId) {
      toast.error("Debes seleccionar un caballo.");
      return;
    }
    if (pruebasElegidas.length === 0) {
      toast.error("Debes seleccionar al menos una prueba para inscribir.");
      return;
    }

    // Validar motivos de ajuste
    const itemsEnvio = [];
    for (const p of pruebasElegidas) {
      const config = pruebasSeleccionadas[p.id];
      let montoFinal = p.tarifaClp;
      let motivo = config?.motivoAjuste?.trim();

      if (config?.montoAjustado !== undefined && config.montoAjustado.trim() !== "") {
        const num = parseInt(config.montoAjustado.replace(/\D/g, ""), 10);
        montoFinal = isNaN(num) ? p.tarifaClp : num;
      }

      if (montoFinal !== p.tarifaClp && (!motivo || motivo.length === 0)) {
        toast.error(`Debes indicar el motivo de ajuste para la prueba '${p.nombre}'.`);
        return;
      }

      itemsEnvio.push({
        pruebaId: p.id,
        montoClp: montoFinal,
        motivoAjuste: motivo || undefined,
      });
    }

    try {
      setGuardando(true);
      const claveCliente = `insc_${jineteId}_${caballoId}_${Date.now()}_${baseKey}`;

      const res = await inscribir({
        jineteId,
        caballoId,
        clubId: clubId || undefined,
        pruebas: itemsEnvio,
        claveCliente,
      });

      if (!res.exito || !("binomioId" in res)) {
        toast.error(res.error || "No se pudo registrar la inscripción.");
        return;
      }

      toast.success("¡Inscripción registrada con éxito!");
      setResultadoExitoso({
        binomioId: res.binomioId,
        total: totalGeneral,
      });
    } catch {
      toast.error("Ocurrió un error al registrar la inscripción.");
    } finally {
      setGuardando(false);
    }
  };

  if (resultadoExitoso) {
    return (
      <div className="p-6 rounded-2xl border border-borde bg-superficie text-center space-y-4 max-w-md mx-auto my-8">
        <div className="h-14 w-14 rounded-2xl bg-listo-fondo text-listo flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-texto">¡Inscripción Exitosa!</h3>
          <p className="text-xs text-texto-suave mt-1">
            El binomio fue inscrito en {pruebasElegidas.length} prueba(s).
          </p>
        </div>

        <div className="p-4 rounded-xl border border-borde bg-fondo text-sm font-semibold text-texto">
          Total a pagar: {formatearMonto(resultadoExitoso.total)}
        </div>

        <div className="space-y-2 pt-2">
          <Link
            href={`/inscripciones/pago?binomioId=${resultadoExitoso.binomioId}`}
            className="w-full"
          >
            <Button className="w-full gap-2 text-sm h-11">
              <DollarSign className="h-4 w-4" />
              <span>Registrar pago ahora</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </Link>

          <Link href={`/inscripciones/binomios/${resultadoExitoso.binomioId}`}>
            <Button variant="outline" className="w-full text-xs">
              Ver ficha del binomio
            </Button>
          </Link>

          <Link href="/inscripciones">
            <Button variant="ghost" className="w-full text-xs text-texto-suave">
              Volver al listado de inscripciones
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto pb-12">
      {/* 1. Jinete */}
      <div className="space-y-2">
        <SelectorJinete
          jineteSeleccionadoId={jineteId}
          alSeleccionar={(j) => {
            setJineteId(j.id);
            if (j.clubId && !clubId) {
              setClubId(j.clubId);
            }
          }}
          alLimpiar={() => setJineteId("")}
          label="Jinete"
          requerido
        />
        {jineteSeleccionado && jineteSeleccionado.alertas && (
          <div className="pt-1">
            <AlertasJinete alertas={jineteSeleccionado.alertas} />
          </div>
        )}
      </div>

      {/* 2. Caballo */}
      <div className="space-y-2">
        <SelectorCaballo
          caballoSeleccionadoId={caballoId}
          alSeleccionar={(c) => setCaballoId(c.id)}
          alLimpiar={() => setCaballoId("")}
          label="Caballo"
          requerido
        />
      </div>

      {/* 3. Club del Binomio */}
      <div className="space-y-2">
        <SelectorClub
          clubSeleccionadoId={clubId}
          alSeleccionar={(c) => setClubId(c.id)}
          alLimpiar={() => setClubId("")}
          label="Club que representa el binomio (para este evento)"
        />
      </div>

      {/* 4. Pruebas */}
      <div className="space-y-3 pt-2 border-t border-borde">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-texto">Pruebas del concurso</h3>
          <span className="text-xs text-texto-suave">
            {pruebasElegidas.length} seleccionada(s)
          </span>
        </div>

        {pruebas.length === 0 ? (
          <div className="p-4 rounded-xl border border-borde bg-superficie/30 text-xs text-texto-suave text-center">
            No hay pruebas activas configuradas para este evento.
          </div>
        ) : (
          <div className="space-y-2.5">
            {pruebas.map((p) => {
              const config = pruebasSeleccionadas[p.id];
              const marcada = Boolean(config?.seleccionada);
              const avisoEdad = jineteSeleccionado
                ? avisoEdadPrueba(jineteSeleccionado, p, evento)
                : null;

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    marcada
                      ? "border-acento bg-superficie shadow-sm"
                      : "border-borde bg-superficie/40 hover:bg-superficie/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox
                        id={`prueba_${p.id}`}
                        checked={marcada}
                        onCheckedChange={(checked) => handleTogglePrueba(p, Boolean(checked))}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <label
                          htmlFor={`prueba_${p.id}`}
                          className="text-sm font-semibold text-texto block cursor-pointer"
                        >
                          {p.nombre}
                        </label>
                        <span className="text-xs font-medium text-texto-suave">
                          Tarifa: {formatearMonto(p.tarifaClp)}
                        </span>

                        {/* Avisos de edad no bloqueantes */}
                        {avisoEdad === "no_cumple_edad" && (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-atencion-texto bg-atencion-fondo px-2 py-0.5 rounded-md w-fit">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>No cumple límite de edad ({p.edadMinima ?? "sin mín."} a {p.edadMaxima ?? "sin máx."} años)</span>
                          </div>
                        )}
                        {avisoEdad === "edad_sin_dato" && (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-texto-suave bg-borde px-2 py-0.5 rounded-md w-fit">
                            <span>Edad sin dato en jinete</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sección de ajuste plegable si está marcada */}
                  {marcada && (
                    <div className="mt-3 pt-3 border-t border-borde/50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <Label htmlFor={`monto_${p.id}`} className="text-[11px] text-texto-suave">
                          Monto a cobrar ($)
                        </Label>
                        <Input
                          id={`monto_${p.id}`}
                          type="text"
                          inputMode="numeric"
                          placeholder={p.tarifaClp.toString()}
                          value={config?.montoAjustado ?? ""}
                          onChange={(e) => handleAjusteMonto(p.id, e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`motivo_${p.id}`} className="text-[11px] text-texto-suave">
                          Motivo si cambia la tarifa
                        </Label>
                        <Input
                          id={`motivo_${p.id}`}
                          type="text"
                          placeholder="Ej: Beca del club, Descuento"
                          value={config?.motivoAjuste ?? ""}
                          onChange={(e) => handleAjusteMotivo(p.id, e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Cuota automática por binomio */}
      {cuotasBinomio.length > 0 && pruebasElegidas.length > 0 && (
        <div className="p-3.5 rounded-xl border border-borde bg-superficie/60 text-xs space-y-1">
          <span className="font-semibold text-texto block">Cuota fija de participación:</span>
          {cuotasBinomio.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-texto-suave">
              <span>{c.nombre} (automática por binomio)</span>
              <span className="font-medium text-texto">{formatearMonto(c.tarifaClp)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 6. Total y Enviar */}
      <div className="p-4 rounded-2xl border border-borde bg-superficie space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-texto-suave">Total inscripción:</span>
          <span className="text-lg font-bold text-texto">{formatearMonto(totalGeneral)}</span>
        </div>

        <Button
          type="submit"
          disabled={guardando || pruebasElegidas.length === 0}
          className="w-full h-11 text-sm font-semibold"
        >
          {guardando ? "Registrando..." : "Guardar inscripción"}
        </Button>
      </div>
    </form>
  );
}
