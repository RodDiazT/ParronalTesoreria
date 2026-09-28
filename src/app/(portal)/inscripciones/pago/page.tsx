import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FormularioPagoInscripcion } from "./formulario-pago";
import { estadoItem } from "@/dominio/inscripciones/binomios/reglas";

export const metadata = {
  title: "Registrar Pago · Tesorería",
  description: "Formulario de recaudación de inscripciones con reparto automático",
};

export default async function PagoInscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ binomioId?: string; jineteId?: string; clubId?: string }>;
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

  const params = await searchParams;

  const [inscripcionesRaw, binomios, jinetes, clubes] = await Promise.all([
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
          include: { movimiento: true },
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
      select: { id: true, nombre: true, clubId: true },
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

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Registrar Pago"
        volverHref="/inscripciones"
      />
      <FormularioPagoInscripcion
        itemsCobrables={itemsCobrables}
        binomios={binomios}
        jinetes={jinetes}
        clubes={clubes}
        preseleccion={{
          binomioId: params.binomioId,
          jineteId: params.jineteId,
          clubId: params.clubId,
        }}
      />
    </>
  );
}
