import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FichaContraparte } from "./ficha-contraparte";
import { obtenerContraparteDetalle } from "@/dominio/organizacion/contrapartes";

export const metadata = {
  title: "Ficha de Contraparte · Tesorería",
  description: "Detalle, movimientos asociados y gestión de la contraparte",
};

export default async function DetalleContrapartePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await obtenerContexto();

  const contraparte = await obtenerContraparteDetalle(id);
  if (!contraparte) {
    redirect("/contrapartes");
  }

  // Obtener otras contrapartes activas para el modal de fusión
  const rawOtras = await db(ctx).contraparte.findMany({
    where: {
      id: { not: id },
      activa: true,
    },
    select: {
      id: true,
      nombre: true,
      rut: true,
    },
    orderBy: { nombre: "asc" },
  });

  const esAdministrador = ctx.rol === "administrador";
  const esObservador = ctx.rol === "observador";

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo={contraparte.nombre}
        volverHref="/contrapartes"
      />

      <FichaContraparte
        contraparte={contraparte}
        otrasContrapartes={rawOtras}
        esAdministrador={esAdministrador}
        esObservador={esObservador}
      />
    </>
  );
}
