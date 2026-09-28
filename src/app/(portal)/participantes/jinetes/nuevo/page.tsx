import { redirect } from "next/navigation";
import { obtenerContexto } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FormularioJinete } from "./formulario-jinete";

export const metadata = {
  title: "Nuevo Jinete · Tesorería",
  description: "Registrar un jinete o amazona",
};

export default async function NuevoJinetePage() {
  const ctx = await obtenerContexto();

  if (ctx.rol === "observador") {
    redirect("/participantes");
  }

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Nuevo Jinete"
        volverHref="/participantes"
      />

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-texto">Ficha de Inscripción</h2>
          <p className="text-xs text-texto-suave mt-0.5">
            Registra los datos del jinete. Si es menor de edad, podrás vincular sus apoderados.
          </p>
        </div>

        <FormularioJinete evento={ctx.evento} />
      </div>
    </>
  );
}
