import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { FormularioMovimiento } from "./formulario-movimiento";
import { estadoItem } from "@/dominio/inscripciones/binomios/reglas";

export const dynamic = "force-dynamic";

export default async function NuevoMovimientoPage({
  searchParams,
}: {
  searchParams: Promise<{
    tipo?: string;
    categoria?: string;
    binomioId?: string;
    jineteId?: string;
    clubId?: string;
  }>;
}) {
  const ctx = await obtenerContexto();

  if (!puede(ctx, "registrar")) {
    redirect("/sin-permiso");
  }

  const { tipo, categoria, binomioId, jineteId, clubId } = await searchParams;
  const tipoInicial = tipo === "gasto" ? "gasto" : "ingreso";

  // Cargar miembros activos para la selección de reembolso por administradores
  const miembrosActivos =
    ctx.rol === "administrador"
      ? await db(ctx).membresia.findMany({
          where: { estado: "activa" },
          include: { usuario: { select: { id: true, nombre: true, correo: true } } },
          orderBy: { usuario: { nombre: "asc" } },
        })
      : [];

  const categoriasRaw = await db(ctx).categoria.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      activa: true,
      OR: [
        { claveSistema: null },
        { claveSistema: { not: "devoluciones" } },
      ],
    },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      exigeContraparte: true,
      sujetoAsociado: true,
      exigeSujeto: true,
      claveSistema: true,
      orden: true,
    },
    orderBy: { orden: "asc" },
  });

  const categorias = categoriasRaw.map((c) => {
    if (c.claveSistema === "inscripciones") {
      return {
        ...c,
        sujetoAsociado: c.sujetoAsociado || "binomio_prueba",
        exigeSujeto: c.exigeSujeto ?? true,
      };
    }
    return c;
  });

  let itemsCobrables: any[] = [];
  let binomios: any[] = [];
  let jinetes: any[] = [];
  let clubes: any[] = [];
  let caballos: any[] = [];
  let pruebas: any[] = [];

  if (ctx.evento) {
    const [inscripcionesRaw, binomiosData, jinetesData, clubesData, caballosData, pruebasData] = await Promise.all([
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
      db(ctx).caballo.findMany({
        where: { organizacionId: ctx.organizacionId, activo: true },
        select: { id: true, nombre: true, clubId: true },
        orderBy: { nombre: "asc" },
      }),
      db(ctx).prueba.findMany({
        where: { eventoId: ctx.evento.id, activa: true },
        select: { id: true, nombre: true, tarifaClp: true },
        orderBy: { orden: "asc" },
      }),
    ]);

    binomios = binomiosData;
    jinetes = jinetesData;
    clubes = clubesData;
    caballos = caballosData;
    pruebas = pruebasData;

    for (const ins of inscripcionesRaw) {
      const calc = estadoItem(
        {
          id: ins.id,
          montoClp: ins.prueba.tarifaClp,
          anulado: ins.anulado,
          retirado: ins.retirado,
        },
        ins.pagos
      );
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
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <h1 className="text-xl font-bold text-stone-900">
          Registrar Movimiento
        </h1>
        <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 font-medium">
          Evento: {ctx.evento?.nombre || "Vigente"}
        </span>
      </div>

      <FormularioMovimiento
        tipoInicial={tipoInicial}
        categoriaInicialClave={categoria}
        preseleccion={{
          binomioId,
          jineteId,
          clubId,
        }}
        itemsCobrables={itemsCobrables}
        binomios={binomios}
        jinetes={jinetes}
        clubes={clubes}
        caballos={caballos}
        pruebas={pruebas}
        categorias={categorias}
        usuarioActual={{
          id: ctx.usuario.id,
          nombre: ctx.usuario.nombre || "Yo",
          rol: ctx.rol,
        }}
        miembrosComision={miembrosActivos.map((m) => ({
          id: m.usuario.id,
          nombre: m.usuario.nombre || m.usuario.correo,
        }))}
      />
    </div>
  );
}
