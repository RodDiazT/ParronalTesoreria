import Link from "next/link";
import { obtenerContexto } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { ejecutarListarTraspasos } from "@/dominio/dashboard/traspasos";
import { ListaTraspasos } from "./lista-traspasos";
import { puede } from "@/lib/permisos";
import { ArrowLeftRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Traspasos · Tesorería",
  description: "Traspasos entre Banco, Efectivo y Otros",
};

export default async function TraspasosPage() {
  const ctx = await obtenerContexto();

  if (!ctx.evento) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center space-y-3">
        <p className="text-sm text-texto-suave">
          No hay un evento activo configurado para consultar traspasos.
        </p>
      </div>
    );
  }

  const traspasos = await ejecutarListarTraspasos(ctx, ctx.evento.id, {
    incluirAnulados: true,
  });

  const puedeRegistrar = puede(ctx, "registrar_traspaso");

  return (
    <>
      <ConfigurarEstructura modo="detalle" titulo="Traspasos" volverHref="/" />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-texto flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-acento" />
              Traspasos entre Medios
            </h1>
            <p className="text-xs text-texto-suave mt-0.5">
              Movimientos entre Banco y Efectivo sin alterar el saldo total de caja.
            </p>
          </div>

          {puedeRegistrar && (
            <Link
              href="/traspasos/nuevo"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-acento text-acento-texto text-xs font-semibold hover:opacity-95 transition-opacity cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Nuevo traspaso
            </Link>
          )}
        </div>

        <ListaTraspasos
          traspasos={traspasos}
          rol={ctx.rol}
          puedeRegistrar={puedeRegistrar}
        />
      </div>
    </>
  );
}
