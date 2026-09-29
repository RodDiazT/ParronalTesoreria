"use client";

import { useState, useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Calendar,
  CreditCard,
  User,
  FileText,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CapturaRespaldo, ArchivoSeleccionado } from "@/components/app/captura-respaldo";
import { SelectorCategoria, OpcionCategoria } from "@/components/app/selector-categoria";
import { SelectorContraparte } from "@/components/app/selector-contraparte";
import { SelectorCaballo } from "@/components/app/selector-caballo";
import { SelectorJinete } from "@/components/app/selector-jinete";
import { SelectorClub } from "@/components/app/selector-club";
import { RepartoPago, ItemCobrableParaReparto } from "@/components/app/reparto-pago";
import { formatearMonto } from "@/lib/presentacion/formato";
import {
  registrarMovimientoAction,
  buscarDuplicados,
} from "@/dominio/movimientos/acciones";
import { obtenerFechaHoyChile, requiereContraparte } from "@/dominio/movimientos/reglas";

interface FormularioMovimientoProps {
  tipoInicial: "gasto" | "ingreso";
  categoriaInicialClave?: string;
  preseleccion?: {
    binomioId?: string;
    jineteId?: string;
    clubId?: string;
  };
  itemsCobrables?: ItemCobrableParaReparto[];
  binomios?: any[];
  jinetes?: any[];
  clubes?: any[];
  usuarioActual: {
    id: string;
    nombre: string;
    rol: string;
  };
  miembrosComision: {
    id: string;
    nombre: string;
  }[];
}

