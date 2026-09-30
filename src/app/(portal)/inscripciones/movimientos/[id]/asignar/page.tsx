import { notFound, redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { porAsignar, estadoItem } from "@/dominio/inscripciones/binomios/reglas";
import { AsignarVista } from "./asignar-vista";

export const metadata = {
  title: "Asignar Saldo · Tesorería",
  description: "Imputación de saldo disponible de un movimiento a inscripciones pendientes",
};

export default async function AsignarMovimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await obtenerContexto();
  if (!puede(ctx, "inscripciones.inscribir")) {
    redirect("/inscripciones");
  }

  if (!ctx.evento) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No hay evento activo seleccionado.
      </div>
    );
  }

  const { id } = await params;

  const movimiento = await db(ctx).movimiento.findFirst({
    where: {
      id,
      organizacionId: ctx.organizacionId,
      eventoId: ctx.evento.id,
      tipo: "ingreso",
      anulado: false,
    },
    include: {
      categoria: true,
      pagos: {
        where: { anulado: false },
        include: {
          inscripcion: { include: { prueba: true } },
        },
      },
      devolucionesSobrante: { where: { anulado: false } },
    },
  });

  if (!movimiento) {
    notFound();
  }

  const saldoDisponible = porAsignar(
    movimiento,
    movimiento.pagos,
    movimiento.devolucionesSobrante
  );

  const [inscripcionesRaw, binomios, jinetes, clubes, cargosRaw] = await Promise.all([
    db(ctx).inscripcion.findMany({
      where: {
        organizacionId: ctx.organizacionId,
        eventoId: ctx.evento.id,
        anulado: false,
        retirado: false,
      },
      include: {
        prueba: true,
        binomio: {
          include: {
            jinete: true,
            caballo: true,
            club: true,
          },
        },
        pagos: {
          where: { anulado: false },
        },
      },
      orderBy: { creadoEn: "asc" },
    }),
    db(ctx).binomio.findMany({
      where: { organizacionId: ctx.organizacionId, eventoId: ctx.evento.id, anulado: false },
      include: { jinete: true, caballo: true, club: true },
      orderBy: { creadoEn: "desc" },
    }),
    db(ctx).jinete.findMany({
      where: { organizacionId: ctx.organizacionId, activo: true },
      include: { club: true },
      orderBy: { nombre: "asc" },
    }),
    db(ctx).club.findMany({
      where: { organizacionId: ctx.organizacionId, activo: true },
      orderBy: { nombre: "asc" },
    }),
    db(ctx).cargo.findMany({
      where: {
        organizacionId: ctx.organizacionId,
        eventoId: ctx.evento.id,
        anulado: false,
      },
      include: {
        categoria: true,
        caballo: true,
        jinete: true,
        club: true,
        binomio: { include: { jinete: true, caballo: true } },
        pagos: { where: { anulado: false } },
      },
      orderBy: { creadoEn: "asc" },
    }),
  ]);

  const itemsCobrables: any[] = [];

  for (const ins of inscripcionesRaw) {
    const calc = estadoItem(ins, ins.pagos);
    if (calc.saldo > 0) {
      itemsCobrables.push({
        id: ins.id,
        tipo: "inscripcion",
        nombre: `Prueba: ${ins.prueba.nombre}`,
        sujeto: `${ins.binomio.jinete.nombre} / ${ins.binomio.caballo.nombre}`,
        binomioId: ins.binomioId,
        jineteId: ins.binomio.jineteId,
        clubId: ins.binomio.clubId,
        monto: calc.monto,
        pagado: calc.pagado,
        saldo: calc.saldo,
        creadoEn: ins.creadoEn.toISOString(),
      });
    }
  }

  for (const cargo of (cargosRaw as any[])) {
    const pagado = cargo.pagos.reduce((acc: number, p: any) => acc + p.montoClp, 0);
    const saldo = Math.max(0, cargo.montoClp - pagado);
    if (saldo > 0) {
      const sujeto = cargo.caballo
        ? `Caballo: ${cargo.caballo.nombre}`
        : cargo.jinete
        ? `Jinete: ${cargo.jinete.nombre}`
        : cargo.club
        ? `Club: ${cargo.club.nombre}`
        : cargo.binomio
        ? `${cargo.binomio.jinete.nombre} / ${cargo.binomio.caballo.nombre}`
        : "Servicio";

      itemsCobrables.push({
        id: cargo.id,
        tipo: "cargo",
        nombre: `Servicio: ${cargo.categoria.nombre}${cargo.descripcion ? ` (${cargo.descripcion})` : ""}`,
        sujeto,
        binomioId: cargo.binomioId || undefined,
        jineteId: cargo.jineteId || cargo.binomio?.jineteId || undefined,
        clubId: cargo.clubId || cargo.caballo?.clubId || cargo.jinete?.clubId || undefined,
        monto: cargo.montoClp,
        pagado,
        saldo,
        creadoEn: cargo.creadoEn.toISOString(),
      });
    }
  }

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Asignar Saldo Disponible"
        volverHref="/inscripciones?pestana=por-asignar"
      />
      <AsignarVista
        movimiento={movimiento}
        saldoDisponible={saldoDisponible}
        itemsCobrables={itemsCobrables}
        binomios={binomios}
        jinetes={jinetes}
        clubes={clubes}
      />
    </>
  );
}
