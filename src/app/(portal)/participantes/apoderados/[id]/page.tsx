import { notFound, redirect } from "next/navigation";
import { obtenerContexto } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FichaApoderado } from "./ficha-apoderado";
import { ejecutarObtenerFichaApoderado } from "@/dominio/inscripciones/participantes/consultas";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: "Ficha de Apoderado · Tesorería",
    description: `Ficha del apoderado ${id}`,
  };
}

export default async function FichaApoderadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await obtenerContexto();
  if (ctx.rol === "observador") {
    redirect("/sin-permiso");
  }

  const { id } = await params;

  const apoderado = await ejecutarObtenerFichaApoderado(ctx, id);
  if (!apoderado) {
    notFound();
  }

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo={apoderado.nombre}
        volverHref="/participantes?pestana=apoderados"
      />

      <FichaApoderado apoderado={apoderado} rol={ctx.rol} />
    </>
  );
}
