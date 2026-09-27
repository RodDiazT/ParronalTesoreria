import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "./auth";
import { prisma } from "./db";
import { Contexto, ContextoUsuario, ContextoEvento } from "./permisos";

export const AVISO_PRIVACIDAD_VERSION = 1;

/**
 * Obtiene la única organización del portal.
 * Usado cuando el solicitante todavía no tiene membresía aprobada.
 * (docs/acceso/acceso-roles.md §5.3)
 */
export async function obtenerOrganizacionUnica() {
  const organizaciones = await prisma.organizacion.findMany({
    take: 2,
  });

  if (organizaciones.length === 0) {
    throw new Error("No hay ninguna organización configurada en el sistema.");
  }

  if (organizaciones.length > 1) {
    throw new Error("Selector de organización no disponible: existe más de una organización.");
  }

  return organizaciones[0];
}

/**
 * Función única de contexto de la aplicación según docs/organizacion/organizacion-evento.md §3.6.
 * Obtiene el usuario autenticado, su membresía activa en la organización y el evento vigente.
 * Redirige a /ingresar, /bienvenida o /solicitud según corresponda.
 */
export async function obtenerContexto(): Promise<Contexto> {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    redirect("/ingresar");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    include: {
      membresias: {
        where: { estado: "activa" },
      },
    },
  });

  if (!usuario) {
    redirect("/ingresar");
  }

  // Verificar aviso de privacidad
  if (!usuario.avisoAceptadoEn || usuario.avisoVersion !== AVISO_PRIVACIDAD_VERSION) {
    redirect("/bienvenida");
  }

  const membresia = usuario.membresias[0];
  if (!membresia || !membresia.rol) {
    redirect("/solicitud");
  }

  const organizacionId = membresia.organizacionId;

  // Determinar evento vigente: único evento abierto; si no, el más reciente cerrado o rendido
  let eventoVigente = await prisma.evento.findFirst({
    where: {
      organizacionId,
      estado: "abierto",
    },
  });

  if (!eventoVigente) {
    eventoVigente = await prisma.evento.findFirst({
      where: {
        organizacionId,
        estado: { in: ["cerrado", "rendido"] },
      },
      orderBy: { creadoEn: "desc" },
    });
  }

  const contextoUsuario: ContextoUsuario = {
    id: usuario.id,
    correo: usuario.correo,
    nombre: usuario.nombre,
    imagen: usuario.imagen,
  };

  const contextoEvento: ContextoEvento | null = eventoVigente
    ? {
        id: eventoVigente.id,
        nombre: eventoVigente.nombre,
        fechaInicio: eventoVigente.fechaInicio,
        fechaTermino: eventoVigente.fechaTermino,
        fechaReferenciaEdad: eventoVigente.fechaReferenciaEdad,
        lugar: eventoVigente.lugar,
        estado: eventoVigente.estado,
      }
    : null;

  return {
    usuario: contextoUsuario,
    organizacionId,
    rol: membresia.rol,
    evento: contextoEvento,
  };
}

/**
 * Cliente Prisma extendido que aplica automáticamente el aislamiento por organizacionId
 * a todas las consultas sobre modelos del dominio.
 * (docs/organizacion/organizacion-evento.md §5.2)
 */
export function db(ctx: Contexto) {
  const orgId = ctx.organizacionId;

  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          // Modelos que pertenecen a Organizacion
          if (model !== "Organizacion" && model !== "Usuario" && model !== "Account" && model !== "Session") {
            args.where = { ...(args.where || {}), organizacionId: orgId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (model !== "Organizacion" && model !== "Usuario" && model !== "Account" && model !== "Session") {
            args.where = { ...(args.where || {}), organizacionId: orgId };
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (model !== "Organizacion" && model !== "Usuario" && model !== "Account" && model !== "Session") {
            args.where = { ...(args.where || {}), organizacionId: orgId };
          }
          return query(args);
        },
        async create({ model, args, query }) {
          if (model !== "Organizacion" && model !== "Usuario" && model !== "Account" && model !== "Session") {
            args.data = { ...(args.data as any), organizacionId: orgId };
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (model !== "Organizacion" && model !== "Usuario" && model !== "Account" && model !== "Session") {
            args.where = { ...(args.where || {}), organizacionId: orgId };
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (model !== "Organizacion" && model !== "Usuario" && model !== "Account" && model !== "Session") {
            args.where = { ...(args.where || {}), organizacionId: orgId };
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (model !== "Organizacion" && model !== "Usuario" && model !== "Account" && model !== "Session") {
            args.where = { ...(args.where || {}), organizacionId: orgId };
          }
          return query(args);
        },
      },
    },
  });
}

/**
 * Valida que una entidad referenciada pertenezca efectivamente a la organización del contexto.
 * Corta con error si no existe o pertenece a otra organización.
 * (docs/organizacion/organizacion-evento.md §5.2)
 */
export async function exigirDeLaOrganizacion(
  ctx: Contexto,
  modelo: string,
  id: string
): Promise<void> {
  const cliente = db(ctx);
  const modeloDelegate = (cliente as any)[modelo];

  if (!modeloDelegate || typeof modeloDelegate.findFirst !== "function") {
    throw new Error(`Modelo no reconocido para validación de organización: ${modelo}`);
  }

  const registro = await modeloDelegate.findFirst({
    where: { id },
    select: { id: true },
  });

  if (!registro) {
    throw new Error(`El registro ${modelo} con ID ${id} no pertenece a tu organización o no existe.`);
  }
}

/**
 * Oculta datos personales según el rol del usuario (regla del Observador).
 * (docs/organizacion/organizacion-evento.md §5.2 y docs/acceso/acceso-roles.md §3.6)
 */
export function ocultarDatosPersonales<T extends Record<string, any>>(
  ctx: Contexto,
  datos: T
): T {
  if (ctx.rol !== "observador") {
    return datos;
  }

  const copia = { ...datos };
  delete (copia as any).contacto;
  delete (copia as any).rut;
  delete (copia as any).telefono;
  delete (copia as any).telefonoNormalizado;
  delete (copia as any).fechaNacimiento;
  delete (copia as any).autorizacionApoderadoFecha;
  delete (copia as any).apoderados;

  return copia;
}

/**
 * Registra una acción en la auditoría inmutable del sistema.
 * (docs/marco-general/marco-general-proyecto.md §6.8)
 */
export async function registrarAuditoria(
  ctx: Contexto,
  params: {
    entidad: string;
    entidadId: string;
    accion: string;
    antes?: Prisma.InputJsonValue;
    despues?: Prisma.InputJsonValue;
  }
) {
  return prisma.registroAuditoria.create({
    data: {
      organizacionId: ctx.organizacionId,
      usuarioId: ctx.usuario.id,
      entidad: params.entidad,
      entidadId: params.entidadId,
      accion: params.accion,
      antes: params.antes ?? undefined,
      despues: params.despues ?? undefined,
    },
  });
}
