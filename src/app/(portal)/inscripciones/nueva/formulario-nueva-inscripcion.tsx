"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Plus,
  Building2,
  User,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet } from "@/components/ui/sheet";
import { SelectorJinete } from "@/components/app/selector-jinete";
import { SelectorCaballo } from "@/components/app/selector-caballo";
import { SelectorClub } from "@/components/app/selector-club";
import { AlertasJinete } from "@/components/app/alertas-jinete";
import { AlertaJinete, ParecidoCoincidencia } from "@/dominio/inscripciones/participantes/reglas";
import { formatearMonto } from "@/lib/presentacion/formato";
import { avisoEdadPrueba } from "@/dominio/inscripciones/binomios/reglas";
import { inscribir } from "@/dominio/inscripciones/binomios/acciones";
import {
  crearClub,
  crearJinete,
  crearCaballo,
} from "@/dominio/inscripciones/participantes/acciones";

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

interface FormularioNuevaInscripcionProps {
  jinetes: JineteOpcion[];
  caballos: CaballoOpcion[];
  clubes: ClubOpcion[];
  pruebas: PruebaOpcion[];
  evento: { fechaReferenciaEdad?: Date | string | null; fechaInicio?: Date | string };
  preseleccionJineteId?: string;
  preseleccionCaballoId?: string;
}

