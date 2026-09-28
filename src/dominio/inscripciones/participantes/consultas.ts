import {
  obtenerContexto,
  db,
  exigirDeLaOrganizacion,
} from "@/lib/contexto";
import { Contexto, exigir, ErrorPermiso } from "@/lib/permisos";
import {
  alertasJinete,
  edadEnEvento,
  AlertaJinete,
} from "./reglas";

export interface JineteResumenDTO {
  id: string;
  nombre: string;
  clubId: string;
  clubNombre?: string;
  activo: boolean;
  edad: number | null;
  fechaNacimiento: Date | null;
  contacto: string | null;
  rut: string | null;
  autorizacionApoderadoFecha: Date | null;
  apoderadosCount: number;
  alertas: AlertaJinete[];
  version: number;
}

export interface CaballoResumenDTO {
  id: string;
  nombre: string;
  clubId: string;
  clubNombre?: string;
  activo: boolean;
  version: number;
}

export interface ClubResumenDTO {
  id: string;
  nombre: string;
  contacto: string | null;
  rut: string | null;
  activo: boolean;
  jinetesCount: number;
  caballosCount: number;
  version: number;
}

export interface ApoderadoResumenDTO {
  id: string;
  nombre: string;
  telefono: string | null;
  activo: boolean;
  jinetesCount: number;
  version: number;
}

export interface FiltrosListadoParticipantes {
  pestana?: "jinetes" | "caballos" | "clubes" | "apoderados";
  busqueda?: string;
  clubId?: string;
  soloActivos?: boolean;
  conAlertas?: boolean;
}

/**
 * Consulta listados de participantes aplicando estrictamente la regla de privacidad
 * para el rol Observador (docs/inscripciones/participantes.md §3.9 y §4).
 */
