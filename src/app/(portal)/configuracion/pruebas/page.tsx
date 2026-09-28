import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { exigir } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { GestorPruebas } from "./gestor-pruebas";

export const metadata = {
  title: "Pruebas · Configuración",
  description: "Configuración de pruebas del concurso y tarifas",
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

  const pruebas = await db(ctx).prueba.findMany({
    where: { organizacionId: ctx.organizacionId, eventoId: ctx.evento.id },
    include: {
      inscripciones: {
        where: { anulado: false },
        select: {
          id: true,
          binomioId: true,
          binomio: {
            select: {
              jinete: { select: { nombre: true } },
              caballo: { select: { nombre: true } },
            },
          },
        },
      },
    },
    orderBy: { orden: "asc" },
  });

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Pruebas del concurso"
        volverHref="/configuracion"
      />

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-texto">Pruebas del concurso</h2>
          <p className="text-xs text-texto-suave mt-0.5">
            Tarifas y parámetros para las pruebas de {ctx.evento.nombre}.
          </p>
        </div>

        <GestorPruebas pruebasIniciales={pruebas} />
      </div>
    </>
  );
}
