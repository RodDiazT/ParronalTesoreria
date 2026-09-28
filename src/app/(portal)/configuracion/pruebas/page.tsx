import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { exigir } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { GestorPruebas } from "./gestor-pruebas";

export const metadata = {
  title: "Pruebas y cobros · Configuración",
  description: "Configuración de pruebas del concurso, tarifas y conceptos adicionales",
};

export default async function PruebasConfiguracionPage() {
  const ctx = await obtenerContexto();

  try {
    exigir(ctx, "configurar");
  } catch {
    redirect("/sin-permiso");
  }

  if (!ctx.evento) {
    return (
      <div className="p-8 text-center text-sm text-texto-suave">
        No hay un evento vigente seleccionado.
      </div>
    );
  }

  const [pruebas, conceptos] = await Promise.all([
    db(ctx).prueba.findMany({
      where: { organizacionId: ctx.organizacionId, eventoId: ctx.evento.id },
      orderBy: { orden: "asc" },
    }),
    db(ctx).concepto.findMany({
      where: { organizacionId: ctx.organizacionId, eventoId: ctx.evento.id },
      orderBy: { orden: "asc" },
    }),
  ]);

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Pruebas y cobros"
        volverHref="/configuracion"
      />

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-texto">Pruebas y cobros del concurso</h2>
          <p className="text-xs text-texto-suave mt-0.5">
            Tarifas y parámetros para las inscripciones y servicios de {ctx.evento.nombre}.
          </p>
        </div>

        <GestorPruebas
          pruebasIniciales={pruebas}
          conceptosIniciales={conceptos}
        />
      </div>
    </>
  );
}
