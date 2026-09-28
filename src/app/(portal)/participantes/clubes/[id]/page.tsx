import { notFound } from "next/navigation";
import { obtenerContexto } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FichaClub } from "./ficha-club";
import { ejecutarObtenerFichaClub } from "@/dominio/inscripciones/participantes/consultas";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: "Ficha de Club · Tesorería",
    description: `Ficha del club ${id}`,
  };
}

export default async function FichaClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await obtenerContexto();
  const { id } = await params;

  const club = await ejecutarObtenerFichaClub(ctx, id);
  if (!club) {
    notFound();
  }

  let estadoCuentaDatos = null;
  if (ctx.evento && ctx.rol !== "observador") {
    try {
      const { estadoCuenta } = await import("@/dominio/inscripciones/binomios/consultas");
      estadoCuentaDatos = await estadoCuenta(ctx, { clubId: id });
    } catch {
      // Ignorar si no hay inscripciones
    }
  }

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo={club.nombre}
        volverHref="/participantes?pestana=clubes"
      />

      <FichaClub club={club} rol={ctx.rol} estadoCuentaDatos={estadoCuentaDatos} />
    </>
  );
}

