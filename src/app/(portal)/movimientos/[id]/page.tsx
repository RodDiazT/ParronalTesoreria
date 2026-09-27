import { notFound, redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { obtenerMovimiento, lineaDeTiempo } from "@/dominio/movimientos/acciones";
import { FichaMovimiento } from "./ficha-movimiento";

export const dynamic = "force-dynamic";

export default async function DetalleMovimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await obtenerContexto();
  const { id } = await params;

  const movimiento = await obtenerMovimiento(ctx, id);
  if (!movimiento) {
    notFound();
  }

  const eventosAuditoria = await lineaDeTiempo(ctx, "Movimiento", id);

  const [categorias, contrapartes] = await Promise.all([
    db(ctx).categoria.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, tipo: true, exigeContraparte: true, claveSistema: true },
      orderBy: { orden: "asc" },
    }),
    db(ctx).contraparte.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <FichaMovimiento
        movimiento={movimiento}
        eventosAuditoria={eventosAuditoria}
        categorias={categorias}
        contrapartes={contrapartes}
        usuarioActual={{
          id: ctx.usuario.id,
          rol: ctx.rol,
        }}
      />
    </div>
  );
}
