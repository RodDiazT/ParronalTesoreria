import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { listarMovimientos } from "@/dominio/movimientos/acciones";
import { ListaMovimientos } from "./lista-movimientos";

export const dynamic = "force-dynamic";

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{
    pestana?: string;
    tipo?: "ingreso" | "gasto";
    categoriaId?: string;
    contraparteId?: string;
    medioPago?: "transferencia" | "efectivo" | "otro";
    fechaDesde?: string;
    fechaHasta?: string;
    mostrarAnulados?: string;
    soloMios?: string;
    mios?: string;
    pagadoPor?: string;
    estadoPago?: "pagado" | "pendiente";
    validacion?: "validado" | "por_validar" | "observado";
    naturaleza?: "dinero" | "especie";
    caballoId?: string;
    jineteId?: string;
    clubId?: string;
    binomioId?: string;
  }>;
}) {
  const ctx = await obtenerContexto();

  const params = await searchParams;
  const pestana = (params.pestana || "todos").replace(/-/g, "_") as any;
  const mostrarAnulados = params.mostrarAnulados === "true";
  const soloMios = params.soloMios === "true" || params.mios === "1";
  const pagadoPorId = params.pagadoPor === "yo" ? ctx.usuario.id : undefined;

  const { movimientos, totales } = await listarMovimientos(ctx, {
    pestana,
    tipo: params.tipo,
    categoriaId: params.categoriaId,
    contraparteId: params.contraparteId,
    medioPago: params.medioPago,
    fechaDesde: params.fechaDesde,
    fechaHasta: params.fechaHasta,
    mostrarAnulados,
    soloMios,
    pagadoPorId,
    estadoPago: params.estadoPago,
    estadoValidacion: params.validacion,
    naturaleza: params.naturaleza,
    caballoId: params.caballoId,
    jineteId: params.jineteId,
    clubId: params.clubId,
    binomioId: params.binomioId,
  });

  const [categorias, contrapartes] = await Promise.all([
    db(ctx).categoria.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, tipo: true },
      orderBy: { orden: "asc" },
    }),
    db(ctx).contraparte.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <ListaMovimientos
        movimientos={movimientos}
        totales={totales}
        categorias={categorias}
        contrapartes={contrapartes}
        pestanaActual={pestana}
        filtrosActuales={{
          tipo: params.tipo,
          categoriaId: params.categoriaId,
          contraparteId: params.contraparteId,
          medioPago: params.medioPago,
          fechaDesde: params.fechaDesde,
          fechaHasta: params.fechaHasta,
          mostrarAnulados,
          soloMios,
          caballoId: params.caballoId,
          jineteId: params.jineteId,
          clubId: params.clubId,
          binomioId: params.binomioId,
        }}
        usuarioActual={{
          id: ctx.usuario.id,
          rol: ctx.rol,
        }}
      />
    </div>
  );
}
