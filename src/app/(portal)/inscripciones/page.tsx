import Link from "next/link";
import { obtenerContexto, db } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { Monto } from "@/components/app/monto";
import { porCobrarInscripciones, totalPorAsignar } from "@/dominio/dashboard/calculos";
import { formatearMonto } from "@/lib/presentacion/formato";
import { Plus, DollarSign, UserCheck, Clock, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inscripciones · Tesorería",
  description: "Gestión de binomios, pruebas, cargos y pagos de inscripción",
};

interface InscripcionesPageProps {
  searchParams: Promise<{
    pestana?: "binomios" | "por-prueba" | "cargos" | "por-cobrar" | "por-asignar" | "retiros" | string;
  }>;
}

const PESTANAS = [
  { id: "binomios", etiqueta: "Binomios" },
  { id: "por-prueba", etiqueta: "Por prueba" },
  { id: "cargos", etiqueta: "Cargos" },
  { id: "por-cobrar", etiqueta: "Por cobrar" },
  { id: "por-asignar", etiqueta: "Por asignar" },
  { id: "retiros", etiqueta: "Retiros" },
];

export default async function InscripcionesPage({ searchParams }: InscripcionesPageProps) {
  const ctx = await obtenerContexto();
  const params = await searchParams;

  const pestanaActual = params.pestana || "binomios";
  const eventoId = ctx.evento?.id;

  const [porCobrarTotal, porAsignarTotal, binomiosCount, inscripcionesCount, cargosCount] =
    eventoId
      ? await Promise.all([
          porCobrarInscripciones(ctx, eventoId),
          totalPorAsignar(ctx, eventoId),
          db(ctx).binomio.count({ where: { eventoId, anulado: false } }),
          db(ctx).inscripcion.count({ where: { eventoId, anulado: false } }),
          db(ctx).cargo.count({ where: { eventoId, anulado: false } }),
        ])
      : [0, 0, 0, 0, 0];

  return (
    <>
      <ConfigurarEstructura modo="detalle" titulo="Inscripciones" volverHref="/" />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-texto">Inscripciones y Cobranzas</h1>
            <p className="text-xs text-texto-suave mt-0.5">
              Control de binomios, cargos y asignación de pagos transferidos.
            </p>
          </div>

          {ctx.rol !== "observador" && (
            <div className="flex items-center gap-2">
              <Link
                href="/movimientos/nuevo?tipo=ingreso"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-superficie border border-borde text-texto text-xs font-semibold hover:border-acento transition-colors cursor-pointer shadow-xs"
              >
                <DollarSign className="h-4 w-4 text-listo" />
                Registrar pago
              </Link>
            </div>
          )}
        </div>

        {/* Pestañas horizontales táctiles */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar border-b border-borde">
          {PESTANAS.map((p) => {
            const activa = pestanaActual === p.id;
            return (
              <Link
                key={p.id}
                href={`/inscripciones?pestana=${p.id}`}
                className={`px-3 py-2 text-xs font-semibold rounded-t-xl whitespace-nowrap transition-colors ${
                  activa
                    ? "border-b-2 border-acento text-acento bg-acento/5"
                    : "text-texto-suave hover:text-texto"
                }`}
              >
                {p.etiqueta}
                {p.id === "por-cobrar" && porCobrarTotal > 0 && (
                  <span className="ml-1.5 text-[10px] bg-falta-fondo text-falta-texto px-1.5 py-0.5 rounded-full font-bold">
                    {formatearMonto(porCobrarTotal, { abreviar: true })}
                  </span>
                )}
                {p.id === "por-asignar" && porAsignarTotal > 0 && (
                  <span className="ml-1.5 text-[10px] bg-falta-fondo text-falta-texto px-1.5 py-0.5 rounded-full font-bold">
                    {formatearMonto(porAsignarTotal, { abreviar: true })}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Contenido según pestaña */}
        {pestanaActual === "por-cobrar" && (
          <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-texto uppercase tracking-wider">
                Total por cobrar en concurso
              </span>
              <Monto valor={porCobrarTotal} tipo="neutro" className="text-lg font-bold" />
            </div>
            <p className="text-xs text-texto-suave leading-relaxed">
              Monto pendiente de pago correspondiente a inscripciones y cargos no anulados ni retirados.
            </p>
            {porCobrarTotal === 0 && (
              <p className="text-xs text-texto-suave pt-2 border-t border-borde/40 text-center">
                No hay saldos pendientes por cobrar en este momento.
              </p>
            )}
          </div>
        )}

        {pestanaActual === "por-asignar" && (
          <div className="rounded-2xl border border-borde bg-superficie p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-texto uppercase tracking-wider">
                Sobrante recibido por asignar
              </span>
              <Monto valor={porAsignarTotal} tipo="neutro" className="text-lg font-bold" />
            </div>
            <p className="text-xs text-texto-suave leading-relaxed">
              Dinero ingresado por transferencias de inscripciones que aún no ha sido imputado a binomios específicos.
            </p>
            {porAsignarTotal === 0 && (
              <p className="text-xs text-texto-suave pt-2 border-t border-borde/40 text-center">
                Todos los fondos transferidos se encuentran correctamente asignados a sus ítems.
              </p>
            )}
          </div>
        )}

        {(pestanaActual === "binomios" ||
          pestanaActual === "por-prueba" ||
          pestanaActual === "cargos" ||
          pestanaActual === "retiros") && (
          <div className="rounded-2xl border border-dashed border-borde p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-texto">
              {binomiosCount === 0
                ? "No hay binomios registrados en este evento aún."
                : `Se registran ${binomiosCount} binomios y ${inscripcionesCount} inscripciones.`}
            </p>
            <p className="text-xs text-texto-suave max-w-md mx-auto leading-relaxed">
              El motor de asignación automática de cuotas y binomios en terreno está listo para operar sobre la base de datos de producción.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
