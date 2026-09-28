"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Calendar,
  AlertCircle,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { RelacionApoderado } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { SelectorClub } from "@/components/app/selector-club";
import { SelectorApoderado } from "@/components/app/selector-apoderado";
import { crearJinete } from "@/dominio/inscripciones/participantes/acciones";
import {
  edadEnEvento,
  obtenerHoyEnChile,
  ParecidoCoincidencia,
  ReferenciaEvento,
} from "@/dominio/inscripciones/participantes/reglas";

interface FormularioJineteProps {
  evento: ReferenciaEvento | null;
}

interface ApoderadoItemForm {
  apoderadoId?: string;
  apoderadoNombre?: string;
  nuevoApoderado?: { nombre: string; telefono: string };
  relacion: RelacionApoderado;
}

export function FormularioJinete({ evento }: FormularioJineteProps) {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [clubId, setClubId] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [contacto, setContacto] = useState("");
  const [rut, setRut] = useState("");
  const [mostrarRut, setMostrarRut] = useState(false);

  // Apoderados dinámicos
  const [apoderados, setApoderados] = useState<ApoderadoItemForm[]>([]);
  const [apoderadoTemporalId, setApoderadoTemporalId] = useState("");
  const [apoderadoTemporalNombre, setApoderadoTemporalNombre] = useState("");
  const [relacionTemporal, setRelacionTemporal] = useState<RelacionApoderado>("madre");

  // Autorización
  const [tieneAutorizacion, setTieneAutorizacion] = useState(false);
  const hoyChile = obtenerHoyEnChile();
  const fechaHoyStr = `${hoyChile[0]}-${String(hoyChile[1]).padStart(2, "0")}-${String(
    hoyChile[2]
  ).padStart(2, "0")}`;
  const [fechaAutorizacion, setFechaAutorizacion] = useState(fechaHoyStr);

  const [guardando, setGuardando] = useState(false);
  const [parecidos, setParecidos] = useState<ParecidoCoincidencia[]>([]);
  const [modalParecidos, setModalParecidos] = useState(false);

  // Cálculo en vivo de edad
  const edadCalculada = edadEnEvento(fechaNacimiento || null, evento);
  const esMenor18 = edadCalculada !== null && edadCalculada < 18;
  const esMenor14 = edadCalculada !== null && edadCalculada < 14;

  const agregarApoderado = () => {
    if (!apoderadoTemporalId) {
      toast.error("Selecciona un apoderado.");
      return;
    }
    if (apoderados.some((a) => a.apoderadoId === apoderadoTemporalId)) {
      toast.error("El apoderado ya está agregado en la lista.");
      return;
    }

    setApoderados([
      ...apoderados,
      {
        apoderadoId: apoderadoTemporalId,
        apoderadoNombre: apoderadoTemporalNombre,
        relacion: relacionTemporal,
      },
    ]);
    setApoderadoTemporalId("");
    setApoderadoTemporalNombre("");
  };

  const quitarApoderado = (index: number) => {
    setApoderados(apoderados.filter((_, idx) => idx !== index));
  };

  const handleGuardar = async (confirmarAunqueParecido = false) => {
    if (!nombre.trim()) {
      toast.error("El nombre del jinete es obligatorio.");
      return;
    }
    if (!clubId) {
      toast.error("Debe seleccionarse un club para el jinete.");
      return;
    }

    setGuardando(true);
    try {
      const res = await crearJinete({
        nombre: nombre.trim(),
        clubId,
        fechaNacimiento: fechaNacimiento.trim() || undefined,
        contacto: contacto.trim() || undefined,
        rut: rut.trim() || undefined,
        autorizacionFecha: esMenor14 && tieneAutorizacion ? fechaAutorizacion : undefined,
        confirmarAunqueParecido,
        apoderados: apoderados.map((a) => ({
          apoderadoId: a.apoderadoId,
          relacion: a.relacion,
        })),
      });

      if (!res.exito) {
        if (res.requiereConfirmacion && res.parecidos) {
          setParecidos(res.parecidos);
          setModalParecidos(true);
          toast.warning("Se detectaron jinetes con nombres similares.");
          return;
        }
        toast.error(res.error || "No fue posible crear el jinete.");
        return;
      }

      toast.success("Jinete registrado exitosamente.");
      router.push(`/participantes/jinetes/${res.jinete!.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Error al procesar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-8">
      {/* 1. Datos Principales */}
      <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-4">
        <div className="flex items-center gap-2 border-b border-borde pb-2.5">
          <User className="w-4 h-4 text-acento" />
          <h3 className="text-sm font-bold text-texto">Datos del Jinete</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-texto">
            Nombre completo <span className="text-problema">*</span>
          </Label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Sofía Morales Silva"
            className="rounded-2xl"
          />
        </div>

        <div className="space-y-1.5">
          <SelectorClub
            clubSeleccionadoId={clubId}
            alSeleccionar={(c) => setClubId(c.id)}
            alLimpiar={() => setClubId("")}
            label="Club / Sociedad"
            requerido
          />
        </div>

        {/* Fecha de nacimiento con cálculo dinámico de edad */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-texto">
              Fecha de nacimiento (opcional)
            </Label>
            {edadCalculada !== null ? (
              <span className="text-xs font-semibold text-acento">
                {edadCalculada} años al evento
              </span>
            ) : (
              <span className="text-[11px] text-texto-secundario">
                Sin fecha: edad desconocida
              </span>
            )}
          </div>
          <Input
            type="date"
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
            className="rounded-2xl"
          />
          {edadCalculada !== null && (edadCalculada < 4 || edadCalculada > 90) && (
            <p className="text-[11px] text-falta-texto font-medium">
              Aviso: ¿Está bien la fecha? La edad resultante ({edadCalculada} años) es atípica.
            </p>
          )}
        </div>

        {/* Contacto directo del jinete */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-texto">
            Contacto directo (opcional)
          </Label>
          <Input
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            placeholder={
              esMenor18
                ? "Teléfono del menor o del apoderado"
                : "Teléfono o correo del jinete"
            }
            className="rounded-2xl"
          />
        </div>

        {/* RUT Plegable */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setMostrarRut(!mostrarRut)}
            className="flex items-center gap-1.5 text-xs text-texto-secundario hover:text-texto font-medium"
          >
            {mostrarRut ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{mostrarRut ? "Ocultar RUT" : "+ Agregar RUT (opcional)"}</span>
          </button>

          {mostrarRut && (
            <div className="mt-2 space-y-1.5">
              <Input
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="Ej: 21.345.678-9"
                className="rounded-2xl text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Sección Apoderados (Visible si es menor de 18 o sin fecha de nacimiento) */}
      <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3.5">
        <div className="flex items-center justify-between border-b border-borde pb-2.5">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-acento" />
            <h3 className="text-sm font-bold text-texto">Apoderados y Contacto de Emergencia</h3>
          </div>
          {esMenor18 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-falta-fondo text-falta-texto border border-falta-borde/40">
              Menor de edad
            </span>
          )}
        </div>

        <p className="text-xs text-texto-secundario leading-relaxed">
          {esMenor18
            ? "Por ser menor de edad, se requiere registrar al menos un apoderado responsable. No bloquea el guardado si aún no tienes el dato."
            : "Puedes vincular apoderados o contactos de emergencia responsables."}
        </p>

        {/* Lista de apoderados ya agregados */}
        {apoderados.length > 0 && (
          <div className="space-y-2">
            {apoderados.map((a, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl border border-borde bg-fondo"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-texto">{a.apoderadoNombre}</div>
                  <div className="text-[11px] text-texto-secundario capitalize">
                    Relación: {a.relacion.replace("_", " ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => quitarApoderado(idx)}
                  className="p-1.5 rounded-full text-problema hover:bg-problema-fondo transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Selector para agregar nuevo vínculo */}
        <div className="space-y-2.5 pt-1">
          <SelectorApoderado
            apoderadoSeleccionadoId={apoderadoTemporalId}
            alSeleccionar={(ap) => {
              setApoderadoTemporalId(ap.id);
              setApoderadoTemporalNombre(ap.nombre);
            }}
            alLimpiar={() => {
              setApoderadoTemporalId("");
              setApoderadoTemporalNombre("");
            }}
            label="Buscar o crear apoderado"
          />

          {apoderadoTemporalId && (
            <div className="flex gap-2 items-center">
              <select
                value={relacionTemporal}
                onChange={(e) => setRelacionTemporal(e.target.value as RelacionApoderado)}
                className="flex-1 h-10 px-3 rounded-2xl border border-borde bg-superficie text-xs font-medium text-texto"
              >
                <option value="madre">Madre</option>
                <option value="padre">Padre</option>
                <option value="tutor_legal">Tutor legal</option>
                <option value="otro_familiar">Otro familiar</option>
                <option value="otro">Otro</option>
              </select>

              <Button
                type="button"
                onClick={agregarApoderado}
                className="rounded-2xl h-10 bg-superficie text-texto border border-borde hover:border-acento text-xs font-semibold gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Sección Autorización (Visible para menores de 14 años) */}
      {esMenor14 && (
        <div className="p-4 rounded-3xl border border-borde bg-superficie space-y-3">
          <div className="flex items-center gap-2 border-b border-borde pb-2.5">
            <ShieldCheck className="w-4 h-4 text-acento" />
            <h3 className="text-sm font-bold text-texto">Autorización de Menor de 14 Años</h3>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-2xl border border-borde bg-fondo cursor-pointer select-none">
            <input
              type="checkbox"
              checked={tieneAutorizacion}
              onChange={(e) => setTieneAutorizacion(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-borde text-acento focus:ring-acento"
            />
            <div className="space-y-1">
              <span className="text-xs font-semibold text-texto leading-tight block">
                Autorización del apoderado recibida por la comisión
              </span>
              <span className="text-[11px] text-texto-secundario block leading-normal">
                Constancia de recepción de la autorización del menor de 14 años exigida por ley.
              </span>
            </div>
          </label>

          {tieneAutorizacion && (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-medium text-texto">Fecha de recepción</Label>
              <Input
                type="date"
                value={fechaAutorizacion}
                onChange={(e) => setFechaAutorizacion(e.target.value)}
                className="rounded-2xl"
              />
            </div>
          )}
        </div>
      )}

      {/* Botones de Acción */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1 rounded-2xl h-12"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={guardando || !nombre.trim() || !clubId}
          onClick={() => handleGuardar(false)}
          className="flex-1 rounded-2xl h-12 bg-acento text-acento-texto hover:bg-acento/90 font-semibold"
        >
          {guardando ? "Guardando..." : "Guardar jinete"}
        </Button>
      </div>

      {/* Modal / Sheet Aviso de Duplicado */}
      <Sheet
        abierta={modalParecidos}
        alCerrar={() => setModalParecidos(false)}
        posicion="abajo"
        titulo="¿Es alguno de estos jinetes?"
        descripcion="Se detectaron jinetes existentes con nombres o fechas similares"
      >
        <div className="space-y-3 py-2">
          {parecidos.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setModalParecidos(false);
                router.push(`/participantes/jinetes/${p.id}`);
              }}
              className="flex items-center justify-between p-3 rounded-2xl border border-borde bg-superficie hover:border-acento cursor-pointer transition-colors"
            >
              <div>
                <div className="text-xs font-semibold text-texto">{p.nombre}</div>
                <div className="text-[11px] text-texto-secundario">
                  Club: {p.clubNombre || "Sin club"}{" "}
                  {p.anoNacimiento && `• Año: ${p.anoNacimiento}`}
                </div>
              </div>
              <span className="text-xs text-acento font-medium">Ver existente</span>
            </div>
          ))}

          <div className="flex gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setModalParecidos(false)}
              className="flex-1 rounded-2xl"
            >
              Volver a editar
            </Button>
            <Button
              onClick={() => {
                setModalParecidos(false);
                handleGuardar(true);
              }}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              Crear de todos modos
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
