import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { exigir } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { GestorUsuarios, MembresiaDTO } from "./gestor-usuarios";

export const metadata = {
  title: "Usuarios · Tesorería",
  description: "Gestión de accesos, roles y miembros del portal",
};

export default async function UsuariosPage() {
  const ctx = await obtenerContexto();

  try {
    exigir(ctx, "gestionar_accesos");
  } catch {
    redirect("/sin-permiso");
  }

  // Uso de db(ctx) para garantizar aislamiento por organización
  const rawMembresias = await db(ctx).membresia.findMany({
    include: {
      usuario: {
        select: {
          id: true,
          correo: true,
          nombre: true,
          imagen: true,
          ultimoIngresoEn: true,
        },
      },
    },
    orderBy: [
      { estado: "asc" },
      { creadoEn: "desc" },
    ],
  });

  const membresias: MembresiaDTO[] = rawMembresias.map((m) => ({
    id: m.id,
    usuarioId: m.usuarioId,
    rol: m.rol,
    estado: m.estado,
    mensajeSolicitud: m.mensajeSolicitud,
    solicitadaEn: m.solicitadaEn,
    aprobadaEn: m.aprobadaEn,
    revocadaEn: m.revocadaEn,
    motivoRevocacion: m.motivoRevocacion,
    version: m.version,
    usuario: {
      id: m.usuario.id,
      correo: m.usuario.correo,
      nombre: m.usuario.nombre,
      imagen: m.usuario.imagen,
      ultimoIngresoEn: m.usuario.ultimoIngresoEn,
    },
  }));

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Usuarios y accesos"
        volverHref="/"
      />
      <div className="space-y-6">
        <GestorUsuarios
          membresias={membresias}
          usuarioActualId={ctx.usuario.id}
        />
      </div>
    </>
  );
}
