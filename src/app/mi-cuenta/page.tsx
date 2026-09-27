import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { obtenerDatosMiCuenta } from "@/dominio/acceso/acciones";
import { NavegacionSimple } from "@/components/app/navegacion-simple";
import { ChipEstado } from "@/components/app/estado";
import { formatearFecha } from "@/lib/presentacion/formato";
import { AccionesCuenta } from "./acciones-cuenta";

export const metadata = {
  title: "Mi Cuenta · Tesorería",
  description: "Perfil y configuración de cuenta del usuario",
};

export default async function MiCuentaPage() {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/ingresar");
  }

  const usuario = await obtenerDatosMiCuenta(session.user.id);

  if (!usuario) {
    redirect("/ingresar");
  }

  const membresiaActiva = usuario.membresias[0];

  return (
    <div className="min-h-screen bg-fondo text-texto">
      <NavegacionSimple
        titulo="Mi cuenta"
        subtitulo={membresiaActiva?.organizacion?.nombre || "Portal de tesorería"}
        volverHref="/"
        rol={membresiaActiva?.rol ?? undefined}
      />

      <main className="mx-auto max-w-md p-4 sm:p-6 pb-24 space-y-6">
        {/* Tarjeta de Perfil Google */}
        <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-4">
            {usuario.imagen ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={usuario.imagen}
                alt=""
                className="h-14 w-14 rounded-full border border-borde object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-acento text-sobre-acento font-bold text-lg">
                {usuario.nombre?.[0] || usuario.correo[0].toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-texto">
                {usuario.nombre || "Usuario"}
              </h2>
              <p className="text-xs text-texto-suave font-mono mt-0.5">
                {usuario.correo}
              </p>
              <div className="mt-2">
                {membresiaActiva ? (
                  <ChipEstado
                    tono={
                      membresiaActiva.rol === "administrador"
                        ? "listo"
                        : membresiaActiva.rol === "ayudante"
                        ? "falta"
                        : "fuera"
                    }
                    texto={
                      membresiaActiva.rol === "administrador"
                        ? "Administrador"
                        : membresiaActiva.rol === "ayudante"
                        ? "Ayudante"
                        : "Observador"
                    }
                  />
                ) : (
                  <ChipEstado tono="fuera" texto="Sin acceso" />
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-texto-suave pt-2 border-t border-borde">
            El nombre y la foto provienen de tu cuenta de Google y se actualizan al iniciar sesión.
          </div>
        </div>

        {/* Estado del Aviso de Privacidad */}
        <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-texto uppercase tracking-wider">
            Aviso de Privacidad y Consentimiento
          </h3>

          <div className="space-y-1 text-xs">
            <p className="text-texto-suave">
              <span className="font-semibold text-texto">Estado: </span>
              {usuario.avisoAceptadoEn
                ? `Aceptado el ${formatearFecha(usuario.avisoAceptadoEn, "larga")} (Versión ${usuario.avisoVersion})`
                : "No registrado"}
            </p>
            <p className="text-texto-suave">
              Tus datos son tratados conforme a la Ley 19.628 y la Ley 21.719.
            </p>
          </div>

          <div className="pt-1">
            <Link
              href="/privacidad"
              className="text-xs font-medium text-acento underline underline-offset-4 hover:opacity-80 transition-opacity"
            >
              Leer aviso de privacidad completo →
            </Link>
          </div>
        </div>

        {/* Acciones de Cuenta */}
        <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-texto uppercase tracking-wider">
            Sesión y Privacidad
          </h3>
          <AccionesCuenta />
        </div>
      </main>
    </div>
  );
}
