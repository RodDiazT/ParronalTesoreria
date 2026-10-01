import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { exigir } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FormularioNuevaInscripcion } from "./formulario-nueva-inscripcion";
import { alertasJinete } from "@/dominio/inscripciones/participantes/reglas";

export const metadata = {
  title: "Inscribir binomio · Tesorería",
  description: "Inscripción rápida de binomio en pruebas del concurso",
};

interface NuevaInscripcionPageProps {
  searchParams: Promise<{
    jineteId?: string;
    caballoId?: string;
  }>;
}

export default async function NuevaInscripcionPage({
  searchParams,
}: NuevaInscripcionPageProps) {
  const ctx = await obtenerContexto();

  try {
    exigir(ctx, "inscripciones.inscribir");
  } catch {
    redirect("/sin-permiso");
  }

  if (!ctx.evento || ctx.evento.estado !== "abierto") {
    return (
      <div className="p-8 text-center text-sm text-texto-suave">
        No hay un evento abierto vigente para registrar inscripciones.
      </div>
    );
  }

  const { jineteId, caballoId } = await searchParams;

  const [jinetesRaw, caballosRaw, clubes, pruebas] = await Promise.all([
    db(ctx).jinete.findMany({
      where: { organizacionId: ctx.organizacionId, activo: true },
      include: {
        club: { select: { nombre: true } },
        apoderados: {
          where: { activo: true },
          include: { apoderado: true },
        },
        binomios: {
          where: { anulado: false },
          orderBy: { creadoEn: "desc" },
          take: 1,
          select: { caballoId: true },
        },
      },
      orderBy: { nombre: "asc" },
    }),
    db(ctx).caballo.findMany({
      where: { organizacionId: ctx.organizacionId, activo: true },
      include: {
        club: { select: { nombre: true } },
        binomios: {
          where: { anulado: false },
          orderBy: { creadoEn: "desc" },
          take: 1,
          select: { jineteId: true },
        },
      },
      orderBy: { nombre: "asc" },
    }),
    db(ctx).club.findMany({
      where: { organizacionId: ctx.organizacionId, activo: true },
      orderBy: { nombre: "asc" },
    }),
    db(ctx).prueba.findMany({
      where: { organizacionId: ctx.organizacionId, eventoId: ctx.evento.id, activa: true },
      orderBy: { orden: "asc" },
    }),
  ]);

  const jinetes = jinetesRaw.map((j) => {
    const alert = alertasJinete(j, ctx.evento!);
    return {
      id: j.id,
      nombre: j.nombre,
      clubId: j.clubId,
      clubNombre: j.club.nombre,
      caballoHabitualId: j.binomios?.[0]?.caballoId || null,
      fechaNacimiento: j.fechaNacimiento,
      contacto: j.contacto,
      rut: j.rut,
      alertas: alert,
    };
  });

  const caballos = caballosRaw.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    clubId: c.clubId,
    clubNombre: c.club.nombre,
    jineteHabitualId: c.binomios?.[0]?.jineteId || null,
  }));

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Inscribir binomio"
        volverHref="/inscripciones"
      />

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-texto">Inscribir en {ctx.evento.nombre}</h2>
          <p className="text-xs text-texto-suave mt-0.5">
            Selecciona jinete, caballo y las pruebas en las que competirá.
          </p>
        </div>

        <FormularioNuevaInscripcion
          jinetes={jinetes}
          caballos={caballos}
          clubes={clubes}
          pruebas={pruebas}
          evento={ctx.evento}
          preseleccionJineteId={jineteId}
          preseleccionCaballoId={caballoId}
        />
      </div>
    </>
  );
}
