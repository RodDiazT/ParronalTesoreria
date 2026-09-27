import { NextRequest, NextResponse } from "next/server";
import { obtenerContexto, db } from "@/lib/contexto";
import { puedeVerRespaldos } from "@/lib/permisos";
import { leerArchivoRespaldo } from "@/lib/archivos/almacenamiento";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await obtenerContexto();
    if (!ctx) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!puedeVerRespaldos(ctx)) {
      return NextResponse.json(
        { error: "No tienes permiso para ver archivos de respaldo." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const respaldo = await db(ctx).respaldo.findFirst({
      where: {
        id,
        organizacionId: ctx.organizacionId,
      },
    });

    if (!respaldo) {
      return NextResponse.json(
        { error: "Archivo de respaldo no encontrado." },
        { status: 404 }
      );
    }

    // Si está anulado, solo un administrador puede consultarlo
    if (respaldo.anulado && ctx.rol !== "administrador") {
      return NextResponse.json(
        { error: "El archivo de respaldo fue anulado." },
        { status: 404 }
      );
    }

    const buffer = await leerArchivoRespaldo(respaldo.ruta);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": respaldo.tipoMime,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error al servir respaldo:", error);
    return NextResponse.json(
      { error: "Error interno al recuperar el archivo." },
      { status: 500 }
    );
  }
}
