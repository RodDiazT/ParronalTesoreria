import { Contexto } from "@/lib/permisos";
import { db } from "@/lib/contexto";
import {
  normalizarNombre,
  normalizarTelefono,
  sonNombresParecidos,
  fechaReferenciaEdadEfectiva,
} from "@/lib/utilidades";

/**
 * Convierte una fecha (Date o string YYYY-MM-DD o ISO) en tupla [año, mes, día].
 * Protege contra problemas de desfase horario UTC/local.
 */
export function extraerPartesFecha(fecha: Date | string): [number, number, number] {
  if (typeof fecha === "string") {
    const limpia = fecha.split("T")[0];
    const [y, m, d] = limpia.split("-").map(Number);
    return [y, m, d];
  }
  const iso = fecha.toISOString().split("T")[0];
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

/**
 * Obtiene la fecha de hoy en la zona horaria oficial del concurso (America/Santiago)
 * en formato [año, mes, día].
 */
export function obtenerHoyEnChile(): [number, number, number] {
  const formateador = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = formateador.format(new Date()).split("-").map(Number);
  return [y, m, d];
}

export interface ReferenciaEvento {
  fechaReferenciaEdad?: Date | string | null;
  fechaInicio: Date | string;
}

/**
 * Calcula la edad exacta en años cumplidos a la fecha de referencia del evento.
 * Si el evento no está definido, calcula la edad a la fecha de hoy en Chile.
 * Devuelve null si la fecha de nacimiento no está informada (decisión de Rod: opcional).
 * (docs/inscripciones/participantes.md §3.3 y §5.2)
 */
export function edadEnEvento(
  fechaNacimiento: Date | string | null | undefined,
  evento?: ReferenciaEvento | null
): number | null {
  if (!fechaNacimiento) {
    return null;
  }

  const [nacY, nacM, nacD] = extraerPartesFecha(fechaNacimiento);

  let refY: number;
  let refM: number;
  let refD: number;

  if (evento) {
    const fechaRef = fechaReferenciaEdadEfectiva(evento);
    [refY, refM, refD] = extraerPartesFecha(fechaRef);
  } else {
    [refY, refM, refD] = obtenerHoyEnChile();
  }

  let edad = refY - nacY;
  if (refM < nacM || (refM === nacM && refD < nacD)) {
    edad--;
  }

  return edad;
}

export type TipoAlertaJinete =
  | "sin_fecha_nacimiento"
  | "menor_sin_apoderado"
  | "falta_autorizacion"
  | "apoderado_sin_telefono";

export interface AlertaJinete {
  tipo: TipoAlertaJinete;
  mensaje: string;
  gravedad: "advertencia" | "atencion";
}

export interface JineteParaAlertas {
  fechaNacimiento?: Date | string | null;
  autorizacionApoderadoFecha?: Date | string | null;
}

export interface ApoderadoParaAlertas {
  id: string;
  telefono?: string | null;
}

export interface VinculoParaAlertas {
  apoderadoId: string;
  activo?: boolean;
}

/**
 * Evalúa las alertas del jinete en memoria según docs/inscripciones/participantes.md §3.4.
 * No bloquean el registro ni la inscripción.
 */
export function alertasJinete(
  jinete: JineteParaAlertas,
  vinculosActivos: VinculoParaAlertas[] = [],
  apoderados: ApoderadoParaAlertas[] = [],
  evento?: ReferenciaEvento | null
): AlertaJinete[] {
  const alertas: AlertaJinete[] = [];

  const edad = edadEnEvento(jinete.fechaNacimiento, evento);

  // Vínculos efectivamente activos
  const vinculosValidos = vinculosActivos.filter((v) => v.activo !== false);

  // Si la edad es desconocida (null)
  if (edad === null) {
    alertas.push({
      tipo: "sin_fecha_nacimiento",
      mensaje: "Sin fecha de nacimiento: no se conoce su edad ni categoría.",
      gravedad: "advertencia",
    });
  } else {
    // Menor de 18 años sin apoderado
    if (edad < 18 && vinculosValidos.length === 0) {
      alertas.push({
        tipo: "menor_sin_apoderado",
        mensaje: "Menor de 18 años sin apoderado registrado.",
        gravedad: "advertencia",
      });
    }

    // Menor de 14 años sin autorización registrada
    if (edad < 14 && !jinete.autorizacionApoderadoFecha) {
      alertas.push({
        tipo: "falta_autorizacion",
        mensaje: "Menor de 14 años sin fecha de autorización registrada.",
        gravedad: "advertencia",
      });
    }
  }

  // Apoderado registrado sin teléfono de contacto
  if (vinculosValidos.length > 0) {
    const mapaApoderados = new Map(apoderados.map((a) => [a.id, a]));
    for (const v of vinculosValidos) {
      const ap = mapaApoderados.get(v.apoderadoId);
      if (ap && (!ap.telefono || !ap.telefono.trim())) {
        alertas.push({
          tipo: "apoderado_sin_telefono",
          mensaje: "Tiene un apoderado registrado sin teléfono de contacto.",
          gravedad: "atencion",
        });
        break; // Una alerta es suficiente
      }
    }
  }

  return alertas;
}

export interface ParecidoCoincidencia {
  id: string;
  nombre: string;
  activo: boolean;
  detalle?: string;
  clubNombre?: string;
  anoNacimiento?: number | null;
  telefono?: string | null;
  coincidenciaExactaFecha?: boolean;
}

export type EntidadParticipante = "club" | "jinete" | "apoderado" | "caballo";

export interface FiltrosBuscarParecidos {
  nombre?: string;
  rut?: string | null;
  fechaNacimiento?: Date | string | null;
  telefono?: string | null;
  excluirId?: string;
}

/**
 * Busca hasta 3 registros similares fonética u ortográficamente según docs/inscripciones/participantes.md §3.5.
 * Incluye registros desactivados marcándolos como tales.
 */
export async function buscarParecidos(
  ctx: Contexto,
  entidad: EntidadParticipante,
  filtros: FiltrosBuscarParecidos
): Promise<ParecidoCoincidencia[]> {
  const nombreLimpio = filtros.nombre ? normalizarNombre(filtros.nombre) : "";
  const cliente = db(ctx);

  if (entidad === "club") {
    const todos = await cliente.club.findMany({
      select: {
        id: true,
        nombre: true,
        activo: true,
        _count: { select: { jinetes: true, caballos: true } },
      },
    });

    const filtrados = todos.filter((c) => {
      if (filtros.excluirId && c.id === filtros.excluirId) return false;
      if (!nombreLimpio) return false;
      return sonNombresParecidos(nombreLimpio, c.nombre);
    });

    return filtrados.slice(0, 3).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      activo: c.activo,
      detalle: `${c._count.jinetes} jinetes, ${c._count.caballos} caballos`,
    }));
  }

  if (entidad === "jinete") {
    const todos = await cliente.jinete.findMany({
      select: {
        id: true,
        nombre: true,
        activo: true,
        fechaNacimiento: true,
        club: { select: { nombre: true } },
      },
    });

    let partesNacFiltro: [number, number, number] | null = null;
    if (filtros.fechaNacimiento) {
      partesNacFiltro = extraerPartesFecha(filtros.fechaNacimiento);
    }

    const candidatos: (ParecidoCoincidencia & { puntuacion: number })[] = [];

    for (const j of todos) {
      if (filtros.excluirId && j.id === filtros.excluirId) continue;
      const esParecidoNombre = nombreLimpio ? sonNombresParecidos(nombreLimpio, j.nombre) : false;

      let coincideFecha = false;
      let anoNac: number | null = null;
      if (j.fechaNacimiento) {
        const partesJ = extraerPartesFecha(j.fechaNacimiento);
        anoNac = partesJ[0];
        if (
          partesNacFiltro &&
          partesJ[0] === partesNacFiltro[0] &&
          partesJ[1] === partesNacFiltro[1] &&
          partesJ[2] === partesNacFiltro[2]
        ) {
          coincideFecha = true;
        }
      }

      if (coincideFecha && esParecidoNombre) {
        candidatos.push({
          id: j.id,
          nombre: j.nombre,
          activo: j.activo,
          clubNombre: j.club?.nombre,
          anoNacimiento: anoNac,
          coincidenciaExactaFecha: true,
          puntuacion: 1, // Máxima prioridad
        });
      } else if (esParecidoNombre) {
        candidatos.push({
          id: j.id,
          nombre: j.nombre,
          activo: j.activo,
          clubNombre: j.club?.nombre,
          anoNacimiento: anoNac,
          coincidenciaExactaFecha: false,
          puntuacion: 2,
        });
      }
    }

    // Ordenar por prioridad (misma fecha + nombre va primero)
    candidatos.sort((a, b) => a.puntuacion - b.puntuacion);

    return candidatos.slice(0, 3).map(({ puntuacion, ...resto }) => resto);
  }

  if (entidad === "apoderado") {
    const todos = await cliente.apoderado.findMany({
      select: {
        id: true,
        nombre: true,
        activo: true,
        telefono: true,
        telefonoNormalizado: true,
        jinetes: { select: { id: true } },
      },
    });

    const telFiltroNormalizado = normalizarTelefono(filtros.telefono);

    const filtrados = todos.filter((a) => {
      if (filtros.excluirId && a.id === filtros.excluirId) return false;

      const coincideNombre = nombreLimpio ? sonNombresParecidos(nombreLimpio, a.nombre) : false;
      const coincideTel =
        telFiltroNormalizado && a.telefonoNormalizado
          ? a.telefonoNormalizado === telFiltroNormalizado
          : false;

      return coincideNombre || coincideTel;
    });

    return filtrados.slice(0, 3).map((a) => ({
      id: a.id,
      nombre: a.nombre,
      activo: a.activo,
      telefono: a.telefono,
      detalle: `${a.jinetes.length} jinetes vinculados`,
    }));
  }

  if (entidad === "caballo") {
    const todos = await cliente.caballo.findMany({
      select: {
        id: true,
        nombre: true,
        activo: true,
        club: { select: { nombre: true } },
      },
    });

    const filtrados = todos.filter((c) => {
      if (filtros.excluirId && c.id === filtros.excluirId) return false;
      if (!nombreLimpio) return false;
      return sonNombresParecidos(nombreLimpio, c.nombre);
    });

    return filtrados.slice(0, 3).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      activo: c.activo,
      clubNombre: c.club?.nombre,
    }));
  }

  return [];
}
