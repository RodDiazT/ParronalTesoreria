import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { FormularioMovimiento } from "./formulario-movimiento";

export const dynamic = "force-dynamic";

export default async function NuevoMovimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const ctx = await obtenerContexto();

  if (!puede(ctx, "registrar")) {
    redirect("/sin-permiso");
  }

  const { tipo } = await searchParams;
  const tipoInicial = tipo === "ingreso" ? "ingreso" : "gasto";

  // Cargar miembros activos para la selección de reembolso por administradores
  const miembrosActivos =
    ctx.rol === "administrador"
      ? await db(ctx).membresia.findMany({
          where: { estado: "activa" },
          include: { usuario: { select: { id: true, nombre: true, correo: true } } },
          orderBy: { usuario: { nombre: "asc" } },
        })
      : [];

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <h1 className="text-xl font-bold text-stone-900">
          Registrar {tipoInicial === "gasto" ? "Gasto" : "Ingreso"}
        </h1>
        <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 font-medium">
          Evento: {ctx.evento?.nombre || "Vigente"}
        </span>
      </div>

      <FormularioMovimiento
        tipoInicial={tipoInicial}
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
