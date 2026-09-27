import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AVISO_PRIVACIDAD_VERSION } from "@/lib/contexto";
import { obtenerUsuarioParaBienvenida } from "@/dominio/acceso/acciones";
import { FormularioBienvenida } from "./formulario-bienvenida";

export const metadata = {
  title: "Bienvenida · Tesorería",
  description: "Aceptación de aviso de privacidad para usuarios del portal de tesorería",
};

export default async function BienvenidaPage() {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/ingresar");
  }

  const usuario = await obtenerUsuarioParaBienvenida(session.user.id);

  if (!usuario) {
    redirect("/ingresar");
  }

  // Si ya aceptó la versión vigente, no debe volver a aceptar
  if (
    usuario.avisoAceptadoEn &&
    usuario.avisoVersion === AVISO_PRIVACIDAD_VERSION
  ) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-fondo">
      <FormularioBienvenida nombre={usuario.nombre} />
    </main>
  );
}
