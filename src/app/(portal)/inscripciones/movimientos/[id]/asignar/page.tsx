import { notFound, redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { exigir, puede } from "@/lib/permisos";
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
          cargo: { include: { concepto: true } },
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

  const [inscripcionesRaw, cargosRaw, binomios, jinetes, clubes] = await Promise.all([
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
    db(ctx).cargo.findMany({
      where: {
        organizacionId: ctx.organizacionId,
        eventoId: ctx.evento.id,
        anulado: false,
        retirado: false,
      },
      include: {
        concepto: true,
        binomio: {
          include: {
            jinete: true,
            caballo: true,
            club: true,
          },
        },
        jinete: { include: { club: true } },
        club: true,
        pagos: {
          where: { anulado: false },
        },
      },
      orderBy: { creadoEn: "asc" },
    }),
    db(ctx).binomio.findMany({
      where: { organizacionId: ctx.organizacionId, eventoId: ctx.evento.id, anulado: false },
      include: { jinete: true, caballo: true, club: true },
      orderBy: { jinete: { nombre: "asc" } },
    }),
    db(ctx).jinete.findMany({
      where: { organizacionId: ctx.organizacionId, activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    db(ctx).club.findMany({
      where: { organizacionId: ctx.organizacionId, activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const itemsCobrables: any[] = [];

  for (const ins of inscripcionesRaw) {
    const calc = estadoItem(ins, ins.pagos);
    if (calc.saldo > 0) {
      itemsCobrables.push({
        id: ins.id,
        tipo: "inscripcion",
        nombre: ins.prueba.nombre,
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

  for (const c of cargosRaw) {
    const calc = estadoItem(c, c.pagos);
    if (calc.saldo > 0) {
      let sujeto = "";
      if (c.binomio) {
        sujeto = `${c.binomio.jinete.nombre} / ${c.binomio.caballo.nombre}`;
      } else if (c.jinete) {
        sujeto = c.jinete.nombre;
      } else if (c.club) {
        sujeto = c.club.nombre;
      }

      itemsCobrables.push({
        id: c.id,
        tipo: "cargo",
        nombre: c.concepto.nombre,
        sujeto,
        binomioId: c.binomioId || undefined,
        jineteId: c.jineteId || c.binomio?.jineteId || undefined,
        clubId: c.clubId || c.binomio?.clubId || c.jinete?.clubId || undefined,
        monto: calc.monto,
        pagado: calc.pagado,
        saldo: calc.saldo,
        creadoEn: c.creadoEn.toISOString(),
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
