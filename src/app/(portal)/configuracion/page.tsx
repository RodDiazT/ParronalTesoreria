import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Building2, Tag, Trophy } from "lucide-react";
import { obtenerContexto } from "@/lib/contexto";
import { exigir } from "@/lib/permisos";
import { ConfigurarEstructura } from "@/components/app/estructura";

export const metadata = {
  title: "Configuración · Tesorería",
  description: "Configuración del evento, organización y clasificaciones",
};

export default async function ConfiguracionPage() {
  const ctx = await obtenerContexto();

  try {
    exigir(ctx, "configurar");
  } catch {
    redirect("/sin-permiso");
  }

  const secciones = [
    {
      titulo: "Evento vigente",
      descripcion: "Nombre del concurso, fechas de desarrollo, fecha de corte de edad y lugar",
      href: "/configuracion/evento",
      icono: Calendar,
      disponible: true,
    },
    {
      titulo: "Club y Organización",
      descripcion: "Nombre de la entidad organizadora y logo oficial",
      href: "/configuracion/organizacion",
      icono: Building2,
      disponible: true,
    },
    {
      titulo: "Categorías",
      descripcion: "Clasificación de ingresos y gastos, orden y requerimiento de contraparte",
      href: "/configuracion/categorias",
      icono: Tag,
      disponible: true,
    },
    {
      titulo: "Pruebas y conceptos",
      descripcion: "Pruebas del concurso, tarifas, cuotas y conceptos adicionales de cobro",
      href: "#",
      icono: Trophy,
      disponible: false,
      etiqueta: "Fase 6",
    },
  ];

  return (
    <>
      <ConfigurarEstructura
        modo="detalle"
        titulo="Configuración"
        volverHref="/"
      />

      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-texto">Ajustes generales</h2>
          <p className="text-xs text-texto-suave mt-0.5">
            Configuración base de la tesorería del club y los parámetros del evento.
          </p>
        </div>

        <div className="grid gap-3">
          {secciones.map((sec) => {
            const Icono = sec.icono;

            if (!sec.disponible) {
              return (
                <div
                  key={sec.titulo}
                  className="flex items-center justify-between p-4 rounded-2xl border border-borde bg-superficie/60 opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-borde text-texto-suave">
                      <Icono className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-texto">{sec.titulo}</span>
                        {sec.etiqueta && (
                          <span className="text-[10px] font-bold bg-borde px-2 py-0.5 rounded-full text-texto-suave">
                            {sec.etiqueta}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-texto-suave mt-0.5">{sec.descripcion}</p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={sec.href}
                href={sec.href}
                className="flex items-center justify-between p-4 rounded-2xl border border-borde bg-superficie hover:border-acento transition-all shadow-xs group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fondo border border-borde/60 text-acento group-hover:bg-acento/10 transition-colors">
                    <Icono className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-texto">{sec.titulo}</span>
                    <p className="text-xs text-texto-suave mt-0.5">{sec.descripcion}</p>
                  </div>
                </div>
                <span className="text-texto-suave text-lg font-light group-hover:translate-x-0.5 transition-transform">
                  ›
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
