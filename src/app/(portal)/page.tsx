import Link from "next/link";
import { obtenerContexto, db } from "@/lib/contexto";
import { ChipEstado } from "@/components/app/estado";

export const metadata = {
  title: "Inicio · Tesorería",
  description: "Portal de tesorería del concurso ecuestre",
};

export default async function HomePage() {
  const ctx = await obtenerContexto();

  // Uso de db(ctx) para garantizar aislamiento por organización
  const solicitudesPendientes =
    ctx.rol === "administrador"
      ? await db(ctx).membresia.count({
          where: { estado: "solicitada" },
        })
      : 0;

  return (
    <div className="space-y-6">
      {/* Tarjeta de Bienvenida y Estado */}
      <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-texto">
            Hola, {ctx.usuario.nombre || "Usuario"}
          </h2>
          <ChipEstado
            tono={
              ctx.rol === "administrador"
                ? "listo"
                : ctx.rol === "ayudante"
                ? "falta"
                : "fuera"
            }
            texto={
              ctx.rol === "administrador"
                ? "Administrador"
                : ctx.rol === "ayudante"
                ? "Ayudante"
                : "Observador"
            }
          />
        </div>
        <p className="text-xs text-texto-suave leading-relaxed">
          Bienvenido al portal de tesorería del evento{" "}
          <span className="font-semibold text-texto">{ctx.evento?.nombre}</span>.
        </p>
      </div>

      {/* Acceso Rápido según Rol */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-texto uppercase tracking-wider">
          Accesos de Gestión
        </h3>

        <div className="grid gap-3">
          {ctx.rol === "administrador" && (
            <Link
              href="/usuarios"
              className="flex items-center justify-between rounded-2xl border border-borde bg-superficie p-4 hover:border-acento transition-colors shadow-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-texto">Gestión de Usuarios</span>
                  {solicitudesPendientes > 0 && (
                    <span className="rounded-full bg-falta-fondo px-2 py-0.5 text-[10px] font-bold text-falta-texto">
                      {solicitudesPendientes} pendientes
                    </span>
                  )}
                </div>
                <p className="text-xs text-texto-suave mt-0.5">
                  Aprobar solicitudes, invitar miembros y administrar roles
                </p>
              </div>
              <span className="text-texto-suave text-lg font-light">›</span>
            </Link>
          )}

          {ctx.rol === "administrador" && (
            <Link
              href="/configuracion"
              className="flex items-center justify-between rounded-2xl border border-borde bg-superficie p-4 hover:border-acento transition-colors shadow-xs"
            >
              <div>
                <span className="text-sm font-semibold text-texto">Configuración</span>
                <p className="text-xs text-texto-suave mt-0.5">
                  Ajustar evento, organización y categorías
                </p>
              </div>
              <span className="text-texto-suave text-lg font-light">›</span>
            </Link>
          )}

          <Link
            href="/contrapartes"
            className="flex items-center justify-between rounded-2xl border border-borde bg-superficie p-4 hover:border-acento transition-colors shadow-xs"
          >
            <div>
              <span className="text-sm font-semibold text-texto">Contrapartes</span>
              <p className="text-xs text-texto-suave mt-0.5">
                Proveedores, auspiciadores y terceros
              </p>
            </div>
            <span className="text-texto-suave text-lg font-light">›</span>
          </Link>

          <Link
            href="/comision"
            className="flex items-center justify-between rounded-2xl border border-borde bg-superficie p-4 hover:border-acento transition-colors shadow-xs"
          >
            <div>
              <span className="text-sm font-semibold text-texto">Equipo Comisión</span>
              <p className="text-xs text-texto-suave mt-0.5">
                Ver miembros activos de la tesorería del evento
              </p>
            </div>
            <span className="text-texto-suave text-lg font-light">›</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
