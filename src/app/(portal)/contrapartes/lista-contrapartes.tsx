"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet } from "@/components/ui/sheet";
import { ChipEstado } from "@/components/app/estado";
import {
  ContraparteDTO,
  crearContraparte,
  buscarParecidosContrapartes,
} from "@/dominio/organizacion/contrapartes";

interface ListaContrapartesProps {
  contrapartesIniciales: ContraparteDTO[];
  puedeCrear: boolean;
  esObservador: boolean;
}

export function ListaContrapartes({
  contrapartesIniciales,
  puedeCrear,
  esObservador,
}: ListaContrapartesProps) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "auspiciador" | "proveedor" | "otro">("todos");
  const [mostrarDesactivadas, setMostrarDesactivadas] = useState(false);

  // Modal nueva contraparte
  const [modalCrear, setModalCrear] = useState(false);
  const [nombre, setNombre] = useState("");
  const [esAuspiciador, setEsAuspiciador] = useState(false);
  const [esProveedor, setEsProveedor] = useState(true);
  const [contacto, setContacto] = useState("");
  const [rut, setRut] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [parecidos, setParecidos] = useState<{ id: string; nombre: string }[]>([]);

  // Detección de parecidos mientras escribe
  const handleNombreChange = async (val: string) => {
    setNombre(val);
    if (val.trim().length >= 3) {
      const sugerencias = await buscarParecidosContrapartes(val);
      setParecidos(sugerencias);
    } else {
      setParecidos([]);
    }
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    const res = await crearContraparte({
      nombre,
      esAuspiciador,
      esProveedor,
      contacto: contacto.trim() || null,
      rut: rut.trim() || null,
    });

    setGuardando(false);

    if (!res.exito) {
      toast.error(res.error || "No se pudo crear la contraparte.");
      return;
    }

    toast.success("Contraparte registrada con éxito.");
    setModalCrear(false);
    setNombre("");
    setContacto("");
    setRut("");
    setParecidos([]);
    router.refresh();
  };

  // Filtrado en cliente
  const filtradas = contrapartesIniciales.filter((c) => {
    if (!mostrarDesactivadas && !c.activa) return false;

    if (filtroTipo === "auspiciador" && !c.esAuspiciador) return false;
    if (filtroTipo === "proveedor" && !c.esProveedor) return false;
    if (filtroTipo === "otro" && (c.esAuspiciador || c.esProveedor)) return false;

    if (busqueda.trim() !== "") {
      const b = busqueda.toLowerCase().trim();
      const coincideNombre = c.nombre.toLowerCase().includes(b);
      const coincideRut = c.rut?.toLowerCase().includes(b);
      if (!coincideNombre && !coincideRut) return false;
    }

    return true;
  });

  return (
    <div className="space-y-5">
      {/* Barra de Búsqueda y Botón Nueva */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-texto-suave" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o RUT..."
            className="pl-10"
          />
        </div>

        {puedeCrear && (
          <Button
            onClick={() => {
              setNombre("");
              setContacto("");
              setRut("");
              setParecidos([]);
              setModalCrear(true);
            }}
            className="gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva contraparte</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        )}
      </div>

      {/* Filtros de Tipo y Estado */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "todos", etiqueta: "Todos" },
              { id: "auspiciador", etiqueta: "Auspiciadores" },
              { id: "proveedor", etiqueta: "Proveedores" },
              { id: "otro", etiqueta: "Otros" },
            ] as const
          ).map((tipo) => (
            <button
              key={tipo.id}
              onClick={() => setFiltroTipo(tipo.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filtroTipo === tipo.id
                  ? "bg-acento text-sobre-acento"
                  : "bg-superficie text-texto hover:bg-borde"
              }`}
            >
              {tipo.etiqueta}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-1.5 text-texto-suave cursor-pointer select-none">
          <Checkbox
            checked={mostrarDesactivadas}
            onCheckedChange={(c) => setMostrarDesactivadas(Boolean(c))}
            className="h-4 w-4"
          />
          <span>Mostrar desactivadas</span>
        </label>
      </div>

      {/* Listado de Tarjetas de 2 líneas (UX/UI §3.7) */}
      <div className="space-y-2">
        {filtradas.length === 0 ? (
          <div className="p-8 text-center text-xs text-texto-suave rounded-2xl border border-borde bg-superficie">
            No se encontraron contrapartes con los filtros aplicados.
          </div>
        ) : (
          filtradas.map((c) => {
            const subtitulo = [
              c.rut || null,
              c.contacto || null,
              c.esAuspiciador ? "Auspiciador" : null,
              c.esProveedor ? "Proveedor" : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <Link
                key={c.id}
                href={`/contrapartes/${c.id}`}
                className={`flex items-center justify-between p-4 rounded-2xl border border-borde bg-superficie hover:border-acento transition-all shadow-xs group ${
                  !c.activa ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-texto truncate">
                      {c.nombre}
                    </span>
                    {!c.activa && <ChipEstado tono="fuera" texto="Desactivada" />}
                  </div>

                  <p className="text-xs text-texto-suave truncate mt-0.5">
                    {subtitulo || "Sin datos de contacto"}
                  </p>
                </div>

                <span className="text-texto-suave text-lg font-light group-hover:translate-x-0.5 transition-transform">
                  ›
                </span>
              </Link>
            );
          })
        )}
      </div>

      {/* Modal / Sheet Crear Contraparte */}
      <Sheet
        abierta={modalCrear}
        alCerrar={() => setModalCrear(false)}
        posicion="centro"
        titulo="Nueva contraparte"
        descripcion="Registra un auspiciador, proveedor o tercero."
      >
        <form onSubmit={handleCrear} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cpNombre">Nombre o Razón Social *</Label>
            <Input
              id="cpNombre"
              type="text"
              required
              minLength={2}
              maxLength={120}
              value={nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              placeholder="Ej: Ferretería Angol"
              autoFocus
            />
          </div>

          {/* Aviso no bloqueante de parecidos */}
          {parecidos.length > 0 && (
            <div className="p-3 rounded-xl border border-falta-texto/30 bg-falta-fondo text-xs text-falta-texto space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>¿Es alguna de estas contrapartes activas?</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {parecidos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setModalCrear(false);
                      router.push(`/contrapartes/${p.id}`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-fondo text-texto font-medium hover:bg-borde transition-colors cursor-pointer"
                  >
                    {p.nombre} ›
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tipo de Contraparte */}
          <div className="space-y-2 pt-1">
            <Label>Tipo de relación</Label>
            <div className="flex items-center gap-5">
              <label className="inline-flex items-center gap-2 text-xs text-texto cursor-pointer">
                <Checkbox
                  checked={esAuspiciador}
                  onCheckedChange={(c) => setEsAuspiciador(Boolean(c))}
                />
                <span>Auspiciador</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs text-texto cursor-pointer">
                <Checkbox
                  checked={esProveedor}
                  onCheckedChange={(c) => setEsProveedor(Boolean(c))}
                />
                <span>Proveedor</span>
              </label>
            </div>
          </div>

          {/* Contacto y RUT (Opcionales) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="cpRut">RUT (opcional)</Label>
              <Input
                id="cpRut"
                type="text"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="Ej: 12.345.678-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cpContacto">Teléfono o correo (opcional)</Label>
              <Input
                id="cpContacto"
                type="text"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="contacto@ejemplo.cl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-borde/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalCrear(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando || !nombre.trim()}>
              {guardando ? "Registrando..." : "Guardar contraparte"}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
