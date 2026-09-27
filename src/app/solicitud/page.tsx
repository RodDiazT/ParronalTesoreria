import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AVISO_PRIVACIDAD_VERSION } from "@/lib/contexto";
import { obtenerDatosSolicitud } from "@/dominio/acceso/acciones";
import { FormularioSolicitud } from "./formulario-solicitud";

export const metadata = {
  title: "Solicitud de Acceso · Tesorería",
  description: "Solicitud de acceso para nuevos miembros del equipo de tesorería",
};

export default async function SolicitudPage() {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/ingresar");
  }

  const usuario = await obtenerDatosSolicitud(session.user.id);

  if (!usuario) {
    redirect("/ingresar");
  }

  // Verificar aviso de privacidad primero
  if (
    !usuario.avisoAceptadoEn ||
    usuario.avisoVersion !== AVISO_PRIVACIDAD_VERSION
  ) {
    redirect("/bienvenida");
  }

  // Si ya tiene membresía activa con rol, enviar al inicio
  const membresiaActiva = usuario.membresias.find(
    (m) => m.estado === "activa" && m.rol !== null
  );
  if (membresiaActiva) {
    redirect("/");
  }

  // Determinar estado de membresía existente
  const membresia = usuario.membresias[0];
  let estado: "ninguna" | "solicitada" | "revocada" = "ninguna";

  if (membresia) {
    if (membresia.estado === "solicitada") {
      estado = "solicitada";
    } else if (membresia.estado === "revocada") {
      estado = "revocada";
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-fondo">
      <FormularioSolicitud
        estadoMembresia={estado}
        fechaSolicitud={membresia?.solicitadaEn}
        mensajeAnterior={membresia?.mensajeSolicitud}
      />
    </main>
  );
}
