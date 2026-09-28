import { notFound, redirect } from "next/navigation";
import { obtenerContexto } from "@/lib/contexto";
import { exigir, puede } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { fichaBinomio } from "@/dominio/inscripciones/binomios/consultas";
import { FormularioRetiro } from "./formulario-retiro";

export const metadata = {
  title: "Retirar Binomio / Pruebas · Tesorería",
  description: "Asistente de retiro de pruebas y gestión de retención o devoluciones",
};

export default async function RetirarBinomioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await obtenerContexto();

  if (!puede(ctx, "inscripciones.administrar")) {
    redirect(`/inscripciones/binomios/${(await params).id}`);
  }

  if (!ctx.evento) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No hay evento activo seleccionado.
      </div>
    );
  }

  const { id } = await params;
  const binomio = await fichaBinomio(ctx, id);

  if (!binomio) {
    notFound();
  }

  // Verificar si hay pagos asociados pendientes de validación
  let hayPagosPorValidar = false;
  for (const ins of binomio.inscripciones) {
    for (const p of ins.pagos || []) {
      if (
        !p.anulado &&
        (p.movimiento?.estadoValidacion === "por_validar" ||
          p.movimiento?.estadoValidacion === "observado")
      ) {
        hayPagosPorValidar = true;
        break;
      }
    }
  }
  if (!hayPagosPorValidar) {
    for (const car of binomio.cargos) {
      for (const p of car.pagos || []) {
        if (
          !p.anulado &&
          (p.movimiento?.estadoValidacion === "por_validar" ||
            p.movimiento?.estadoValidacion === "observado")
        ) {
          hayPagosPorValidar = true;
          break;
        }
      }
    }
  }

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo={`Retirar: ${binomio.jinete.nombre} / ${binomio.caballo.nombre}`}
        volverHref={`/inscripciones/binomios/${id}`}
      />
      <FormularioRetiro
        binomio={binomio}
        hayPagosPorValidar={hayPagosPorValidar}
      />
    </>
  );
}