export async function ejecutarListarParticipantes(
  ctx: Contexto,
  filtros: FiltrosListadoParticipantes = {}
) {
  exigir(ctx, "participantes.ver");

  const pestana = filtros.pestana || "jinetes";
  const busqueda = filtros.busqueda?.trim().toLowerCase() || "";
  const soloActivos = filtros.soloActivos !== false;
  const esObservador = ctx.rol === "observador";
  const cliente = db(ctx);

  // Contador global de jinetes con alertas (solo para administrador y ayudante)
  let contadorConAlertas = 0;
  if (!esObservador) {
    const todosJinetes = await cliente.jinete.findMany({
      where: { activo: true },
      include: {
        apoderados: {
          where: { activo: true },
          include: { apoderado: true },
        },
      },
    });

    for (const j of todosJinetes) {
      const vinculos = j.apoderados.map((a) => ({
        apoderadoId: a.apoderadoId,
        activo: a.activo,
      }));
      const aps = j.apoderados.map((a) => ({
        id: a.apoderado.id,
        telefono: a.apoderado.telefono,
      }));
      const als = alertasJinete(j, vinculos, aps, ctx.evento);
      if (als.length > 0) {
        contadorConAlertas++;
      }
    }
  }

  // 1. Pestaña Jinetes
  if (pestana === "jinetes") {
    const where: any = {};
    if (soloActivos) where.activo = true;
    if (filtros.clubId) where.clubId = filtros.clubId;

    const jinetesBD = await cliente.jinete.findMany({
      where,
      include: {
        club: { select: { nombre: true } },
        apoderados: {
          where: { activo: true },
          include: { apoderado: { select: { id: true, telefono: true } } },
        },
      },
      orderBy: { nombre: "asc" },
    });

    let items: JineteResumenDTO[] = jinetesBD.map((j) => {
      const vinculos = j.apoderados.map((a) => ({
        apoderadoId: a.apoderadoId,
        activo: a.activo,
      }));
      const aps = j.apoderados.map((a) => ({
        id: a.apoderado.id,
        telefono: a.apoderado.telefono,
      }));

      const edadCalc = esObservador ? null : edadEnEvento(j.fechaNacimiento, ctx.evento);
      const als = esObservador ? [] : alertasJinete(j, vinculos, aps, ctx.evento);

      return {
        id: j.id,
        nombre: j.nombre,
        clubId: j.clubId,
        clubNombre: j.club?.nombre,
        activo: j.activo,
        edad: edadCalc,
        fechaNacimiento: esObservador ? null : j.fechaNacimiento,
        contacto: esObservador ? null : j.contacto,
        rut: esObservador ? null : j.rut,
        autorizacionApoderadoFecha: esObservador ? null : j.autorizacionApoderadoFecha,
        apoderadosCount: esObservador ? 0 : vinculos.length,
        alertas: als,
        version: j.version,
      };
    });

    if (filtros.conAlertas && !esObservador) {
      items = items.filter((j) => j.alertas.length > 0);
    }

    if (busqueda) {
      items = items.filter(
        (j) =>
          j.nombre.toLowerCase().includes(busqueda) ||
          (j.clubNombre && j.clubNombre.toLowerCase().includes(busqueda))
      );
    }

    return {
      pestana: "jinetes" as const,
      jinetes: items,
      contadorConAlertas,
    };
  }

  // 2. Pestaña Caballos
  if (pestana === "caballos") {
    const where: any = {};
    if (soloActivos) where.activo = true;
    if (filtros.clubId) where.clubId = filtros.clubId;

    const caballosBD = await cliente.caballo.findMany({
      where,
      include: { club: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    });

    let items: CaballoResumenDTO[] = caballosBD.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      clubId: c.clubId,
      clubNombre: c.club?.nombre,
      activo: c.activo,
      version: c.version,
    }));

    if (busqueda) {
      items = items.filter(
        (c) =>
          c.nombre.toLowerCase().includes(busqueda) ||
          (c.clubNombre && c.clubNombre.toLowerCase().includes(busqueda))
      );
    }

    return {
      pestana: "caballos" as const,
      caballos: items,
      contadorConAlertas,
    };
  }

  // 3. Pestaña Clubes
  if (pestana === "clubes") {
    const where: any = {};
    if (soloActivos) where.activo = true;

    const clubesBD = await cliente.club.findMany({
      where,
      include: {
        _count: { select: { jinetes: true, caballos: true } },
      },
      orderBy: { nombre: "asc" },
    });

    let items: ClubResumenDTO[] = clubesBD.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      contacto: esObservador ? null : c.contacto,
      rut: esObservador ? null : c.rut,
      activo: c.activo,
      jinetesCount: c._count.jinetes,
      caballosCount: c._count.caballos,
      version: c.version,
    }));

    if (busqueda) {
      items = items.filter((c) => c.nombre.toLowerCase().includes(busqueda));
    }

    return {
      pestana: "clubes" as const,
      clubes: items,
      contadorConAlertas,
    };
  }

  // 4. Pestaña Apoderados
  if (pestana === "apoderados") {
    if (esObservador) {
      throw new ErrorPermiso("El rol observador no tiene acceso a los datos de apoderados.");
    }

    const where: any = {};
    if (soloActivos) where.activo = true;

    const apoderadosBD = await cliente.apoderado.findMany({
      where,
      include: {
        jinetes: { where: { activo: true } },
      },
      orderBy: { nombre: "asc" },
    });

    let items: ApoderadoResumenDTO[] = apoderadosBD.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      telefono: a.telefono,
      activo: a.activo,
      jinetesCount: a.jinetes.length,
      version: a.version,
    }));

    if (busqueda) {
      items = items.filter(
        (a) =>
          a.nombre.toLowerCase().includes(busqueda) ||
          (a.telefono && a.telefono.includes(busqueda))
      );
    }

    return {
      pestana: "apoderados" as const,
      apoderados: items,
      contadorConAlertas,
    };
  }

  return {
    pestana: "jinetes" as const,
    jinetes: [],
    contadorConAlertas,
  };
}

