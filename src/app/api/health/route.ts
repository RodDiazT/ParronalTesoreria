import { NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports -- Endpoint de infraestructura sin sesión de usuario para probar conectividad directa a Postgres
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Endpoint de verificación de salud para Railway y monitorización de uptime.
 * Valida la conectividad con la base de datos PostgreSQL.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "conectado",
      uptime: Math.floor(process.uptime()),
    });
  } catch (error: any) {
    console.error("Healthcheck error al conectar a la base de datos:", error);
    return NextResponse.json(
      {
        status: "error",
        database: "desconectado",
        mensaje: error?.message || "Fallo de conexión con la base de datos",
      },
      { status: 503 }
    );
  }
}
