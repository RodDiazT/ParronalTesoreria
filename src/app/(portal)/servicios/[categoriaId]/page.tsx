import { notFound } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { listarCargosPorCategoria } from "@/dominio/servicios/cargos";
import { puede } from "@/lib/permisos";
import { VistaServicio } from "./vista-servicio";

export const metadata = {
  title: "Servicio · Tesorería",
  description: "Nómina y cobranza del servicio operativo",
};

interface ServicioPageProps {
  params: Promise<{
    categoriaId: string;
  }>;
}

export default async function ServicioPage({ params }: ServicioPageProps) {
  const { categoriaId } = await params;
  const ctx = await obtenerContexto();

  if (!ctx.evento) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No hay ningún evento activo seleccionado. Selecciona o crea un evento en la configuración.
      </div>
    );
  }

  const categoria = await db(ctx).categoria.findUnique({
    where: {
      id: categoriaId,
      organizacionId: ctx.organizacionId,
    },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      sujetoAsociado: true,
      tarifaBaseClp: true,
      activa: true,
    },
  });

  if (!categoria || !categoria.activa) {
    notFound();
  }

  const [datosCargos, caballos, jinetes, clubes, binomios] = await Promise.all([
    listarCargosPorCategoria(ctx, categoriaId),
    categoria.sujetoAsociado === "caballo"
      ? db(ctx).caballo.findMany({
          where: { organizacionId: ctx.organizacionId, activo: true },
          include: { club: { select: { id: true, nombre: true } } },
          orderBy: { nombre: "asc" },
        })
      : Promise.resolve([]),
    categoria.sujetoAsociado === "jinete"
      ? db(ctx).jinete.findMany({
          where: { organizacionId: ctx.organizacionId, activo: true },
          include: { club: { select: { id: true, nombre: true } } },
          orderBy: { nombre: "asc" },
        })
      : Promise.resolve([]),
    categoria.sujetoAsociado === "club"
      ? db(ctx).club.findMany({
          where: { organizacionId: ctx.organizacionId, activo: true },
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        })
      : Promise.resolve([]),
    categoria.sujetoAsociado === "binomio"
      ? db(ctx).binomio.findMany({
          where: { organizacionId: ctx.organizacionId, eventoId: ctx.evento.id, anulado: false },
          include: {
            jinete: { select: { id: true, nombre: true } },
            caballo: { select: { id: true, nombre: true } },
            club: { select: { id: true, nombre: true } },
          },
          orderBy: { jinete: { nombre: "asc" } },
        })
      : Promise.resolve([]),
  ]);

  const puedeInscribir = puede(ctx, "inscripciones.inscribir");

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo={categoria.nombre}
        volverHref="/participantes"
      />
      <VistaServicio
        categoria={categoria}
        cargos={datosCargos.cargos}
        totales={datosCargos.totales}
        caballos={caballos.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          clubId: c.clubId,
          clubNombre: c.club?.nombre,
        }))}
        jinetes={jinetes.map((j) => ({
          id: j.id,
          nombre: j.nombre,
          clubId: j.clubId,
          clubNombre: j.club?.nombre,
        }))}
        clubes={clubes}
        binomios={binomios.map((b) => ({
          id: b.id,
          nombre: `${b.jinete.nombre} · ${b.caballo.nombre}`,
          clubNombre: b.club?.nombre,
        }))}
        puedeInscribir={puedeInscribir}
      />
    </>
  );
}
