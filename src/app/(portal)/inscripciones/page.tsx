import { obtenerContexto, db } from "@/lib/contexto";
import { ConfigurarEstructura } from "@/components/app/estructura";
import { ListaInscripciones } from "./lista-inscripciones";
import {
  listarBinomios,
  resumenPorPrueba,
  listarCargos,
  listarPorCobrar,
  listarPorAsignar,
  listarRetiros,
} from "@/dominio/inscripciones/binomios/consultas";

export const metadata = {
  title: "Inscripciones · Tesorería",
  description: "Control de binomios, pruebas, cargos y cobranza",
};

export default async function InscripcionesPage() {
  const ctx = await obtenerContexto();

  if (!ctx.evento) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No hay ningún evento activo seleccionado. Selecciona o crea un evento en la configuración.
      </div>
    );
  }

  const [
    binomios,
    resumenPruebas,
    cargos,
    porCobrarData,
    porAsignarMovimientos,
    retiros,
    clubes,
    pruebas,
  ] = await Promise.all([
    listarBinomios(ctx),
    resumenPorPrueba(ctx),
    listarCargos(ctx),
    listarPorCobrar(ctx),
    listarPorAsignar(ctx),
    listarRetiros(ctx),
    db(ctx).club.findMany({
      where: { organizacionId: ctx.organizacionId, activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    db(ctx).prueba.findMany({
      where: { organizacionId: ctx.organizacionId, eventoId: ctx.evento.id, activa: true },
      select: { id: true, nombre: true },
      orderBy: { orden: "asc" },
    }),
  ]);

  return (
    <>
      <ConfigurarEstructura modo="detalle" titulo="Inscripciones" volverHref="/" />
      <ListaInscripciones
        binomios={binomios}
        resumenPruebas={resumenPruebas}
        cargos={cargos}
        porCobrarData={porCobrarData}
        porAsignarMovimientos={porAsignarMovimientos}
        retiros={retiros}
        clubes={clubes}
        pruebas={pruebas}
        rol={ctx.rol}
      />
    </>
  );
}