export async function listarParticipantes(filtros: FiltrosListadoParticipantes = {}) {
  const ctx = await obtenerContexto();
  return ejecutarListarParticipantes(ctx, filtros);
}

/**
 * Obtiene la ficha detallada de un jinete.
 * Oculta datos personales y apoderados si el usuario es observador.
 */
export async function ejecutarObtenerFichaJinete(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.ver");
  await exigirDeLaOrganizacion(ctx, "jinete", id);

  const esObservador = ctx.rol === "observador";
  const cliente = db(ctx);

  const jinete = await cliente.jinete.findFirst({
    where: { id },
    include: {
      club: true,
      apoderados: {
        where: { activo: true },
        include: { apoderado: true },
      },
      binomios: {
        include: {
          caballo: true,
          evento: true,
        },
      },
    },
  });

  if (!jinete) return null;

  const vinculos = jinete.apoderados.map((a) => ({
    apoderadoId: a.apoderadoId,
    activo: a.activo,
  }));
  const aps = jinete.apoderados.map((a) => ({
    id: a.apoderado.id,
    telefono: a.apoderado.telefono,
  }));

  const edad = esObservador ? null : edadEnEvento(jinete.fechaNacimiento, ctx.evento);
  const alertas = esObservador ? [] : alertasJinete(jinete, vinculos, aps, ctx.evento);

  return {
    id: jinete.id,
    nombre: jinete.nombre,
    activo: jinete.activo,
    version: jinete.version,
    clubId: jinete.clubId,
    club: jinete.club ? { id: jinete.club.id, nombre: jinete.club.nombre } : null,
    edad,
    alertas,
    fechaNacimiento: esObservador ? null : jinete.fechaNacimiento,
    contacto: esObservador ? null : jinete.contacto,
    rut: esObservador ? null : jinete.rut,
    autorizacionApoderadoFecha: esObservador ? null : jinete.autorizacionApoderadoFecha,
    apoderados: esObservador
      ? []
      : jinete.apoderados.map((v) => ({
          id: v.id,
          apoderadoId: v.apoderadoId,
          nombre: v.apoderado.nombre,
          telefono: v.apoderado.telefono,
          relacion: v.relacion,
          activo: v.activo,
        })),
    binomios: jinete.binomios.map((b) => ({
      id: b.id,
      eventoId: b.eventoId,
      eventoNombre: b.evento.nombre,
      caballoId: b.caballoId,
      caballoNombre: b.caballo.nombre,
    })),
  };
}

export async function obtenerFichaJinete(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarObtenerFichaJinete(ctx, id);
}

/**
 * Obtiene la ficha de un club con sus jinetes y caballos asociados.
 */
export async function ejecutarObtenerFichaClub(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.ver");
  await exigirDeLaOrganizacion(ctx, "club", id);

  const esObservador = ctx.rol === "observador";
  const cliente = db(ctx);

  const club = await cliente.club.findFirst({
    where: { id },
    include: {
      jinetes: { where: { activo: true }, orderBy: { nombre: "asc" } },
      caballos: { where: { activo: true }, orderBy: { nombre: "asc" } },
    },
  });

  if (!club) return null;

  return {
    id: club.id,
    nombre: club.nombre,
    activo: club.activo,
    version: club.version,
    contacto: esObservador ? null : club.contacto,
    rut: esObservador ? null : club.rut,
    jinetes: club.jinetes.map((j) => ({
      id: j.id,
      nombre: j.nombre,
      activo: j.activo,
    })),
    caballos: club.caballos.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      activo: c.activo,
    })),
  };
}

export async function obtenerFichaClub(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarObtenerFichaClub(ctx, id);
}

/**
 * Obtiene la ficha de un caballo con su club y binomios asociados.
 */
