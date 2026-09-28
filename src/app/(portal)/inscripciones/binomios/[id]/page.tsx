import { notFound } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { fichaBinomio, estadoCuenta } from "@/dominio/inscripciones/binomios/consultas";
import { FichaBinomio } from "./ficha-binomio";

export const metadata = {
  title: "Ficha Binomio · Tesorería",
  description: "Detalle de inscripción, cargos y pagos del binomio",
};

export default async function FichaBinomioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await obtenerContexto();
  const { id } = await params;

  if (!ctx.evento) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No hay evento activo seleccionado.
      </div>
    );
  }

  const binomio = await fichaBinomio(ctx, id);
  if (!binomio) {
    notFound();
  }

  const [pruebas, clubes, jinetes, caballos, otrosBinomios, estadoCuentaDatos] =
    await Promise.all([
      db(ctx).prueba.findMany({
        where: { organizacionId: ctx.organizacionId, eventoId: ctx.evento.id, activa: true },
        orderBy: { orden: "asc" },
      }),
      db(ctx).club.findMany({
        where: { organizacionId: ctx.organizacionId, activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
      db(ctx).jinete.findMany({
        where: { organizacionId: ctx.organizacionId, activo: true },
        select: { id: true, nombre: true, clubId: true },
        orderBy: { nombre: "asc" },
      }),
      db(ctx).caballo.findMany({
        where: { organizacionId: ctx.organizacionId, activo: true },
        select: { id: true, nombre: true, clubId: true },
        orderBy: { nombre: "asc" },
      }),
      db(ctx).binomio.findMany({
        where: {
          organizacionId: ctx.organizacionId,
          eventoId: ctx.evento.id,
          anulado: false,
          id: { not: id },
        },
        include: {
          jinete: { select: { id: true, nombre: true } },
          caballo: { select: { id: true, nombre: true } },
        },
      }),
      ctx.rol !== "observador" ? estadoCuenta(ctx, { binomioId: id }) : null,
    ]);

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo={`${binomio.jinete.nombre} / ${binomio.caballo.nombre}`}
        volverHref="/inscripciones"
      />
      <FichaBinomio
        binomio={binomio}
        pruebas={pruebas}
        clubes={clubes}
        jinetes={jinetes}
        caballos={caballos}
        otrosBinomios={otrosBinomios}
        estadoCuentaDatos={estadoCuentaDatos}
        rol={ctx.rol}
      />
    </>
  );
}
