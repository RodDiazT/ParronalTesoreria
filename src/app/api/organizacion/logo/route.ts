import path from "node:path";
import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { obtenerContexto, db } from "@/lib/contexto";

/**
 * Route handler para servir el logo del club solo a usuarios autenticados con membresía activa.
 * (docs/organizacion/organizacion-evento.md §3.3 y §5.4)
 */
export async function GET() {
  try {
    const ctx = await obtenerContexto();

    const org = await db(ctx).organizacion.findUnique({
      where: { id: ctx.organizacionId },
      select: {
        logoRuta: true,
        logoTipoMime: true,
      },
    });

    if (!org || !org.logoRuta) {
      return new NextResponse(null, { status: 404 });
    }

    const rutaBase = path.resolve(process.env.RUTA_RESPALDOS || "./scratch/respaldos");
    const rutaArchivo = path.join(rutaBase, org.logoRuta);

    try {
      const buffer = await fs.readFile(rutaArchivo);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": org.logoTipoMime || "image/png",
          "Cache-Control": "private, max-age=3600, must-revalidate",
        },
      });
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  } catch {
    return new NextResponse(null, { status: 401 });
  }
}
