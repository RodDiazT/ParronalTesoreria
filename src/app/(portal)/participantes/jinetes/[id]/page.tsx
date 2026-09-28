import { notFound } from "next/navigation";
import { obtenerContexto } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FichaJinete } from "./ficha-jinete";
import { ejecutarObtenerFichaJinete } from "@/dominio/inscripciones/participantes/consultas";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: "Ficha de Jinete · Tesorería",
    description: `Ficha y datos del jinete ${id}`,
  };
}

export default async function FichaJinetePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await obtenerContexto();
  const { id } = await params;

  const jinete = await ejecutarObtenerFichaJinete(ctx, id);
  if (!jinete) {
    notFound();
  }

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo={jinete.nombre}
        volverHref="/participantes?pestana=jinetes"
      />

      <FichaJinete jinete={jinete} rol={ctx.rol} />
    </>
  );
}
