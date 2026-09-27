import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { obtenerExportacionDatos } from "@/dominio/acceso/acciones";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("No autenticado", { status: 401 });
  }

  const usuario = await obtenerExportacionDatos(session.user.id);

  if (!usuario) {
    return new NextResponse("Usuario no encontrado", { status: 404 });
  }

  const exportacion = {
    formato: "Portabilidad de Datos Personales (Ley 19.628 / 21.719)",
    descargadoEn: new Date().toISOString(),
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      avisoVersion: usuario.avisoVersion,
      avisoAceptadoEn: usuario.avisoAceptadoEn,
      ultimoIngresoEn: usuario.ultimoIngresoEn,
      creadoEn: usuario.creadoEn,
    },
    membresias: usuario.membresias.map((m) => ({
      organizacion: m.organizacion.nombre,
      rol: m.rol,
      estado: m.estado,
      solicitadaEn: m.solicitadaEn,
      aprobadaEn: m.aprobadaEn,
      revocadaEn: m.revocadaEn,
      creadoEn: m.creadoEn,
    })),
  };

  const jsonString = JSON.stringify(exportacion, null, 2);

  return new NextResponse(jsonString, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mis-datos-tesoreria.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
