import { notFound } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FichaCaballo } from "./ficha-caballo";
import { ejecutarObtenerFichaCaballo } from "@/dominio/inscripciones/participantes/consultas";
import { obtenerCargosPorSujeto } from "@/dominio/servicios/cargos";

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

  const [caballo, cargos, categoriasServicio] = await Promise.all([
    ejecutarObtenerFichaCaballo(ctx, id),
    obtenerCargosPorSujeto(ctx, { caballoId: id }),
    db(ctx).categoria.findMany({
      where: {
        organizacionId: ctx.organizacionId,
        activa: true,
        tipo: "ingreso",
        sujetoAsociado: "caballo",
      },
      select: {
        id: true,
        nombre: true,
        tarifaBaseClp: true,
      },
      orderBy: { orden: "asc" },
    }),
  ]);

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

      <FichaCaballo
        caballo={caballo}
        rol={ctx.rol}
        cargos={cargos}
        categoriasServicio={categoriasServicio}
      />
    </>
  );
}
