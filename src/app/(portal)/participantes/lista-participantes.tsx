"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronRight,
  User,
  Building2,
  Phone,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Rol } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertasJinete } from "@/components/app/alertas-jinete";
import { SelectorClub } from "@/components/app/selector-club";
import { normalizarBusqueda } from "@/lib/utilidades";
import {
  JineteResumenDTO,
  CaballoResumenDTO,
  ClubResumenDTO,
  ApoderadoResumenDTO,
} from "@/dominio/inscripciones/participantes/consultas";
import {
  crearCaballo,
  crearClub,
  crearApoderado,
} from "@/dominio/inscripciones/participantes/acciones";
import { Sheet } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ListaParticipantesProps {
  jinetesIniciales: JineteResumenDTO[];
  caballosIniciales: CaballoResumenDTO[];
  clubesIniciales: ClubResumenDTO[];
  apoderadosIniciales: ApoderadoResumenDTO[];
  contadorAlertasInicial: number;
  rol: Rol;
  pestanaInicial?: "jinetes" | "caballos" | "clubes" | "apoderados";
  filtroConAlertasInicial?: boolean;
}

export function ListaParticipantes({
  jinetesIniciales,
  caballosIniciales,
  clubesIniciales,
  apoderadosIniciales,
  contadorAlertasInicial,
  rol,
  pestanaInicial = "jinetes",
  filtroConAlertasInicial = false,
}: ListaParticipantesProps) {
  const router = useRouter();
  const [pestana, setPestana] = useState<"jinetes" | "caballos" | "clubes" | "apoderados">(
    pestanaInicial
  );
  const [busqueda, setBusqueda] = useState("");
  const [clubFiltroId, setClubFiltroId] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [filtroConAlertas, setFiltroConAlertas] = useState(filtroConAlertasInicial);

  // Modales de creación rápida para Caballo, Club y Apoderado
  const [modalNuevoCaballo, setModalNuevoCaballo] = useState(false);
  const [nombreCaballo, setNombreCaballo] = useState("");
  const [clubIdCaballo, setClubIdCaballo] = useState("");

  const [modalNuevoClub, setModalNuevoClub] = useState(false);
  const [nombreClub, setNombreClub] = useState("");
  const [contactoClub, setContactoClub] = useState("");
  const [rutClub, setRutClub] = useState("");

  const [modalNuevoApoderado, setModalNuevoApoderado] = useState(false);
  const [nombreApoderado, setNombreApoderado] = useState("");
  const [telefonoApoderado, setTelefonoApoderado] = useState("");

  const [guardando, setGuardando] = useState(false);

  const puedeCrear = rol === "administrador" || rol === "ayudante";
  const esObservador = rol === "observador";

  // Manejo de Creación rápida de Caballo
  const handleGuardarCaballo = async () => {
    if (!nombreCaballo.trim()) {
      toast.error("El nombre del caballo es obligatorio.");
      return;
    }
    if (!clubIdCaballo) {
      toast.error("Debe seleccionarse un club.");
      return;
    }
    setGuardando(true);
    try {
      const res = await crearCaballo({
        nombre: nombreCaballo.trim(),
        clubId: clubIdCaballo,
        confirmarAunqueParecido: true,
      });
      if (res.exito) {
        toast.success("Caballo registrado exitosamente.");
        setModalNuevoCaballo(false);
        setNombreCaballo("");
        setClubIdCaballo("");
        router.refresh();
      } else {
        toast.error(res.error || "No fue posible registrar el caballo.");
      }
    } finally {
      setGuardando(false);
    }
  };

  // Manejo de Creación rápida de Club
  const handleGuardarClub = async () => {
    if (!nombreClub.trim()) {
      toast.error("El nombre del club es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      const res = await crearClub({
        nombre: nombreClub.trim(),
        contacto: contactoClub.trim() || undefined,
        rut: rutClub.trim() || undefined,
        confirmarAunqueParecido: true,
      });
      if (res.exito) {
        toast.success("Club registrado exitosamente.");
        setModalNuevoClub(false);
        setNombreClub("");
        setContactoClub("");
        setRutClub("");
        router.refresh();
      } else {
        toast.error(res.error || "No fue posible registrar el club.");
      }
    } finally {
      setGuardando(false);
    }
  };

  // Manejo de Creación rápida de Apoderado
  const handleGuardarApoderado = async () => {
    if (!nombreApoderado.trim() || !telefonoApoderado.trim()) {
      toast.error("Nombre y teléfono son obligatorios.");
      return;
    }
    setGuardando(true);
    try {
      const res = await crearApoderado({
        nombre: nombreApoderado.trim(),
        telefono: telefonoApoderado.trim(),
        confirmarAunqueParecido: true,
      });
      if (res.exito) {
        toast.success("Apoderado registrado exitosamente.");
        setModalNuevoApoderado(false);
        setNombreApoderado("");
        setTelefonoApoderado("");
        router.refresh();
      } else {
        toast.error(res.error || "No fue posible registrar el apoderado.");
      }
    } finally {
      setGuardando(false);
    }
  };

  // Filtros aplicados en memoria
  const q = normalizarBusqueda(busqueda);

  const jinetesFiltrados = jinetesIniciales.filter((j) => {
    if (soloActivos && !j.activo) return false;
    if (clubFiltroId && j.clubId !== clubFiltroId) return false;
    if (filtroConAlertas && j.alertas.length === 0) return false;
    if (q) {
      return (
        normalizarBusqueda(j.nombre).includes(q) ||
        (j.clubNombre && normalizarBusqueda(j.clubNombre).includes(q))
      );
    }
    return true;
  });

  const caballosFiltrados = caballosIniciales.filter((c) => {
    if (soloActivos && !c.activo) return false;
    if (clubFiltroId && c.clubId !== clubFiltroId) return false;
    if (q) {
      return (
        normalizarBusqueda(c.nombre).includes(q) ||
        (c.clubNombre && normalizarBusqueda(c.clubNombre).includes(q))
      );
    }
    return true;
  });

  const clubesFiltrados = clubesIniciales.filter((cl) => {
    if (soloActivos && !cl.activo) return false;
    if (q) return normalizarBusqueda(cl.nombre).includes(q);
    return true;
  });

  const apoderadosFiltrados = apoderadosIniciales.filter((a) => {
    if (soloActivos && !a.activo) return false;
    if (q) {
      return (
        normalizarBusqueda(a.nombre).includes(q) ||
        (a.telefono && a.telefono.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Pestañas de Navegación */}
      <div className="flex border-b border-borde overflow-x-auto no-scrollbar gap-2">
        <button
          type="button"
          onClick={() => {
            setPestana("jinetes");
            setFiltroConAlertas(false);
          }}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            pestana === "jinetes"
              ? "border-acento text-acento"
              : "border-transparent text-texto-secundario hover:text-texto"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Jinetes</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-fondo text-texto-suave">
            {jinetesIniciales.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPestana("caballos")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            pestana === "caballos"
              ? "border-acento text-acento"
              : "border-transparent text-texto-secundario hover:text-texto"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Caballos</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-fondo text-texto-suave">
            {caballosIniciales.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPestana("clubes")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            pestana === "clubes"
              ? "border-acento text-acento"
              : "border-transparent text-texto-secundario hover:text-texto"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Clubes</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-fondo text-texto-suave">
            {clubesIniciales.length}
          </span>
        </button>

        {!esObservador && (
          <button
            type="button"
            onClick={() => setPestana("apoderados")}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              pestana === "apoderados"
                ? "border-acento text-acento"
                : "border-transparent text-texto-secundario hover:text-texto"
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Apoderados</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-fondo text-texto-suave">
              {apoderadosIniciales.length}
            </span>
          </button>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave pointer-events-none" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={`Buscar en ${pestana}...`}
            className="pl-9 pr-3 rounded-2xl h-10 bg-superficie"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Club (en jinetes y caballos) */}
          {(pestana === "jinetes" || pestana === "caballos") && clubesIniciales.length > 1 && (
            <select
              value={clubFiltroId}
              onChange={(e) => setClubFiltroId(e.target.value)}
              className="h-10 px-3 rounded-2xl border border-borde bg-superficie text-xs font-medium text-texto"
            >
              <option value="">Todos los clubes</option>
              {clubesIniciales.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}

          {/* Filtro Con Alertas (solo en jinetes) */}
          {pestana === "jinetes" && !esObservador && contadorAlertasInicial > 0 && (
            <button
              type="button"
              onClick={() => setFiltroConAlertas(!filtroConAlertas)}
              className={`h-10 px-3 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                filtroConAlertas
                  ? "bg-falta-fondo text-falta-texto border-falta-borde shadow-sm"
                  : "bg-superficie text-texto-secundario border-borde hover:border-falta-borde"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-falta-texto" />
              <span>Con alertas</span>
              <span className="px-1.5 py-0.5 rounded-full bg-superficie-resaltada text-[10px]">
                {contadorAlertasInicial}
              </span>
            </button>
          )}

          {/* Toggle Activos */}
          <button
            type="button"
            onClick={() => setSoloActivos(!soloActivos)}
            className={`h-10 px-3 rounded-2xl text-xs font-medium border transition-colors ${
              soloActivos
                ? "bg-superficie text-texto border-borde"
                : "bg-acento/10 text-acento border-acento/30"
            }`}
          >
            {soloActivos ? "Solo activos" : "Ver todos (inactivos incl.)"}
          </button>

          {/* Botón Nuevo según pestaña */}
          {puedeCrear && (
            <>
              {pestana === "jinetes" && (
                <Link href="/participantes/jinetes/nuevo">
                  <Button className="h-10 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90 text-xs font-semibold gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>Nuevo jinete</span>
                  </Button>
                </Link>
              )}
              {pestana === "caballos" && (
                <Button
                  onClick={() => setModalNuevoCaballo(true)}
                  className="h-10 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90 text-xs font-semibold gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo caballo</span>
                </Button>
              )}
              {pestana === "clubes" && (
                <Button
                  onClick={() => setModalNuevoClub(true)}
                  className="h-10 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90 text-xs font-semibold gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo club</span>
                </Button>
              )}
              {pestana === "apoderados" && (
                <Button
                  onClick={() => setModalNuevoApoderado(true)}
                  className="h-10 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90 text-xs font-semibold gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo apoderado</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Contenido según Pestaña */}
      <div className="space-y-2">
        {/* 1. Jinetes */}
        {pestana === "jinetes" && (
          <>
            {jinetesFiltrados.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-borde bg-superficie text-texto-secundario text-sm">
                No se encontraron jinetes con los filtros aplicados.
              </div>
            ) : (
              jinetesFiltrados.map((j) => (
                <Link
                  key={j.id}
                  href={`/participantes/jinetes/${j.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-borde bg-superficie hover:border-acento hover:shadow-sm transition-all group"
                >
                  <div className="space-y-1 overflow-hidden pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-texto group-hover:text-acento truncate">
                        {j.nombre}
                      </span>
                      {!j.activo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-fuera-fondo text-fuera-texto font-medium">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-texto-secundario">
                      {j.clubNombre && <span>Club: {j.clubNombre}</span>}
                      {j.edad !== null ? (
                        <span>• {j.edad} años</span>
                      ) : !esObservador ? (
                        <span className="text-falta-texto font-medium">• Sin fecha de nac.</span>
                      ) : null}
                    </div>
                    {j.alertas.length > 0 && (
                      <AlertasJinete alertas={j.alertas} modo="compacto" className="pt-0.5" />
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-texto-suave group-hover:text-acento group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              ))
            )}
          </>
        )}

        {/* 2. Caballos */}
        {pestana === "caballos" && (
          <>
            {caballosFiltrados.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-borde bg-superficie text-texto-secundario text-sm">
                No se encontraron caballos con los filtros aplicados.
              </div>
            ) : (
              caballosFiltrados.map((c) => (
                <Link
                  key={c.id}
                  href={`/participantes/caballos/${c.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-borde bg-superficie hover:border-acento hover:shadow-sm transition-all group"
                >
                  <div className="space-y-0.5 overflow-hidden pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-texto group-hover:text-acento truncate">
                        {c.nombre}
                      </span>
                      {!c.activo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-fuera-fondo text-fuera-texto font-medium">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-texto-secundario">
                      Club: {c.clubNombre || "Sin club"}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-texto-suave group-hover:text-acento group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              ))
            )}
          </>
        )}

        {/* 3. Clubes */}
        {pestana === "clubes" && (
          <>
            {clubesFiltrados.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-borde bg-superficie text-texto-secundario text-sm">
                No se encontraron clubes.
              </div>
            ) : (
              clubesFiltrados.map((cl) => (
                <Link
                  key={cl.id}
                  href={`/participantes/clubes/${cl.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-borde bg-superficie hover:border-acento hover:shadow-sm transition-all group"
                >
                  <div className="space-y-0.5 overflow-hidden pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-texto group-hover:text-acento truncate">
                        {cl.nombre}
                      </span>
                      {!cl.activo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-fuera-fondo text-fuera-texto font-medium">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-texto-secundario">
                      {cl.jinetesCount} {cl.jinetesCount === 1 ? "jinete" : "jinetes"} •{" "}
                      {cl.caballosCount} {cl.caballosCount === 1 ? "caballo" : "caballos"}
                      {cl.contacto && ` • Contacto: ${cl.contacto}`}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-texto-suave group-hover:text-acento group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              ))
            )}
          </>
        )}

        {/* 4. Apoderados */}
        {pestana === "apoderados" && !esObservador && (
          <>
            {apoderadosFiltrados.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-borde bg-superficie text-texto-secundario text-sm">
                No se encontraron apoderados.
              </div>
            ) : (
              apoderadosFiltrados.map((a) => (
                <Link
                  key={a.id}
                  href={`/participantes/apoderados/${a.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-borde bg-superficie hover:border-acento hover:shadow-sm transition-all group"
                >
                  <div className="space-y-0.5 overflow-hidden pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-texto group-hover:text-acento truncate">
                        {a.nombre}
                      </span>
                      {!a.activo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-fuera-fondo text-fuera-texto font-medium">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-texto-secundario">
                      <span>
                        {a.jinetesCount} {a.jinetesCount === 1 ? "jinete a cargo" : "jinetes a cargo"}
                      </span>
                      {a.telefono && (
                        <span className="flex items-center gap-1 font-medium text-texto">
                          <Phone className="w-3 h-3 text-texto-suave" />
                          {a.telefono}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-texto-suave group-hover:text-acento group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              ))
            )}
          </>
        )}
      </div>

      {/* Sheet Creación Rápida Caballo */}
      <Sheet
        abierta={modalNuevoCaballo}
        alCerrar={() => setModalNuevoCaballo(false)}
        posicion="abajo"
        titulo="Nuevo Caballo"
        descripcion="Registra un caballo indicando su club obligatorio"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">
              Nombre del caballo <span className="text-problema">*</span>
            </Label>
            <Input
              value={nombreCaballo}
              onChange={(e) => setNombreCaballo(e.target.value)}
              placeholder="Ej: Vendaval"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <SelectorClub
              clubSeleccionadoId={clubIdCaballo}
              alSeleccionar={(c) => setClubIdCaballo(c.id)}
              alLimpiar={() => setClubIdCaballo("")}
              label="Club al que pertenece"
              requerido
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalNuevoCaballo(false)}
              className="flex-1 rounded-2xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={guardando || !nombreCaballo.trim() || !clubIdCaballo}
              onClick={handleGuardarCaballo}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {guardando ? "Guardando..." : "Guardar caballo"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Sheet Creación Rápida Club */}
      <Sheet
        abierta={modalNuevoClub}
        alCerrar={() => setModalNuevoClub(false)}
        posicion="abajo"
        titulo="Nuevo Club"
        descripcion="Registra una sociedad o club ecuestre"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">
              Nombre del club <span className="text-problema">*</span>
            </Label>
            <Input
              value={nombreClub}
              onChange={(e) => setNombreClub(e.target.value)}
              placeholder="Ej: Club Hípico de Santiago"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">Contacto (opcional)</Label>
            <Input
              value={contactoClub}
              onChange={(e) => setContactoClub(e.target.value)}
              placeholder="Teléfono o correo del club"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">RUT (opcional)</Label>
            <Input
              value={rutClub}
              onChange={(e) => setRutClub(e.target.value)}
              placeholder="Ej: 76.123.456-7"
              className="rounded-2xl"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalNuevoClub(false)}
              className="flex-1 rounded-2xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={guardando || !nombreClub.trim()}
              onClick={handleGuardarClub}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {guardando ? "Guardando..." : "Guardar club"}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Sheet Creación Rápida Apoderado */}
      <Sheet
        abierta={modalNuevoApoderado}
        alCerrar={() => setModalNuevoApoderado(false)}
        posicion="abajo"
        titulo="Nuevo Apoderado"
        descripcion="Contacto de emergencia y representante"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">
              Nombre del apoderado <span className="text-problema">*</span>
            </Label>
            <Input
              value={nombreApoderado}
              onChange={(e) => setNombreApoderado(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-texto">
              Teléfono de contacto / WhatsApp <span className="text-problema">*</span>
            </Label>
            <Input
              value={telefonoApoderado}
              onChange={(e) => setTelefonoApoderado(e.target.value)}
              placeholder="+56 9 1234 5678"
              className="rounded-2xl"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalNuevoApoderado(false)}
              className="flex-1 rounded-2xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={guardando || !nombreApoderado.trim() || !telefonoApoderado.trim()}
              onClick={handleGuardarApoderado}
              className="flex-1 rounded-2xl bg-acento text-acento-texto hover:bg-acento/90"
            >
              {guardando ? "Guardando..." : "Guardar apoderado"}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
