import { notFound } from "next/navigation";
import { obtenerContexto } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FichaCaballo } from "./ficha-caballo";
import { ejecutarObtenerFichaCaballo } from "@/dominio/inscripciones/participantes/consultas";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: "Ficha de Caballo · Tesorería",
    description: `Ficha del caballo ${id}`,
  };
}

export default async function FichaCaballoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await obtenerContexto();
  const { id } = await params;

  const caballo = await ejecutarObtenerFichaCaballo(ctx, id);
  if (!caballo) {
    notFound();
  }

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo={caballo.nombre}
        volverHref="/participantes?pestana=caballos"
      />

      <FichaCaballo caballo={caballo} rol={ctx.rol} />
    </>
  );
}
