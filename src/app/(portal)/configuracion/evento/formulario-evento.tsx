"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarEvento } from "@/dominio/organizacion/acciones";

interface FormularioEventoProps {
  evento: {
    id: string;
    nombre: string;
    fechaInicio: string;
    fechaTermino: string;
    fechaReferenciaEdad: string;
    lugar: string;
    version: number;
    estado: string;
  };
}

export function FormularioEvento({ evento }: FormularioEventoProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState(evento.nombre);
  const [fechaInicio, setFechaInicio] = useState(evento.fechaInicio);
  const [fechaTermino, setFechaTermino] = useState(evento.fechaTermino);
  const [fechaReferenciaEdad, setFechaReferenciaEdad] = useState(evento.fechaReferenciaEdad);
  const [lugar, setLugar] = useState(evento.lugar);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorServidor(null);

    const res = await actualizarEvento({
      id: evento.id,
      nombre,
      fechaInicio,
      fechaTermino,
      fechaReferenciaEdad,
      lugar,
      version: evento.version,
    });

    setGuardando(false);

    if (!res.exito) {
      setErrorServidor(res.error || "Ocurrió un error al guardar.");
      toast.error(res.error || "Error al actualizar evento.");
      return;
    }

    toast.success("Evento actualizado correctamente.");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorServidor && (
        <div className="rounded-xl border border-problema-texto/30 bg-problema-fondo p-4 text-xs font-medium text-problema-texto">
          {errorServidor}
        </div>
      )}

      {/* Nombre del Evento */}
      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre del evento *</Label>
        <Input
          id="nombre"
          type="text"
          required
          minLength={3}
          maxLength={120}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Concurso Ecuestre Parronal"
        />
        <p className="text-[11px] text-texto-suave">
          Se mostrará en el encabezado, informes y planillas.
        </p>
      </div>

      {/* Fechas de Inicio y Término */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="fechaInicio">Fecha de inicio *</Label>
          <Input
            id="fechaInicio"
            type="date"
            required
            value={fechaInicio}
            onChange={(e) => {
              setFechaInicio(e.target.value);
              if (!fechaTermino || fechaTermino < e.target.value) {
                setFechaTermino(e.target.value);
              }
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fechaTermino">Fecha de término *</Label>
          <Input
            id="fechaTermino"
            type="date"
            required
            min={fechaInicio}
            value={fechaTermino}
            onChange={(e) => setFechaTermino(e.target.value)}
          />
        </div>
      </div>

      {/* Fecha de corte de edad */}
      <div className="space-y-1.5">
        <Label htmlFor="fechaReferenciaEdad">
          Fecha de corte para la edad (opcional)
        </Label>
        <Input
          id="fechaReferenciaEdad"
          type="date"
          value={fechaReferenciaEdad}
          onChange={(e) => setFechaReferenciaEdad(e.target.value)}
        />
        <p className="text-[11px] text-texto-suave leading-relaxed">
          Fecha oficial del reglamento para calcular si un jinete es menor de edad. Si se deja vacía, se usa automáticamente la fecha de inicio.
        </p>
      </div>

      {/* Lugar del Concurso */}
      <div className="space-y-1.5">
        <Label htmlFor="lugar">Lugar / Sede (opcional)</Label>
        <Input
          id="lugar"
          type="text"
          maxLength={200}
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          placeholder="Ej: Club Ecuestre Parronal, Cancha 1"
        />
      </div>

      {/* Estado del Evento */}
      <div className="p-3.5 rounded-xl border border-borde bg-superficie text-xs space-y-1">
        <span className="font-semibold text-texto">Estado del evento: </span>
        <span className="capitalize text-acento font-bold">{evento.estado}</span>
        <p className="text-[11px] text-texto-suave">
          El evento está abierto para operaciones de tesorería y registro de movimientos.
        </p>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={guardando}
          className="w-full sm:w-auto min-w-[140px]"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
