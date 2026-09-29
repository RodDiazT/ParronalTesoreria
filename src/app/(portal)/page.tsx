import { obtenerContexto } from "@/lib/contexto";
import {
  indicadores,
  saldoPorMedio,
  avisosAdministrador,
  loMio,
} from "@/dominio/dashboard/calculos";
import { formatearHora } from "@/lib/presentacion/formato";
import { BloquePorRevisar } from "@/components/app/dashboard/bloque-por-revisar";
import { BloqueLoMio } from "@/components/app/dashboard/bloque-lo-mio";
import { TarjetaSaldo } from "@/components/app/dashboard/tarjeta-saldo";
import { FilasResumen } from "@/components/app/dashboard/filas-resumen";
import { DetalleDashboard } from "@/components/app/dashboard/detalle-dashboard";
import { BotonCopiarResumen } from "@/components/app/dashboard/boton-copiar-resumen";
import { ConfigurarEstructura } from "@/components/app/estructura";
import Link from "next/link";
import { Info, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inicio · Tesorería",
  description: "Dashboard financiero del concurso ecuestre",
};

export default async function HomePage() {
  const ctx = await obtenerContexto();

  if (!ctx.evento) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="rounded-2xl border border-borde bg-superficie p-8 space-y-3 shadow-xs">
          <p className="text-sm font-semibold text-texto">
            No hay un concurso activo configurado
          </p>
          <p className="text-xs text-texto-suave leading-relaxed">
            Para visualizar las métricas y registrar movimientos, configura un evento en el panel de administración.
          </p>
          {ctx.rol === "administrador" && (
            <div className="pt-2">
              <Link
                href="/configuracion/evento"
                className="inline-flex items-center px-4 py-2 rounded-xl bg-acento text-acento-texto text-xs font-semibold hover:opacity-95 transition-opacity"
              >
                Configurar evento
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const eventoId = ctx.evento.id;

  const [ind, saldoMedio, avisos, pendientesMios] = await Promise.all([
    indicadores(ctx, eventoId),
    saldoPorMedio(ctx, eventoId),
    ctx.rol === "administrador" ? avisosAdministrador(ctx, eventoId) : null,
    ctx.rol === "ayudante" ? loMio(ctx, eventoId) : null,
  ]);

  const horaCalculo = formatearHora(new Date());

  const sinMovimientos =
    ind.ingresosPercibidos === 0 &&
    ind.gastosPagados === 0 &&
    ind.porValidar.cantidad === 0 &&
    ind.porCobrar.total === 0 &&
    ind.porPagar.total === 0 &&
    ind.especie.total === 0;

  return (
    <>
      <ConfigurarEstructura
        modo="seccion"
        ocultarBotonRegistrar={ctx.rol === "observador"}
      />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Guía de inicio paso a paso para el administrador si la base está limpia */}
        {sinMovimientos && ctx.rol === "administrador" ? (
          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Concurso Ecuestre Listo para Iniciar</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              La base de datos está limpia. Sigue estos 3 pasos recomendados para poner en marcha la gestión de tu evento:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <Link
                href="/configuracion/pruebas"
                className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left block space-y-1 group"
              >
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Paso 1</div>
                <div className="text-xs font-semibold text-stone-900 group-hover:text-emerald-950">Configurar Pruebas</div>
                <div className="text-[11px] text-stone-500">Crea las pruebas técnicas y tarifas.</div>
              </Link>
              <Link
                href="/inscripciones/nueva"
                className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left block space-y-1 group"
              >
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Paso 2</div>
                <div className="text-xs font-semibold text-stone-900 group-hover:text-emerald-950">Inscribir Binomios</div>
                <div className="text-[11px] text-stone-500">Registra jinetes, caballos y pruebas.</div>
              </Link>
              <Link
                href="/movimientos/nuevo"
                className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left block space-y-1 group"
              >
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Paso 3</div>
                <div className="text-xs font-semibold text-stone-900 group-hover:text-emerald-950">Registrar Movimientos</div>
                <div className="text-[11px] text-stone-500">Ingresos, cobros y gastos del evento.</div>
              </Link>
            </div>
          </div>
        ) : sinMovimientos && ctx.rol !== "observador" ? (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-acento/10 border border-acento/20 text-xs text-texto">
            <Info className="h-4 w-4 text-acento shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Todavía no hay movimientos. Registra el primero con el botón <strong>+</strong> en la esquina inferior.
            </p>
          </div>
        ) : null}

        {/* 1. Bloque de avisos según rol */}
        {ctx.rol === "administrador" && avisos && (
          <BloquePorRevisar avisos={avisos} />
        )}

        {ctx.rol === "ayudante" && pendientesMios && (
          <BloqueLoMio loMio={pendientesMios} />
        )}

        {/* 2. Tarjeta principal: Saldo de caja y desglose por medio */}
        <TarjetaSaldo
          saldoCaja={ind.saldoCaja}
          saldoPorMedio={saldoMedio}
          horaCalculo={horaCalculo}
        />

        {/* 3. Filas: Por cobrar, Por pagar y Resultado proyectado */}
        <FilasResumen indicadores={ind} />

        {/* 4. Ver detalle (plegado con Ingresos, Gastos y sección Aparte) */}
        <DetalleDashboard indicadores={ind} rol={ctx.rol} />

        {/* 5. Copiar resumen para WhatsApp (solo Administrador y Observador) */}
        {(ctx.rol === "administrador" || ctx.rol === "observador") && (
          <div className="pt-1">
            <BotonCopiarResumen eventoId={eventoId} />
          </div>
        )}
      </div>
    </>
  );
}