export async function ejecutarObtenerFichaCaballo(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.ver");
  await exigirDeLaOrganizacion(ctx, "caballo", id);

  const cliente = db(ctx);

  const caballo = await cliente.caballo.findFirst({
    where: { id },
    include: {
      club: true,
      binomios: {
        include: {
          jinete: true,
          evento: true,
        },
      },
    },
  });

  if (!caballo) return null;

  return {
    id: caballo.id,
    nombre: caballo.nombre,
    activo: caballo.activo,
    version: caballo.version,
    clubId: caballo.clubId,
    clubNombre: caballo.club?.nombre,
    binomios: caballo.binomios.map((b) => ({
      id: b.id,
      eventoId: b.eventoId,
      eventoNombre: b.evento.nombre,
      jineteId: b.jineteId,
      jineteNombre: b.jinete.nombre,
    })),
  };
}

export async function obtenerFichaCaballo(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarObtenerFichaCaballo(ctx, id);
}

/**
 * Obtiene la ficha de un apoderado con sus jinetes vinculados.
 * Prohibido al observador.
 */
export async function ejecutarObtenerFichaApoderado(ctx: Contexto, id: string) {
  exigir(ctx, "participantes.verDatosPersonales");
  await exigirDeLaOrganizacion(ctx, "apoderado", id);

  const cliente = db(ctx);

  const apoderado = await cliente.apoderado.findFirst({
    where: { id },
    include: {
      jinetes: {
        include: {
          jinete: {
            include: { club: true },
          },
        },
      },
    },
  });

  if (!apoderado) return null;

  return {
    id: apoderado.id,
    nombre: apoderado.nombre,
    telefono: apoderado.telefono,
    activo: apoderado.activo,
    version: apoderado.version,
    jinetes: apoderado.jinetes.map((v) => ({
      id: v.id,
      jineteId: v.jineteId,
      nombre: v.jinete.nombre,
      clubNombre: v.jinete.club?.nombre,
      relacion: v.relacion,
      activo: v.activo,
    })),
  };
}

export async function obtenerFichaApoderado(id: string) {
  const ctx = await obtenerContexto();
  return ejecutarObtenerFichaApoderado(ctx, id);
}

// -------------------------------------------------------------
// Consultas optimizadas para Selectores
// -------------------------------------------------------------

export async function ejecutarListarClubesActivos(ctx: Contexto) {
  exigir(ctx, "participantes.ver");
  return db(ctx).club.findMany({
    where: { activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
}

export async function listarClubesActivos() {
  const ctx = await obtenerContexto();
  return ejecutarListarClubesActivos(ctx);
}

export async function ejecutarListarJinetesActivos(ctx: Contexto) {
  exigir(ctx, "participantes.ver");
  const esObservador = ctx.rol === "observador";
  const jinetes = await db(ctx).jinete.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      clubId: true,
      fechaNacimiento: true,
      club: { select: { nombre: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return jinetes.map((j) => ({
    id: j.id,
    nombre: j.nombre,
    clubId: j.clubId,
    clubNombre: j.club?.nombre,
    edad: esObservador ? null : edadEnEvento(j.fechaNacimiento, ctx.evento),
  }));
}

export async function listarJinetesActivos() {
  const ctx = await obtenerContexto();
  return ejecutarListarJinetesActivos(ctx);
}

export async function ejecutarListarCaballosActivos(ctx: Contexto) {
  exigir(ctx, "participantes.ver");
  const caballos = await db(ctx).caballo.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      clubId: true,
      club: { select: { nombre: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return caballos.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    clubId: c.clubId,
    clubNombre: c.club?.nombre,
  }));
}

export async function listarCaballosActivos() {
  const ctx = await obtenerContexto();
  return ejecutarListarCaballosActivos(ctx);
}

export async function ejecutarListarApoderadosActivos(ctx: Contexto) {
  exigir(ctx, "participantes.verDatosPersonales");
  return db(ctx).apoderado.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, telefono: true },
    orderBy: { nombre: "asc" },
  });
}

export async function listarApoderadosActivos() {
  const ctx = await obtenerContexto();
  return ejecutarListarApoderadosActivos(ctx);
}