export function FormularioMovimiento({
  tipoInicial,
  categoriaInicialClave,
  preseleccion,
  itemsCobrables = [],
  binomios = [],
  jinetes = [],
  clubes = [],
  usuarioActual,
  miembrosComision,
}: FormularioMovimientoProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Clave de idempotencia única por carga del formulario
  const [claveCliente] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `cli-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  // Estados principales del formulario
  const [tipo, setTipo] = useState<"gasto" | "ingreso">(tipoInicial);
  const [naturaleza, setNaturaleza] = useState<"dinero" | "especie">("dinero");
  const [mostrarOpcionesNaturaleza, setMostrarOpcionesNaturaleza] = useState(false);

  // Estados para reparto de inscripciones (cuando categoría === "inscripciones")
  const [tipoFiltroInscripcion, setTipoFiltroInscripcion] = useState<"binomio" | "jinete" | "club" | "todos">(
    preseleccion?.binomioId ? "binomio" : preseleccion?.jineteId ? "jinete" : preseleccion?.clubId ? "club" : "binomio"
  );
  const [filtroInscripcionId, setFiltroInscripcionId] = useState<string>(
    preseleccion?.binomioId || preseleccion?.jineteId || preseleccion?.clubId || ""
  );
  const [repartoValores, setRepartoValores] = useState<Record<string, number>>({});

  // Monto (formateado con separador de miles)
  const [montoTexto, setMontoTexto] = useState("");
  const [montoNumero, setMontoNumero] = useState<number>(0);

  // Fechas y medios
  const hoyChile = obtenerFechaHoyChile();
  const [fecha, setFecha] = useState(hoyChile);
  const [estadoPago, setEstadoPago] = useState<"pagado" | "pendiente">("pagado");
  const [fechaPago, setFechaPago] = useState(hoyChile);
  const [medioPago, setMedioPago] = useState<"transferencia" | "efectivo" | "otro">("transferencia");

  // Categoría y contraparte
  const [categoria, setCategoria] = useState<OpcionCategoria | null>(null);
  const [sinIdentificar, setSinIdentificar] = useState(false);
  const [contraparte, setContraparte] = useState<{ id: string; nombre: string } | null>(null);

  // Quién pagó (solo gastos)
  const [pagadoPorId, setPagadoPorId] = useState<string>(""); // vacío = "La caja"

  // Datos adicionales
  const [nombreOrigen, setNombreOrigen] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [observacion, setObservacion] = useState("");
  const [sinRespaldo, setSinRespaldo] = useState(false);
  const [archivos, setArchivos] = useState<ArchivoSeleccionado[]>([]);

  // Asignación complementaria a participante o caballo
  const [caballoId, setCaballoId] = useState<string>("");
  const [jineteId, setJineteId] = useState<string>("");
  const [clubId, setClubId] = useState<string>("");
  const [mostrarAsignacion, setMostrarAsignacion] = useState(false);

  // Control de duplicados
  const [posiblesDuplicados, setPosiblesDuplicados] = useState<any[]>([]);
  const [modalDuplicados, setModalDuplicados] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [guardadoExitoso, setGuardadoExitoso] = useState<any | null>(null);

  // Manejo de cambio en el monto
  const manejarCambioMonto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setMontoTexto("");
      setMontoNumero(0);
      return;
    }
    const num = parseInt(raw, 10);
    if (num > 999_999_999) return;
    setMontoNumero(num);
    setMontoTexto(num.toLocaleString("es-CL"));
  };

  // Cambio de contraparte: autocompletar nombreOrigen en ingresos si está vacío
  const manejarSeleccionContraparte = (c: { id: string; nombre: string }) => {
    setContraparte(c);
    if (tipo === "ingreso" && !nombreOrigen.trim()) {
      setNombreOrigen(c.nombre);
    }
  };

  const esCategoriaInscripciones =
    tipo === "ingreso" &&
    (categoria?.claveSistema === "inscripciones" ||
      categoria?.nombre.toLowerCase().includes("inscripci"));

  const itemsFiltrados: ItemCobrableParaReparto[] = itemsCobrables.filter((it) => {
    if (tipoFiltroInscripcion === "todos" || !filtroInscripcionId) return true;
    if (tipoFiltroInscripcion === "binomio") return it.binomioId === filtroInscripcionId;
    if (tipoFiltroInscripcion === "jinete") return it.jineteId === filtroInscripcionId;
    if (tipoFiltroInscripcion === "club") return it.clubId === filtroInscripcionId;
    return true;
  });

  const saldoTotalFiltrado = itemsFiltrados.reduce((a, b) => a + b.saldo, 0);

  const aplicarMontoTotalInscripciones = (monto: number) => {
    setMontoNumero(monto);
    setMontoTexto(monto.toLocaleString("es-CL"));
  };

  const seleccionarFiltroInscripcion = (id: string, nuevoTipo = tipoFiltroInscripcion) => {
    setFiltroInscripcionId(id);
    setRepartoValores({});
    if (!nombreOrigen.trim()) {
      if (nuevoTipo === "binomio") {
        const b = binomios.find((item) => item.id === id);
        if (b?.jinete?.nombre) setNombreOrigen(b.jinete.nombre);
      } else if (nuevoTipo === "jinete") {
        const j = jinetes.find((item) => item.id === id);
        if (j?.nombre) setNombreOrigen(j.nombre);
      } else if (nuevoTipo === "club") {
        const c = clubes.find((item) => item.id === id);
        if (c?.nombre) setNombreOrigen(c.nombre);
      }
    }
  };

  // Verifica si la contraparte es obligatoria según las reglas
  const contraparteEsObligatoria = requiereContraparte(
    {
      estadoPago: tipo === "gasto" && pagadoPorId ? "pendiente" : estadoPago,
      pagadoPorId: pagadoPorId || null,
      naturaleza,
    },
    categoria
  );

  // Ejecución final del envío
  const enviarFormulario = async () => {
    setErrorEnvio(null);

    // Validación mínima en cliente
    if (montoNumero <= 0) {
      setErrorEnvio("Ingresa un monto válido mayor a 0.");
      return;
    }

    if (!sinIdentificar && !categoria) {
      setErrorEnvio("Selecciona una categoría o pulsa 'No sé de qué es'.");
      return;
    }

    if (contraparteEsObligatoria && !contraparte) {
      setErrorEnvio("La contraparte es obligatoria para este movimiento.");
      return;
    }

    if (
      tipo === "ingreso" &&
      naturaleza === "dinero" &&
      estadoPago === "pagado" &&
      medioPago === "transferencia" &&
      !nombreOrigen.trim()
    ) {
      setErrorEnvio("El nombre de origen es obligatorio en transferencias.");
      return;
    }

    if (sinRespaldo && !observacion.trim()) {
      setErrorEnvio("La observación es obligatoria si marcas 'Sin respaldo'.");
      return;
    }

    if (!sinRespaldo && archivos.length === 0) {
      setErrorEnvio("Adjunta al menos una foto o comprobante, o marca 'Sin respaldo'.");
      return;
    }

    let repartoArray: { id: string; montoClp: number }[] = [];
    if (esCategoriaInscripciones) {
      repartoArray = Object.entries(repartoValores)
        .filter(([_, m]) => m > 0)
        .map(([id, m]) => ({
          id,
          montoClp: m,
        }));

      const sumaReparto = Object.values(repartoValores).reduce((a, b) => a + b, 0);
      if (sumaReparto > montoNumero) {
        setErrorEnvio("La suma asignada a las inscripciones supera el monto del pago.");
        return;
      }
    }

    const payload = {
      tipo,
      naturaleza,
      montoClp: montoNumero,
      fecha,
      fechaPago: estadoPago === "pagado" ? fechaPago : null,
      medioPago: estadoPago === "pagado" && naturaleza === "dinero" ? medioPago : null,
      estadoPago: tipo === "gasto" && pagadoPorId ? "pendiente" : estadoPago,
      categoriaId: sinIdentificar ? null : categoria?.id || null,
      sinIdentificar,
      contraparteId: contraparte?.id || null,
      pagadoPorId: tipo === "gasto" && pagadoPorId ? pagadoPorId : null,
      nombreOrigen: tipo === "ingreso" ? nombreOrigen.trim() || null : null,
      descripcion: descripcion.trim() || null,
      observacion: observacion.trim() || null,
      sinRespaldo,
      caballoId: caballoId || null,
      jineteId: jineteId || (esCategoriaInscripciones && tipoFiltroInscripcion === "jinete" ? filtroInscripcionId : null) || null,
      clubId: clubId || (esCategoriaInscripciones && tipoFiltroInscripcion === "club" ? filtroInscripcionId : null) || null,
      binomioId: (esCategoriaInscripciones && tipoFiltroInscripcion === "binomio" ? filtroInscripcionId : null) || null,
      repartoInscripciones: repartoArray.length > 0 ? repartoArray : undefined,
      claveCliente,
    };

    const formData = new FormData();
    formData.append("datos", JSON.stringify(payload));
    for (const a of archivos) {
      formData.append("archivos", a.file);
    }

    startTransition(async () => {
      try {
        const res = await registrarMovimientoAction(formData);
        if (res.exito && res.movimiento) {
          setGuardadoExitoso(res.movimiento);
          const msg =
            res.movimiento.estadoValidacion === "validado"
              ? "Registrado y validado correctamente."
              : "Registrado. Queda por validar.";
          toast.success(msg);
        } else {
          setErrorEnvio(res.error || "No se pudo registrar el movimiento.");
          toast.error(res.error || "Error al registrar.");
        }
      } catch (err: any) {
        console.error("Fallo de red o servidor:", err);
        setErrorEnvio("No se pudo conectar con el servidor. Revisa tu señal e intenta nuevamente.");
      }
    });
  };

  // Paso previo para chequear posibles duplicados
  const manejarPreEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEnvio(null);

    if (montoNumero > 0 && (categoria || contraparte)) {
      try {
        const duplicados = await buscarDuplicados({
          tipo,
          montoClp: montoNumero,
          fecha,
          categoriaId: categoria?.id || null,
          contraparteId: contraparte?.id || null,
        });

        if (duplicados && duplicados.length > 0) {
          setPosiblesDuplicados(duplicados);
          setModalDuplicados(true);
          return;
        }
      } catch (err) {
        console.warn("No se pudo verificar duplicados preliminares:", err);
      }
    }

    await enviarFormulario();
  };

  // Pantalla de éxito tras registrar
  if (guardadoExitoso) {
    const esValidado = guardadoExitoso.estadoValidacion === "validado";

    return (
      <div className="bg-white rounded-xl border border-stone-200 p-6 text-center space-y-5 shadow-sm">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-stone-900">
            {tipo === "gasto" ? "Gasto" : "Ingreso"} Registrado
          </h2>
          <p className="text-sm text-stone-600">
            {esValidado
              ? "El movimiento ha sido registrado y autovalidado en la tesorería."
              : "Registrado con éxito. Queda en la bandeja por validar del administrador."}
          </p>
        </div>

        <div className="p-4 bg-stone-50 rounded-lg text-left text-sm space-y-1.5 border border-stone-200">
          <div className="flex justify-between">
            <span className="text-stone-500">Monto:</span>
            <span className="font-semibold text-stone-900">
              ${montoNumero.toLocaleString("es-CL")} CLP
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Fecha:</span>
            <span className="text-stone-800">{fecha}</span>
          </div>
          {categoria && (
            <div className="flex justify-between">
              <span className="text-stone-500">Categoría:</span>
              <span className="text-stone-800">{categoria.nombre}</span>
            </div>
          )}
          {contraparte && (
            <div className="flex justify-between">
              <span className="text-stone-500">Contraparte:</span>
              <span className="text-stone-800">{contraparte.nombre}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-sm font-semibold"
            onClick={() => {
              // Limpiar para otro registro rápido
              setGuardadoExitoso(null);
              setMontoTexto("");
              setMontoNumero(0);
              setDescripcion("");
              setObservacion("");
              setArchivos([]);
              setSinRespaldo(false);
              setSinIdentificar(false);
              setPosiblesDuplicados([]);
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Registrar otro {tipo}
          </Button>

          <Button
            type="button"
            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm"
            onClick={() => router.push("/movimientos")}
          >
            Ver movimientos
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={manejarPreEnvio} className="space-y-6">
      {/* Selector superior de Tipo (Ingreso / Gasto) */}
      <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setTipo("ingreso");
            setCategoria(null);
          }}
          className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tipo === "ingreso"
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Ingreso
        </button>
        <button
          type="button"
          onClick={() => {
            setTipo("gasto");
            setNaturaleza("dinero");
            setSinIdentificar(false);
            setCategoria(null);
          }}
          className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tipo === "gasto"
              ? "bg-white text-rose-700 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Gasto
        </button>
      </div>

      {/* Monto principal (Teclado numérico grande) */}
      <div className="space-y-1.5">
        <Label htmlFor="monto-input" className="text-sm font-semibold text-stone-800">
          {naturaleza === "especie" ? "Valor Estimado *" : "Monto en CLP *"}
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500 font-bold text-lg">
            $
          </div>
          <Input
            id="monto-input"
            type="text"
            inputMode="numeric"
            value={montoTexto}
            onChange={manejarCambioMonto}
            placeholder="0"
            className="pl-8 text-2xl font-bold h-14 bg-white tracking-tight border-stone-300 focus:border-emerald-600"
            required
            autoFocus
          />
        </div>
        {naturaleza === "especie" && (
          <p className="text-xs text-amber-700 font-medium">
            Valor comercial aproximado de lo recibido (no suma a la caja en efectivo).
          </p>
        )}
      </div>

      {/* Respaldo fotográfico o digital */}
      <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-stone-900">
            Respaldo (Boleta / Comprobante) *
          </Label>
          <span className="text-xs text-stone-500">
            {sinRespaldo ? "Sin respaldo" : `${archivos.length} adjuntos`}
          </span>
        </div>

        {!sinRespaldo && (
          <CapturaRespaldo
            archivos={archivos}
            onChange={setArchivos}
            maxArchivos={5}
            deshabilitado={isPending}
          />
        )}

        <div className="flex items-center space-x-2 pt-2 border-t border-stone-200">
          <Checkbox
            id="sin-respaldo"
            checked={sinRespaldo}
            onCheckedChange={(c) => setSinRespaldo(Boolean(c))}
            disabled={isPending}
          />
          <Label
            htmlFor="sin-respaldo"
            className="text-xs font-medium text-stone-700 cursor-pointer"
          >
            No tengo respaldo físico ni digital (exige observación obligatoria)
          </Label>
        </div>
      </div>

      {/* Categoría y botón "No sé de qué es" */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-stone-800">
            Categoría {!sinIdentificar && "*"}
          </Label>
          {tipo === "ingreso" && (
            <Button
              type="button"
              variant={sinIdentificar ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSinIdentificar(!sinIdentificar);
                if (!sinIdentificar) setCategoria(null);
              }}
              className={`h-7 text-xs px-2.5 ${
                sinIdentificar
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "text-amber-800 border-amber-300 hover:bg-amber-50"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 mr-1" />
              {sinIdentificar ? "Marcado sin identificar" : "No sé de qué es"}
            </Button>
          )}
        </div>

        {sinIdentificar ? (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
            <strong>Ingreso sin identificar:</strong> Se guardará sin categoría y quedará por
            validar hasta que un administrador lo clasifique.
          </div>
        ) : (
          <SelectorCategoria
            tipo={tipo}
            valorSeleccionado={categoria?.id}
            claveSistemaSeleccionada={categoriaInicialClave}
            alSeleccionar={(cat) => setCategoria(cat)}
          />
        )}
      </div>

      {/* Imputación a Inscripciones (solo cuando categoría es Inscripciones) */}
      {esCategoriaInscripciones && (
        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-emerald-950">Imputación a Inscripciones</h3>
              <p className="text-xs text-emerald-700">
                Selecciona el sujeto y asigna los montos a cada prueba con saldo pendiente.
              </p>
            </div>
            {saldoTotalFiltrado > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => aplicarMontoTotalInscripciones(saldoTotalFiltrado)}
                className="text-xs h-8 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-semibold"
              >
                Pagar saldo ({formatearMonto(saldoTotalFiltrado)})
              </Button>
            )}
          </div>

          {/* Botones de filtro de sujeto */}
          <div className="grid grid-cols-4 gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={tipoFiltroInscripcion === "binomio" ? "default" : "outline"}
              className={`text-xs h-8 ${
                tipoFiltroInscripcion === "binomio"
                  ? "bg-emerald-800 text-white font-semibold"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
              onClick={() => {
                setTipoFiltroInscripcion("binomio");
                seleccionarFiltroInscripcion(binomios[0]?.id || "", "binomio");
              }}
            >
              Binomio
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tipoFiltroInscripcion === "jinete" ? "default" : "outline"}
              className={`text-xs h-8 ${
                tipoFiltroInscripcion === "jinete"
                  ? "bg-emerald-800 text-white font-semibold"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
              onClick={() => {
                setTipoFiltroInscripcion("jinete");
                seleccionarFiltroInscripcion(jinetes[0]?.id || "", "jinete");
              }}
            >
              Jinete
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tipoFiltroInscripcion === "club" ? "default" : "outline"}
              className={`text-xs h-8 ${
                tipoFiltroInscripcion === "club"
                  ? "bg-emerald-800 text-white font-semibold"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
              onClick={() => {
                setTipoFiltroInscripcion("club");
                seleccionarFiltroInscripcion(clubes[0]?.id || "", "club");
              }}
            >
              Club
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tipoFiltroInscripcion === "todos" ? "default" : "outline"}
              className={`text-xs h-8 ${
                tipoFiltroInscripcion === "todos"
                  ? "bg-emerald-800 text-white font-semibold"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
              onClick={() => {
                setTipoFiltroInscripcion("todos");
                seleccionarFiltroInscripcion("", "todos");
              }}
            >
              Todos
            </Button>
          </div>

          {/* Desplegable de selección según filtro */}
          {tipoFiltroInscripcion === "binomio" && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Seleccionar Binomio</Label>
              <select
                value={filtroInscripcionId}
                onChange={(e) => seleccionarFiltroInscripcion(e.target.value, "binomio")}
                className="w-full h-10 px-3 rounded-lg border border-stone-300 bg-white text-xs text-stone-800"
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

          {tipoFiltroInscripcion === "jinete" && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Seleccionar Jinete</Label>
              <select
                value={filtroInscripcionId}
                onChange={(e) => seleccionarFiltroInscripcion(e.target.value, "jinete")}
                className="w-full h-10 px-3 rounded-lg border border-stone-300 bg-white text-xs text-stone-800"
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

          {tipoFiltroInscripcion === "club" && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Seleccionar Club</Label>
              <select
                value={filtroInscripcionId}
                onChange={(e) => seleccionarFiltroInscripcion(e.target.value, "club")}
                className="w-full h-10 px-3 rounded-lg border border-stone-300 bg-white text-xs text-stone-800"
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

          {/* Tabla de reparto */}
          <RepartoPago
            montoPago={montoNumero}
            items={itemsFiltrados}
            valores={repartoValores}
            alCambiar={setRepartoValores}
          />
        </div>
      )}

      {/* Contraparte (Auspiciador o Proveedor) */}
      {!esCategoriaInscripciones && (
        <div className="space-y-1.5">
          <SelectorContraparte
            tipoMovimiento={tipo}
            contraparteSeleccionadaId={contraparte?.id}
            alSeleccionar={manejarSeleccionContraparte}
            alLimpiar={() => setContraparte(null)}
            requerido={contraparteEsObligatoria}
            label={`Contraparte ${contraparteEsObligatoria ? "(Obligatoria) *" : "(Opcional)"}`}
          />
        </div>
      )}

      {/* ¿Ya se pagó? / ¿Ya se recibió? */}
      <div className="space-y-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
        <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
          {tipo === "gasto" ? "¿Ya se pagó?" : "¿Ya se recibió el dinero?"}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={estadoPago === "pagado" ? "default" : "outline"}
            className={`h-11 ${
              estadoPago === "pagado"
                ? "bg-stone-900 text-white font-semibold"
                : "text-stone-700 hover:bg-stone-100"
            }`}
            onClick={() => setEstadoPago("pagado")}
          >
            {tipo === "gasto" ? "Ya pagado" : "Ya recibido"}
          </Button>
          <Button
            type="button"
            variant={estadoPago === "pendiente" ? "default" : "outline"}
            className={`h-11 ${
              estadoPago === "pendiente"
                ? "bg-amber-600 text-white font-semibold"
                : "text-stone-700 hover:bg-stone-100"
            }`}
            onClick={() => setEstadoPago("pendiente")}
          >
            {tipo === "gasto" ? "Pendiente (por pagar)" : "Pendiente (por cobrar)"}
          </Button>
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fecha" className="text-xs font-semibold text-stone-700">
            Fecha del hecho *
          </Label>
          <Input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              if (estadoPago === "pagado" && fechaPago < e.target.value) {
                setFechaPago(e.target.value);
              }
            }}
            max={estadoPago === "pagado" ? hoyChile : undefined}
            className="h-11 bg-white"
            required
          />
        </div>

        {estadoPago === "pagado" && (
          <div className="space-y-1.5">
            <Label htmlFor="fecha-pago" className="text-xs font-semibold text-stone-700">
              Fecha de pago *
            </Label>
            <Input
              id="fecha-pago"
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              max={hoyChile}
              min={fecha}
              className="h-11 bg-white"
              required
            />
          </div>
        )}
      </div>

      {/* Medio de pago (si está pagado y es dinero) */}
      {estadoPago === "pagado" && naturaleza === "dinero" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-stone-700">Medio de pago *</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "transferencia", label: "Transferencia" },
              { id: "efectivo", label: "Efectivo" },
              { id: "otro", label: "Otro" },
            ].map((m) => (
              <Button
                key={m.id}
                type="button"
                variant={medioPago === m.id ? "default" : "outline"}
                className={`h-10 text-xs font-medium ${
                  medioPago === m.id ? "bg-stone-800 text-white" : "text-stone-700"
                }`}
                onClick={() => setMedioPago(m.id as any)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Nombre de origen (solo ingresos) */}
      {tipo === "ingreso" && naturaleza === "dinero" && (
        <div className="space-y-1.5">
          <Label htmlFor="nombre-origen" className="text-xs font-semibold text-stone-700">
            Nombre de origen {medioPago === "transferencia" && estadoPago === "pagado" ? "*" : "(Opcional)"}
          </Label>
          <Input
            id="nombre-origen"
            type="text"
            value={nombreOrigen}
            onChange={(e) => setNombreOrigen(e.target.value)}
            placeholder="Titular de la cuenta o quién pagó"
            className="h-11 bg-white"
            maxLength={100}
            required={medioPago === "transferencia" && estadoPago === "pagado"}
          />
        </div>
      )}

      {/* Quién pagó (solo gastos: La caja vs Reembolso a una persona) */}
      {tipo === "gasto" && (
        <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
          <Label className="text-xs font-semibold text-stone-700">¿Quién pagó el gasto?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPagadoPorId("")}
              className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                pagadoPorId === ""
                  ? "bg-white border-emerald-600 text-emerald-900 ring-1 ring-emerald-600"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span className="font-bold block">La caja del club</span>
              <span className="text-[11px] text-stone-500">Dinero directo de la cuenta o efectivo</span>
            </button>

            <button
              type="button"
              onClick={() => setPagadoPorId(usuarioActual.id)}
              className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                pagadoPorId === usuarioActual.id
                  ? "bg-white border-amber-600 text-amber-900 ring-1 ring-amber-600"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span className="font-bold block">Yo, de mi bolsillo</span>
              <span className="text-[11px] text-stone-500">Nace pendiente por devolver (reembolso)</span>
            </button>
          </div>

          {/* Administrador puede elegir además a otros miembros de la comisión */}
          {usuarioActual.rol === "administrador" && miembrosComision.length > 0 && (
            <div className="pt-2">
              <Label htmlFor="otro-miembro" className="text-[11px] text-stone-500">
                O asignar reembolso a otro miembro de la comisión:
              </Label>
              <select
                id="otro-miembro"
                value={pagadoPorId}
                onChange={(e) => setPagadoPorId(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-stone-300 bg-white text-xs text-stone-800"
              >
                <option value="">Seleccionar otro miembro...</option>
                {miembrosComision.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Descripción corta */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label htmlFor="descripcion" className="text-xs font-semibold text-stone-700">
            Descripción corta (Opcional)
          </Label>
          <span className="text-[11px] text-stone-400">{descripcion.length}/140</span>
        </div>
        <Input
          id="descripcion"
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej: Pintura vallas pista 2, premios diplomas..."
          maxLength={140}
          className="h-11 bg-white"
        />
      </div>

      {/* Observación / Justificación */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label htmlFor="observacion" className="text-xs font-semibold text-stone-700">
            Observación {sinRespaldo ? "(Obligatoria con Sin respaldo) *" : "(Opcional)"}
          </Label>
          <span className="text-[11px] text-stone-400">{observacion.length}/500</span>
        </div>
        <Textarea
          id="observacion"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          placeholder="Escribe detalles relevantes. No ingreses números de cuenta bancaria ni RUT."
          maxLength={500}
          rows={3}
          className="bg-white"
          required={sinRespaldo}
        />
        <p className="text-[11px] text-stone-500">
          Por privacidad normativa (Ley 19.628 / 21.719), no escribas datos bancarios ni RUTs en este campo.
        </p>
      </div>

      {/* Opciones avanzadas: Naturaleza (En especie para ingresos) */}
      {tipo === "ingreso" && (
        <div className="border border-stone-200 rounded-lg p-3 bg-stone-50">
          <button
            type="button"
            onClick={() => setMostrarOpcionesNaturaleza(!mostrarOpcionesNaturaleza)}
            className="flex items-center justify-between w-full text-xs font-medium text-stone-700"
          >
            <span>Naturaleza del ingreso: {naturaleza === "dinero" ? "Dinero (normal)" : "En especie"}</span>
            {mostrarOpcionesNaturaleza ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {mostrarOpcionesNaturaleza && (
            <div className="pt-3 flex gap-2">
              <Button
                type="button"
                variant={naturaleza === "dinero" ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setNaturaleza("dinero")}
              >
                Dinero
              </Button>
              <Button
                type="button"
                variant={naturaleza === "especie" ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setNaturaleza("especie")}
              >
                En especie / Canje
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Asignación opcional a participante o caballo */}
      {!esCategoriaInscripciones && (
        <div className="border border-stone-200 rounded-lg p-3.5 bg-stone-50 space-y-3">
          <button
            type="button"
            onClick={() => setMostrarAsignacion(!mostrarAsignacion)}
            className="flex items-center justify-between w-full text-xs font-semibold text-stone-700 cursor-pointer"
          >
            <span>Asignar a participante o caballo (Opcional)</span>
            {mostrarAsignacion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {mostrarAsignacion && (
            <div className="pt-2 space-y-3 border-t border-stone-200">
              <div>
                <SelectorCaballo
                  caballoSeleccionadoId={caballoId}
                  alSeleccionar={(c) => {
                    setCaballoId(c.id);
                    if (c.clubId && !clubId) setClubId(c.clubId);
                  }}
                  alLimpiar={() => setCaballoId("")}
                  label="Caballo relacionado"
                />
              </div>

              <div>
                <SelectorJinete
                  jineteSeleccionadoId={jineteId}
                  alSeleccionar={(j) => {
                    setJineteId(j.id);
                    if (j.clubId && !clubId) setClubId(j.clubId);
                  }}
                  alLimpiar={() => setJineteId("")}
                  label="Jinete relacionado"
                />
              </div>

              <div>
                <SelectorClub
                  clubSeleccionadoId={clubId}
                  alSeleccionar={(c) => setClubId(c.id)}
                  alLimpiar={() => setClubId("")}
                  label="Club relacionado"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Errores */}
      {errorEnvio && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
          {errorEnvio}
        </div>
      )}

      {/* Botón táctil grande de Guardar */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-14 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base rounded-xl shadow-md transition-all active:scale-[0.99]"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Guardando movimiento...
          </span>
        ) : (
          `Guardar ${tipo === "gasto" ? "Gasto" : "Ingreso"}`
        )}
      </Button>

      {/* Modal / Advertencia de posible duplicado */}
      {modalDuplicados && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-stone-200">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-stone-900">¿Ya está registrado?</h3>
            </div>
            <p className="text-xs text-stone-600">
              Encontramos movimientos similares con el mismo tipo, monto y fecha cercana:
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {posiblesDuplicados.map((d: any) => (
                <div key={d.id} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-stone-800">
                    <span>${d.montoClp.toLocaleString("es-CL")}</span>
                    <span>{new Date(d.fecha).toISOString().slice(0, 10)}</span>
                  </div>
                  <p className="text-stone-500">
                    {d.categoria?.nombre || "Sin categoría"} · {d.contraparte?.nombre || "Sin contraparte"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-10"
                onClick={() => setModalDuplicados(false)}
              >
                Revisar / Cancelar
              </Button>
              <Button
                type="button"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-10 font-bold"
                onClick={async () => {
                  setModalDuplicados(false);
                  await enviarFormulario();
                }}
              >
                Es otro, guardar igual
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
