import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { listarAuditoria } from "@/dominio/movimientos/acciones";
import { VistaAuditoria } from "./vista-auditoria";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    usuarioId?: string;
    entidad?: string;
    accion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }>;
}) {
  const ctx = await obtenerContexto();

  if (!puede(ctx, "ver_auditoria")) {
    redirect("/sin-permiso");
  }

  const params = await searchParams;

  const registros = await listarAuditoria(ctx, {
    usuarioId: params.usuarioId,
    entidad: params.entidad,
    accion: params.accion,
    fechaDesde: params.fechaDesde,
    fechaHasta: params.fechaHasta,
  });

  const usuarios = await db(ctx).usuario.findMany({
    select: { id: true, nombre: true, correo: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <VistaAuditoria
        registros={registros}
        usuarios={usuarios}
        filtrosActuales={{
          usuarioId: params.usuarioId,
          entidad: params.entidad,
          accion: params.accion,
          fechaDesde: params.fechaDesde,
          fechaHasta: params.fechaHasta,
        }}
      />
    </div>
  );
}
