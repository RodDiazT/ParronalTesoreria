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

    const traspaso = await db(ctx).traspaso.findFirst({
      where: {
        id,
        organizacionId: ctx.organizacionId,
      },
    });

    if (!traspaso || !traspaso.archivoRuta) {
      return NextResponse.json(
        { error: "Comprobante de traspaso no encontrado." },
        { status: 404 }
      );
    }

    // Si está anulado, solo un administrador puede consultarlo
    if (traspaso.anulado && ctx.rol !== "administrador") {
      return NextResponse.json(
        { error: "El comprobante pertenece a un traspaso anulado." },
        { status: 404 }
      );
    }

    const buffer = await leerArchivoRespaldo(traspaso.archivoRuta);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": traspaso.archivoTipoMime || "application/octet-stream",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error al servir comprobante de traspaso:", error);
    return NextResponse.json(
      { error: "Error interno al recuperar el archivo." },
      { status: 500 }
    );
  }
}
