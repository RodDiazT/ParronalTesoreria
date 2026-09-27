import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { exigir } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { ChipEstado } from "@/components/app/estado";

export const metadata = {
  title: "Comisión · Tesorería",
  description: "Miembros activos del equipo de tesorería del concurso",
};

export default async function ComisionPage() {
  const ctx = await obtenerContexto();

  try {
    exigir(ctx, "ver_comision");
  } catch {
    redirect("/sin-permiso");
  }

  // Según docs/acceso/acceso-roles.md §3.6:
  // "Muestra solo membresías activas con usuario que ya ingresó.
  // No muestra correos, invitados sin ingreso, solicitudes ni accesos revocados."
  // Usa db(ctx) para garantizar aislamiento por organización.
  const miembrosActivos = await db(ctx).membresia.findMany({
    where: {
      estado: "activa",
      usuario: {
        ultimoIngresoEn: { not: null },
      },
    },
    select: {
      id: true,
      rol: true,
      usuario: {
        select: {
          id: true,
          nombre: true,
          imagen: true,
          // Correo NO se selecciona para observadores ni ayudantes por privacidad
        },
      },
    },
    orderBy: [
      { rol: "asc" }, // administradores primero
      { creadoEn: "asc" },
    ],
  });

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Equipo Comisión"
        volverHref="/"
      />

      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-texto">Equipo organizador</h2>
          <p className="text-xs text-texto-suave mt-0.5">
            Personas activas en la tesorería del concurso a quienes acudir durante el evento.
          </p>
        </div>

        <div className="space-y-3">
          {miembrosActivos.map((m) => {
            const esUsuarioActual = m.usuario.id === ctx.usuario.id;

            return (
              <div
                key={m.id}
                className="flex items-center justify-between p-4 rounded-2xl border border-borde bg-superficie shadow-xs"
              >
                <div className="flex items-center gap-3">
                  {m.usuario.imagen ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.usuario.imagen}
                      alt=""
                      className="h-10 w-10 rounded-full border border-borde object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-acento text-sobre-acento font-bold text-sm">
                      {m.usuario.nombre?.[0] || "U"}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-texto">
                        {m.usuario.nombre || "Usuario"}
                      </span>
                      {esUsuarioActual && (
                        <span className="text-[10px] font-bold text-texto-suave bg-borde px-1.5 py-0.2 rounded-full">
                          Tú
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-texto-suave capitalize">
                      {m.rol}
                    </span>
                  </div>
                </div>

                <ChipEstado
                  tono={
                    m.rol === "administrador"
                      ? "listo"
                      : m.rol === "ayudante"
                      ? "falta"
                      : "fuera"
                  }
                  texto={
                    m.rol === "administrador"
                      ? "Administrador"
                      : m.rol === "ayudante"
                      ? "Ayudante"
                      : "Observador"
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