export function FormularioNuevaInscripcion({
  jinetes,
  caballos,
  clubes,
  pruebas,
  evento,
  preseleccionJineteId,
  preseleccionCaballoId,
}: FormularioNuevaInscripcionProps) {
  const router = useRouter();
  const baseKey = useId();

  const [jineteId, setJineteId] = useState(preseleccionJineteId || "");
  const [caballoId, setCaballoId] = useState(preseleccionCaballoId || "");
  const [clubId, setClubId] = useState("");

  const [listaClubes, setListaClubes] = useState<ClubOpcion[]>(clubes);
  const [listaJinetes, setListaJinetes] = useState<JineteOpcion[]>(jinetes);
  const [listaCaballos, setListaCaballos] = useState<CaballoOpcion[]>(caballos);

  // Modales in-situ
  const [modalClub, setModalClub] = useState(false);
  const [nombreClub, setNombreClub] = useState("");
  const [rutClub, setRutClub] = useState("");
  const [contactoClub, setContactoClub] = useState("");
  const [guardandoClub, setGuardandoClub] = useState(false);
  const [parecidosClub, setParecidosClub] = useState<ParecidoCoincidencia[]>([]);

  const [modalJinete, setModalJinete] = useState(false);
  const [nombreJinete, setNombreJinete] = useState("");
  const [clubIdJinete, setClubIdJinete] = useState("");
  const [rutJinete, setRutJinete] = useState("");
  const [fechaNacimientoJinete, setFechaNacimientoJinete] = useState("");
  const [contactoJinete, setContactoJinete] = useState("");
  const [guardandoJinete, setGuardandoJinete] = useState(false);
  const [parecidosJinete, setParecidosJinete] = useState<ParecidoCoincidencia[]>([]);

  const [modalCaballo, setModalCaballo] = useState(false);
  const [nombreCaballo, setNombreCaballo] = useState("");
  const [clubIdCaballo, setClubIdCaballo] = useState("");
  const [chipCaballo, setChipCaballo] = useState("");
  const [guardandoCaballo, setGuardandoCaballo] = useState(false);
  const [parecidosCaballo, setParecidosCaballo] = useState<ParecidoCoincidencia[]>([]);

  // Pruebas seleccionadas
  const [pruebasSeleccionadas, setPruebasSeleccionadas] = useState<
    Record<string, { seleccionada: boolean; montoAjustado?: string; motivoAjuste?: string }>
  >({});

  const [guardando, setGuardando] = useState(false);
  const [resultadoExitoso, setResultadoExitoso] = useState<{
    binomioId: string;
    total: number;
  } | null>(null);

  const jineteSeleccionado = listaJinetes.find((j) => j.id === jineteId);

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

  // Totales
  const pruebasElegidas = pruebas.filter((p) => pruebasSeleccionadas[p.id]?.seleccionada);
  const totalGeneral = pruebasElegidas.reduce((acc, p) => {
    const aj = pruebasSeleccionadas[p.id]?.montoAjustado;
    if (aj !== undefined && aj.trim() !== "") {
      const num = parseInt(aj.replace(/\D/g, ""), 10);
      return acc + (isNaN(num) ? 0 : num);
    }
    return acc + p.tarifaClp;
  }, 0);

  // Manejo de creación in-situ Club
  const handleCrearClub = async (confirmar = false) => {
    if (!nombreClub.trim()) {
      toast.error("El nombre del club es obligatorio.");
      return;
    }
    try {
      setGuardandoClub(true);
      const res = await crearClub({
        nombre: nombreClub.trim(),
        rut: rutClub.trim() || undefined,
        contacto: contactoClub.trim() || undefined,
        confirmarAunqueParecido: confirmar,
      });

      if (!res.exito) {
        if (res.parecidos && res.parecidos.length > 0 && !confirmar) {
          setParecidosClub(res.parecidos);
          return;
        }
        toast.error(res.error || "No se pudo crear el club.");
        return;
      }

      const nuevo = res.club!;
      toast.success(`Club «${nuevo.nombre}» creado con éxito.`);
      setListaClubes((prev) => [...prev, { id: nuevo.id, nombre: nuevo.nombre }]);
      setClubId(nuevo.id);
      setModalClub(false);
      setNombreClub("");
      setRutClub("");
      setContactoClub("");
      setParecidosClub([]);
    } catch {
      toast.error("Error al crear el club.");
    } finally {
      setGuardandoClub(false);
    }
  };

  // Manejo de creación in-situ Jinete
  const handleCrearJinete = async (confirmar = false) => {
    if (!nombreJinete.trim()) {
      toast.error("El nombre del jinete es obligatorio.");
      return;
    }
    const cId = clubIdJinete || clubId;
    if (!cId) {
      toast.error("Debes seleccionar un club para el jinete.");
      return;
    }
    try {
      setGuardandoJinete(true);
      const res = await crearJinete({
        nombre: nombreJinete.trim(),
        clubId: cId,
        rut: rutJinete.trim() || undefined,
        fechaNacimiento: fechaNacimientoJinete.trim() || undefined,
        contacto: contactoJinete.trim() || undefined,
        confirmarAunqueParecido: confirmar,
      });

      if (!res.exito) {
        if (res.parecidos && res.parecidos.length > 0 && !confirmar) {
          setParecidosJinete(res.parecidos);
          return;
        }
        toast.error(res.error || "No se pudo crear el jinete.");
        return;
      }

      const nuevo = res.jinete!;
      toast.success(`Jinete «${nuevo.nombre}» creado con éxito.`);
      const clubNombre = listaClubes.find((c) => c.id === nuevo.clubId)?.nombre || "";
      const itemJinete: JineteOpcion = {
        id: nuevo.id,
        nombre: nuevo.nombre,
        clubId: nuevo.clubId,
        clubNombre,
        fechaNacimiento: nuevo.fechaNacimiento,
        contacto: nuevo.contacto,
        rut: nuevo.rut,
      };
      setListaJinetes((prev) => [...prev, itemJinete]);
      setJineteId(nuevo.id);
      if (!clubId) {
        setClubId(nuevo.clubId);
      }
      setModalJinete(false);
      setNombreJinete("");
      setRutJinete("");
      setFechaNacimientoJinete("");
      setContactoJinete("");
      setParecidosJinete([]);
    } catch {
      toast.error("Error al crear el jinete.");
    } finally {
      setGuardandoJinete(false);
    }
  };

  // Manejo de creación in-situ Caballo
  const handleCrearCaballo = async (confirmar = false) => {
    if (!nombreCaballo.trim()) {
      toast.error("El nombre del caballo es obligatorio.");
      return;
    }
    const cId = clubIdCaballo || clubId;
    if (!cId) {
      toast.error("Debes seleccionar un club para el caballo.");
      return;
    }
    try {
      setGuardandoCaballo(true);
      const res = await crearCaballo({
        nombre: nombreCaballo.trim(),
        clubId: cId,
        confirmarAunqueParecido: confirmar,
      });

      if (!res.exito) {
        if (res.parecidos && res.parecidos.length > 0 && !confirmar) {
          setParecidosCaballo(res.parecidos);
          return;
        }
        toast.error(res.error || "No se pudo crear el caballo.");
        return;
      }

      const nuevo = res.caballo!;
      toast.success(`Caballo «${nuevo.nombre}» creado con éxito.`);
      setListaCaballos((prev) => [...prev, { id: nuevo.id, nombre: nuevo.nombre, clubId: nuevo.clubId }]);
      setCaballoId(nuevo.id);
      if (!clubId) {
        setClubId(nuevo.clubId);
      }
      setModalCaballo(false);
      setNombreCaballo("");
      setChipCaballo("");
      setParecidosCaballo([]);
    } catch {
      toast.error("Error al crear el caballo.");
    } finally {
      setGuardandoCaballo(false);
    }
  };

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
            href={`/movimientos/nuevo?tipo=ingreso&categoria=inscripciones&binomioId=${resultadoExitoso.binomioId}`}
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
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto pb-12">
        {/* 1. Jinete */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-texto">Jinete / Amazona *</Label>
            <button
              type="button"
              onClick={() => {
                setClubIdJinete(clubId);
                setModalJinete(true);
              }}
              className="text-xs text-acento font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Nuevo Jinete</span>
            </button>
          </div>
          <SelectorJinete
            jineteSeleccionadoId={jineteId}
            alSeleccionar={(j) => {
              setJineteId(j.id);
              if (j.clubId && !clubId) {
                setClubId(j.clubId);
              }
            }}
            alLimpiar={() => setJineteId("")}
            label=""
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
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-texto">Caballo *</Label>
            <button
              type="button"
              onClick={() => {
                setClubIdCaballo(clubId);
                setModalCaballo(true);
              }}
              className="text-xs text-acento font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Nuevo Caballo</span>
            </button>
          </div>
          <SelectorCaballo
            caballoSeleccionadoId={caballoId}
            alSeleccionar={(c) => {
              setCaballoId(c.id);
              if (c.clubId && !clubId) {
                setClubId(c.clubId);
              }
            }}
            alLimpiar={() => setCaballoId("")}
            label=""
            requerido
          />
        </div>

        {/* 3. Club del Binomio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-texto">
              Club que representa el binomio (para este evento)
            </Label>
            <button
              type="button"
              onClick={() => setModalClub(true)}
              className="text-xs text-acento font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Nuevo Club</span>
            </button>
          </div>
          <SelectorClub
            clubSeleccionadoId={clubId}
            alSeleccionar={(c) => setClubId(c.id)}
            alLimpiar={() => setClubId("")}
            label=""
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
                        <div>
                          <Label
                            htmlFor={`prueba_${p.id}`}
                            className="text-sm font-semibold text-texto cursor-pointer"
                          >
                            {p.nombre}
                          </Label>
                          <p className="text-xs font-bold text-acento mt-0.5">
                            {formatearMonto(p.tarifaClp)}
                          </p>

                          {avisoEdad === "no_cumple_edad" && (
                            <div className="flex items-center gap-1.5 text-xs text-problema-texto font-medium mt-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>El jinete no cumple el rango de edad sugerido</span>
                            </div>
                          )}
                          {avisoEdad === "edad_sin_dato" && (
                            <div className="flex items-center gap-1.5 text-xs text-falta-texto font-medium mt-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>Prueba con límite de edad pero jinete no tiene fecha nac.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {marcada && (
                      <div className="mt-3 pt-3 border-t border-borde/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`ajuste_${p.id}`} className="text-[11px] text-texto-suave">
                            Ajustar tarifa (CLP)
                          </Label>
                          <Input
                            id={`ajuste_${p.id}`}
                            type="number"
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

        {/* 5. Total y Enviar */}
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

      {/* Modal / Sheet Nuevo Club */}
      <Sheet
        abierta={modalClub}
        alCerrar={() => {
          setModalClub(false);
          setParecidosClub([]);
        }}
        posicion="centro"
        titulo="Crear nuevo club"
        descripcion="Registra una nueva institución o club ecuestre."
      >
        <div className="space-y-4">
          {parecidosClub.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs space-y-2">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Se encontraron clubes con nombres parecidos:
              </p>
              <ul className="list-disc pl-4 text-amber-700 dark:text-amber-400">
                {parecidosClub.map((p) => (
                  <li key={p.id}>{p.nombre}</li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleCrearClub(true)}
                disabled={guardandoClub}
                className="w-full text-xs"
              >
                Confirmar y crear de todas formas
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="clubNombreInSitu" className="text-xs font-medium text-texto">Nombre del club *</Label>
            <Input
              id="clubNombreInSitu"
              value={nombreClub}
              onChange={(e) => setNombreClub(e.target.value)}
              placeholder="Ej: Club Ecuestre La Dehesa"
              className="text-sm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="clubRutInSitu" className="text-xs font-medium text-texto">RUT (opcional)</Label>
              <Input
                id="clubRutInSitu"
                value={rutClub}
                onChange={(e) => setRutClub(e.target.value)}
                placeholder="Ej: 12345678-9"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clubContactoInSitu" className="text-xs font-medium text-texto">Contacto (opcional)</Label>
              <Input
                id="clubContactoInSitu"
                value={contactoClub}
                onChange={(e) => setContactoClub(e.target.value)}
                placeholder="Teléfono o email"
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-borde/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setModalClub(false);
                setParecidosClub([]);
              }}
              disabled={guardandoClub}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleCrearClub(false)}
              disabled={guardandoClub || !nombreClub.trim()}
              className="bg-acento hover:bg-acento/90 text-white"
            >
              {guardandoClub ? "Guardando..." : "Crear club"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Modal / Sheet Nuevo Jinete */}
      <Sheet
        abierta={modalJinete}
        alCerrar={() => {
          setModalJinete(false);
          setParecidosJinete([]);
        }}
        posicion="centro"
        titulo="Crear nuevo jinete"
        descripcion="Registra un nuevo participante en el concurso."
      >
        <div className="space-y-4">
          {parecidosJinete.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs space-y-2">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Se encontraron jinetes con nombres parecidos:
              </p>
              <ul className="list-disc pl-4 text-amber-700 dark:text-amber-400">
                {parecidosJinete.map((p) => (
                  <li key={p.id}>{p.nombre}</li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleCrearJinete(true)}
                disabled={guardandoJinete}
                className="w-full text-xs"
              >
                Confirmar y crear de todas formas
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="jineteNombreInSitu" className="text-xs font-medium text-texto">Nombre completo *</Label>
            <Input
              id="jineteNombreInSitu"
              value={nombreJinete}
              onChange={(e) => setNombreJinete(e.target.value)}
              placeholder="Ej: Sofía Valenzuela"
              className="text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jineteClubInSitu" className="text-xs font-medium text-texto">Club de pertenencia *</Label>
            <select
              id="jineteClubInSitu"
              value={clubIdJinete || clubId}
              onChange={(e) => setClubIdJinete(e.target.value)}
              className="w-full text-sm rounded-md border border-borde bg-superficie px-3 py-2 text-texto focus:outline-none focus:ring-1 focus:ring-acento"
            >
              <option value="">-- Seleccionar club --</option>
              {listaClubes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jineteRutInSitu" className="text-xs font-medium text-texto">RUT (opcional)</Label>
              <Input
                id="jineteRutInSitu"
                value={rutJinete}
                onChange={(e) => setRutJinete(e.target.value)}
                placeholder="Ej: 19876543-2"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jineteFechaInSitu" className="text-xs font-medium text-texto">Fecha de nacimiento</Label>
              <Input
                id="jineteFechaInSitu"
                type="date"
                value={fechaNacimientoJinete}
                onChange={(e) => setFechaNacimientoJinete(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jineteContactoInSitu" className="text-xs font-medium text-texto">Teléfono / WhatsApp (opcional)</Label>
            <Input
              id="jineteContactoInSitu"
              value={contactoJinete}
              onChange={(e) => setContactoJinete(e.target.value)}
              placeholder="+56 9 8765 4321"
              className="text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-borde/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setModalJinete(false);
                setParecidosJinete([]);
              }}
              disabled={guardandoJinete}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleCrearJinete(false)}
              disabled={guardandoJinete || !nombreJinete.trim() || !(clubIdJinete || clubId)}
              className="bg-acento hover:bg-acento/90 text-white"
            >
              {guardandoJinete ? "Guardando..." : "Crear jinete"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Modal / Sheet Nuevo Caballo */}
      <Sheet
        abierta={modalCaballo}
        alCerrar={() => {
          setModalCaballo(false);
          setParecidosCaballo([]);
        }}
        posicion="centro"
        titulo="Crear nuevo caballo"
        descripcion="Registra un nuevo ejemplar equino."
      >
        <div className="space-y-4">
          {parecidosCaballo.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs space-y-2">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Se encontraron caballos con nombres parecidos:
              </p>
              <ul className="list-disc pl-4 text-amber-700 dark:text-amber-400">
                {parecidosCaballo.map((p) => (
                  <li key={p.id}>{p.nombre}</li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleCrearCaballo(true)}
                disabled={guardandoCaballo}
                className="w-full text-xs"
              >
                Confirmar y crear de todas formas
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="caballoNombreInSitu" className="text-xs font-medium text-texto">Nombre del caballo *</Label>
            <Input
              id="caballoNombreInSitu"
              value={nombreCaballo}
              onChange={(e) => setNombreCaballo(e.target.value)}
              placeholder="Ej: Relámpago Negro"
              className="text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="caballoClubInSitu" className="text-xs font-medium text-texto">Club de pertenencia *</Label>
            <select
              id="caballoClubInSitu"
              value={clubIdCaballo || clubId}
              onChange={(e) => setClubIdCaballo(e.target.value)}
              className="w-full text-sm rounded-md border border-borde bg-superficie px-3 py-2 text-texto focus:outline-none focus:ring-1 focus:ring-acento"
            >
              <option value="">-- Seleccionar club --</option>
              {listaClubes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="caballoChipInSitu" className="text-xs font-medium text-texto">Microchip (opcional)</Label>
            <Input
              id="caballoChipInSitu"
              value={chipCaballo}
              onChange={(e) => setChipCaballo(e.target.value)}
              placeholder="Ej: 985141001234567"
              className="text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-borde/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setModalCaballo(false);
                setParecidosCaballo([]);
              }}
              disabled={guardandoCaballo}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleCrearCaballo(false)}
              disabled={guardandoCaballo || !nombreCaballo.trim() || !(clubIdCaballo || clubId)}
              className="bg-acento hover:bg-acento/90 text-white"
            >
              {guardandoCaballo ? "Guardando..." : "Crear caballo"}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
