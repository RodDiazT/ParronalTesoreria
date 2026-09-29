import { redirect } from "next/navigation";
import { obtenerContexto, db } from "@/lib/contexto";
import { exigir } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { GestorCategorias, CategoriaItem } from "./gestor-categorias";

export const metadata = {
  title: "Categorías · Tesorería",
  description: "Configuración y clasificación de ingresos y gastos",
};

export default async function CategoriasPage() {
  const ctx = await obtenerContexto();

  try {
    exigir(ctx, "configurar");
  } catch {
    redirect("/sin-permiso");
  }

  const rawCategorias = await db(ctx).categoria.findMany({
    include: {
      _count: {
        select: { movimientos: true },
      },
    },
    orderBy: { orden: "asc" },
  });

  const categorias: CategoriaItem[] = rawCategorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo as "ingreso" | "gasto",
    claveSistema: c.claveSistema,
    exigeContraparte: c.exigeContraparte,
    sujetoAsociado: c.sujetoAsociado,
    exigeSujeto: c.exigeSujeto,
    activa: c.activa,
    orden: c.orden,
    version: c.version,
    cantidadMovimientos: c._count.movimientos,
  }));

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Categorías"
        volverHref="/configuracion"
      />

      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-texto">Clasificación de cuentas</h2>
          <p className="text-xs text-texto-suave mt-0.5">
            Define las categorías para clasificar ingresos y gastos, orden y requerimiento de contraparte.
          </p>
        </div>

        <GestorCategorias categoriasIniciales={categorias} />
      </div>
    </>
  );
}
