import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { exigir } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FormularioEvento } from "./formulario-evento";

export const metadata = {
  title: "Configuración del Evento · Tesorería",
  description: "Ajuste de parámetros y fechas del concurso",
};

export default async function ConfiguracionEventoPage() {
  const ctx = await obtenerContexto();

  try {
    exigir(ctx, "configurar");
  } catch {
    redirect("/sin-permiso");
  }

  if (!ctx.evento) {
    return (
      <div className="p-6 text-center text-sm text-texto-suave">
        No hay ningún evento configurado en la organización.
      </div>
    );
  }

  const evento = await db(ctx).evento.findUnique({
    where: { id: ctx.evento.id },
  });

  if (!evento) {
    redirect("/configuracion");
  }

  const aFechaISO = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Evento vigente"
        volverHref="/configuracion"
      />

      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-texto">Parámetros del evento</h2>
          <p className="text-xs text-texto-suave mt-0.5">
            Las fechas corresponden a los días del concurso y son de carácter informativo.
          </p>
        </div>

        <FormularioEvento
          evento={{
            id: evento.id,
            nombre: evento.nombre,
            fechaInicio: aFechaISO(evento.fechaInicio),
            fechaTermino: aFechaISO(evento.fechaTermino),
            fechaReferenciaEdad: aFechaISO(evento.fechaReferenciaEdad),
            lugar: evento.lugar || "",
            version: evento.version,
            estado: evento.estado,
          }}
        />
      </div>
    </>
  );
}
