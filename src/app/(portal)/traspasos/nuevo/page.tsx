import { redirect } from "next/navigation";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { FormularioTraspaso } from "./formulario-traspaso";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nuevo Traspaso · Tesorería",
  description: "Registrar traspaso entre Banco y Efectivo",
};

export default async function NuevoTraspasoPage() {
  const ctx = await obtenerContexto();

  if (!puede(ctx, "registrar_traspaso")) {
    redirect("/sin-permiso");
  }

  if (!ctx.evento) {
    redirect("/");
  }

  return (
    <>
      <ConfigurarEstructura modo="detalle" titulo="Nuevo Traspaso" volverHref="/traspasos" />

      <div className="max-w-xl mx-auto px-4 py-6">
        <FormularioTraspaso />
      </div>
    </>
  );
}
