import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { obtenerDatosMiCuenta } from "@/dominio/acceso/acciones";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { formatearFecha } from "@/lib/presentacion/formato";
import { AccionesCuenta } from "./acciones-cuenta";
import { PerfilUsuario } from "./perfil-usuario";

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
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Mi cuenta"
        volverHref="/"
      />

      <div className="space-y-6">
        {/* Tarjeta de Perfil editable */}
        <PerfilUsuario
          usuario={usuario}
          membresiaActiva={membresiaActiva}
        />

        {/* Información de Cumplimiento y Privacidad */}
        <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-texto uppercase tracking-wider">
            Privacidad y Consentimiento
          </h3>
          <div className="text-xs text-texto-suave space-y-2">
            <p>
              Consentimiento informado registrado bajo la Ley 19.628 y Ley 21.719.
            </p>
            {usuario.avisoAceptadoEn ? (
              <div className="flex items-center gap-2 pt-1 text-texto">
                <span className="inline-block h-2 w-2 rounded-full bg-listo-texto" />
                <span>
                  Aceptado el {formatearFecha(usuario.avisoAceptadoEn, "larga-hora")}
                </span>
              </div>
            ) : (
              <div className="text-falta-texto font-medium">
                Aviso pendiente de aceptación
              </div>
            )}
          </div>
        </div>

        {/* Acciones de Sesión y Datos */}
        <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-texto uppercase tracking-wider">
            Gestión de Sesión
          </h3>
          <AccionesCuenta />
        </div>
      </div>
    </>
  );
}
