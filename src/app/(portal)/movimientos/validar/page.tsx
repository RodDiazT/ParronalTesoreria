import { redirect } from "next/navigation";
import { obtenerContexto } from "@/lib/contexto";
import { puede } from "@/lib/permisos";
import { bandejaPorValidar } from "@/dominio/movimientos/acciones";
import { bandejaAjustes } from "@/dominio/inscripciones/binomios/consultas";
import { BandejaValidar } from "./bandeja-validar";

export const dynamic = "force-dynamic";

export default async function ValidarPage() {
  const ctx = await obtenerContexto();

  if (!puede(ctx, "validar")) {
    redirect("/sin-permiso");
  }

  const { movimientos, respaldosNuevos } = await bandejaPorValidar(ctx);
  const ajustesPendientes =
    puede(ctx, "inscripciones.administrar") && ctx.evento
      ? await bandejaAjustes(ctx)
      : { inscripciones: [], cargos: [], total: 0 };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <BandejaValidar
        movimientos={movimientos}
        respaldosNuevos={respaldosNuevos}
        ajustesPendientes={ajustesPendientes}
        usuarioActual={{
          id: ctx.usuario.id,
          rol: ctx.rol,
        }}
      />
    </div>
  );
}

