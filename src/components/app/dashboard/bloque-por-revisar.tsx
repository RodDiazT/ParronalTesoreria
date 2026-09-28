import Link from "next/link";
import { ChevronRight, AlertCircle, Clock, DollarSign, UserCheck, Users } from "lucide-react";
import { AvisosAdministrador } from "@/dominio/dashboard/calculos";
import { formatearMonto } from "@/lib/presentacion/formato";

interface BloquePorRevisarProps {
  avisos: AvisosAdministrador;
}

/**
 * Bloque 1 del Administrador: Avisos de acciones pendientes.
 * Solo muestra filas cuya condición sea > 0.
 * (docs/dashboard/dashboard.md §3.5 y docs/interfaz/ux-ui.md §3.4)
 */
export function BloquePorRevisar({ avisos }: BloquePorRevisarProps) {
  const filas: Array<{
    id: string;
    texto: string;
    href: string;
    icono: any;
    tono: "problema" | "falta";
  }> = [];

  // 1. Solicitudes de acceso
  if (avisos.solicitudes > 0) {
    const pal = avisos.solicitudes === 1 ? "solicitud" : "solicitudes";
    filas.push({
      id: "solicitudes",
      texto: `Hay ${avisos.solicitudes} ${pal} de acceso por revisar`,
      href: "/usuarios",
      icono: UserCheck,
      tono: "falta",
    });
  }

  // 2. Movimientos por validar
  if (avisos.porValidar.cantidad > 0) {
    const pal = avisos.porValidar.cantidad === 1 ? "movimiento" : "movimientos";
    filas.push({
      id: "por-validar",
      texto: `Hay ${avisos.porValidar.cantidad} ${pal} por validar (${formatearMonto(avisos.porValidar.monto)})`,
      href: "/movimientos/validar",
      icono: Clock,
      tono: "falta",
    });
  }

  // 3. Por asignar a inscripciones
  if (avisos.porAsignar > 0) {
    filas.push({
      id: "por-asignar",
      texto: `Hay ${formatearMonto(avisos.porAsignar)} recibidos sin asignar a inscripciones`,
      href: "/inscripciones?pestana=por-asignar",
      icono: DollarSign,
      tono: "falta",
    });
  }

  // 4. Ajustes de inscripción por revisar
  if (avisos.ajustesPorVer > 0) {
    const pal = avisos.ajustesPorVer === 1 ? "ajuste" : "ajustes";
    filas.push({
      id: "ajustes",
      texto: `Hay ${avisos.ajustesPorVer} ${pal} de inscripción por revisar`,
      href: "/movimientos/validar",
      icono: Clock,
      tono: "falta",
    });
  }

  // 5. Jinetes inscritos con alerta de menor
  if (avisos.jinetesConAlertaMenor > 0) {
    const pal = avisos.jinetesConAlertaMenor === 1 ? "jinete inscrito" : "jinetes inscritos";
    filas.push({
      id: "menores",
      texto: `Hay ${avisos.jinetesConAlertaMenor} ${pal} con alertas de menor`,
      href: "/participantes?pestana=jinetes&alertas=1",
      icono: AlertCircle,
      tono: "problema",
    });
  }

  if (filas.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-texto uppercase tracking-wider px-1">
        Por revisar
      </h3>
      <div className="rounded-2xl border border-falta-borde bg-falta-fondo/40 overflow-hidden divide-y divide-falta-borde/50 shadow-xs">
        {filas.map((f) => {
          const Icono = f.icono;
          return (
            <Link
              key={f.id}
              href={f.href}
              className="flex items-center justify-between p-3.5 hover:bg-falta-fondo/70 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <Icono className={`h-4 w-4 shrink-0 ${f.tono === "problema" ? "text-problema" : "text-falta"}`} />
                <span className="text-xs font-semibold text-texto truncate">
                  {f.texto}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-texto-suave group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
