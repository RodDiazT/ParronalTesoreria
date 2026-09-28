import { obtenerContexto } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { ListaParticipantes } from "./lista-participantes";
import { ejecutarListarParticipantes } from "@/dominio/inscripciones/participantes/consultas";

export const metadata = {
  title: "Participantes · Tesorería",
  description: "Directorio de jinetes, caballos, clubes y apoderados",
};

export default async function ParticipantesPage({
  searchParams,
}: {
  searchParams: Promise<{ pestana?: string; conAlertas?: string }>;
}) {
  const ctx = await obtenerContexto();
  const params = await searchParams;

  // Consultar todas las listas para la vista inicial
  const datosJinetes = await ejecutarListarParticipantes(ctx, {
    pestana: "jinetes",
    soloActivos: false,
  });
  const datosCaballos = await ejecutarListarParticipantes(ctx, {
    pestana: "caballos",
    soloActivos: false,
  });
  const datosClubes = await ejecutarListarParticipantes(ctx, {
    pestana: "clubes",
    soloActivos: false,
  });

  let apoderados: any[] = [];
  if (ctx.rol !== "observador") {
    try {
      const datosApoderados = await ejecutarListarParticipantes(ctx, {
        pestana: "apoderados",
        soloActivos: false,
      });
      apoderados = datosApoderados.apoderados || [];
    } catch {
      // Ignorar si observador
    }
  }

  const pestanaValida =
    params.pestana === "caballos" ||
    params.pestana === "clubes" ||
    (params.pestana === "apoderados" && ctx.rol !== "observador")
      ? params.pestana
      : "jinetes";

  return (
    <>
      <ConfigurarEstructura modo="detalle" titulo="Participantes" volverHref="/" />

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-texto">Directorio del Concurso</h2>
          <p className="text-xs text-texto-suave mt-0.5">
            Registro unificado de jinetes, animales, clubes y apoderados.
          </p>
        </div>

        <ListaParticipantes
          jinetesIniciales={datosJinetes.jinetes || []}
          caballosIniciales={datosCaballos.caballos || []}
          clubesIniciales={datosClubes.clubes || []}
          apoderadosIniciales={apoderados}
          contadorAlertasInicial={datosJinetes.contadorConAlertas}
          rol={ctx.rol}
          pestanaInicial={pestanaValida}
        />
      </div>
    </>
  );
}
