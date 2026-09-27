import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { exigir } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FormularioOrganizacion } from "./formulario-organizacion";

export const metadata = {
  title: "Club y Organización · Tesorería",
  description: "Configuración del nombre y logo del club",
};

export default async function ConfiguracionOrganizacionPage() {
  const ctx = await obtenerContexto();

  try {
    exigir(ctx, "configurar");
  } catch {
    redirect("/sin-permiso");
  }

  const organizacion = await db(ctx).organizacion.findUnique({
    where: { id: ctx.organizacionId },
  });

  if (!organizacion) {
    redirect("/configuracion");
  }

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Club y Organización"
        volverHref="/configuracion"
      />

      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-texto">Datos del club</h2>
          <p className="text-xs text-texto-suave mt-0.5">
            Identificación de la entidad titular del evento.
          </p>
        </div>

        <FormularioOrganizacion
          organizacion={{
            id: organizacion.id,
            nombre: organizacion.nombre,
            logoRuta: organizacion.logoRuta,
            version: organizacion.version,
          }}
        />
      </div>
    </>
  );
}
