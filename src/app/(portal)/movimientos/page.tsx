import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { listarMovimientos } from "@/dominio/movimientos/acciones";
import { ListaMovimientos } from "./lista-movimientos";

export const dynamic = "force-dynamic";

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{
    pestana?: "todos" | "por_validar" | "observados" | "por_cobrar" | "por_pagar" | "sin_respaldo" | "sin_identificar";
    tipo?: "ingreso" | "gasto";
    categoriaId?: string;
    contraparteId?: string;
    medioPago?: "transferencia" | "efectivo" | "otro";
    fechaDesde?: string;
    fechaHasta?: string;
    mostrarAnulados?: string;
    soloMios?: string;
  }>;
}) {
  const ctx = await obtenerContexto();

  const params = await searchParams;
  const pestana = params.pestana || "todos";
  const mostrarAnulados = params.mostrarAnulados === "true";
  const soloMios = params.soloMios === "true";

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
        }}
        usuarioActual={{
          id: ctx.usuario.id,
          rol: ctx.rol,
        }}
      />
    </div>
  );
}
