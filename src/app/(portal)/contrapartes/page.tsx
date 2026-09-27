import { obtenerContexto } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { ListaContrapartes } from "./lista-contrapartes";
import { obtenerContrapartes } from "@/dominio/organizacion/contrapartes";

export const metadata = {
  title: "Contrapartes · Tesorería",
  description: "Directorio de proveedores, auspiciadores y terceros",
};

export default async function ContrapartesPage() {
  const ctx = await obtenerContexto();

  const contrapartes = await obtenerContrapartes({ estado: "todas" });

  const puedeCrear = ctx.rol !== "observador";
  const esObservador = ctx.rol === "observador";

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Contrapartes"
        volverHref="/"
      />

      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-texto">Terceros y proveedores</h2>
          <p className="text-xs text-texto-suave mt-0.5">
            Auspiciadores, proveedores y destinatarios de movimientos del concurso.
          </p>
        </div>

        <ListaContrapartes
          contrapartesIniciales={contrapartes}
          puedeCrear={puedeCrear}
          esObservador={esObservador}
        />
      </div>
    </>
  );
}
