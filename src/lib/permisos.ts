import { Rol } from "@prisma/client";

export type Accion =
  | "ver_dashboard"
  | "ver_respaldos"
  | "ver_datos_personales"
  | "registrar"
  | "importar_excel"
  | "revisar_formulario"
  | "conciliar_cartola"
  | "editar_propio_no_validado"
  | "editar_validado"
  | "validar"
  | "anular"
  | "anular_propio_por_validar"
  | "marcar_pendiente_pagado"
  | "gestionar_accesos"
  | "configurar"
  | "cerrar_evento"
  | "ver_auditoria"
  | "ver_auditoria_propia"
  | "ver_comision"
  | "registrar_traspaso"
  // Participantes (§5.4 de participantes.md)
  | "participantes.ver"
  | "participantes.verDatosPersonales"
  | "participantes.crear"
  | "participantes.completarMenor"
  | "participantes.administrar"
  // Inscripciones (§5.4 de inscripcion-binomios.md)
  | "inscripciones.ver"
  | "inscripciones.verDatosPersonales"
  | "inscripciones.inscribir"
  | "inscripciones.ajustar"
  | "inscripciones.administrar";

export interface ContextoUsuario {
  id: string;
  correo: string;
  nombre: string | null;
  imagen: string | null;
}

export interface ContextoEvento {
  id: string;
  nombre: string;
  fechaInicio: Date;
  fechaTermino: Date;
  fechaReferenciaEdad: Date | null;
  lugar: string | null;
  estado: "abierto" | "cerrado" | "rendido";
}

export interface Contexto {
  usuario: ContextoUsuario;
  organizacionId: string;
  rol: Rol;
  evento: ContextoEvento | null;
}

/**
 * Matriz de permisos según el marco general §2.2, Acceso y roles §5.4,
 * Participantes §5.4 e Inscripción de binomios §5.4.
 */
export const MATRIZ_PERMISOS: Record<Rol, readonly Accion[]> = {
  administrador: [
    "ver_dashboard",
    "ver_respaldos",
    "ver_datos_personales",
    "registrar",
    "importar_excel",
    "revisar_formulario",
    "conciliar_cartola",
    "editar_propio_no_validado",
    "editar_validado",
    "validar",
    "anular",
    "anular_propio_por_validar",
    "marcar_pendiente_pagado",
    "gestionar_accesos",
    "configurar",
    "cerrar_evento",
    "ver_auditoria",
    "ver_auditoria_propia",
    "ver_comision",
    "registrar_traspaso",
    "participantes.ver",
    "participantes.verDatosPersonales",
    "participantes.crear",
    "participantes.completarMenor",
    "participantes.administrar",
    "inscripciones.ver",
    "inscripciones.verDatosPersonales",
    "inscripciones.inscribir",
    "inscripciones.ajustar",
    "inscripciones.administrar",
  ],
  ayudante: [
    "ver_dashboard",
    "ver_respaldos",
    "ver_datos_personales",
    "registrar",
    "revisar_formulario",
    "editar_propio_no_validado",
    "anular_propio_por_validar",
    "marcar_pendiente_pagado",
    "ver_auditoria_propia",
    "ver_comision",
    "participantes.ver",
    "participantes.verDatosPersonales",
    "participantes.crear",
    "participantes.completarMenor",
    "inscripciones.ver",
    "inscripciones.verDatosPersonales",
    "inscripciones.inscribir",
    "inscripciones.ajustar",
  ],
  observador: [
    "ver_dashboard",
    "ver_comision",
    "participantes.ver",
    "inscripciones.ver",
  ],
};

export class ErrorPermiso extends Error {
  readonly status = 403;
  constructor(mensaje = "No tienes permiso para realizar esta acción.") {
    super(mensaje);
    this.name = "ErrorPermiso";
  }
}

/**
 * Evalúa si el contexto tiene permiso para una acción en la matriz.
 */
export function puede(ctx: Contexto, accion: Accion): boolean {
  if (!ctx.rol) return false;
  const acciones = MATRIZ_PERMISOS[ctx.rol];
  return acciones ? acciones.includes(accion) : false;
}

/**
 * Exige que el contexto tenga permiso para una acción o lanza un error 403.
 */
export function exigir(ctx: Contexto, accion: Accion): void {
  if (!puede(ctx, accion)) {
    throw new ErrorPermiso(`No tienes permiso para la acción: ${accion}`);
  }
}

/**
 * Exige un rol específico en casos puntuales.
 */
export function exigirRol(ctx: Contexto, ...roles: Rol[]): void {
  if (!roles.includes(ctx.rol)) {
    throw new ErrorPermiso("Tu rol actual no tiene acceso a esta sección.");
  }
}

/**
 * Comprueba si un registro pertenece al usuario del contexto actual.
 */
export function esPropio(
  ctx: Contexto,
  registro: { registradoPorId?: string | null; enviadoAValidarPorId?: string | null; subidoPorId?: string | null }
): boolean {
  const creadorId = registro.enviadoAValidarPorId ?? registro.registradoPorId ?? registro.subidoPorId;
  return creadorId === ctx.usuario.id;
}

/**
 * Impide validar o aprobar registros propios (regla: nadie valida lo suyo).
 */
export function exigirNoPropio(
  ctx: Contexto,
  registro: { registradoPorId?: string | null; enviadoAValidarPorId?: string | null }
): void {
  if (esPropio(ctx, registro)) {
    throw new ErrorPermiso("No puedes validar ni aprobar un registro que tú mismo enviaste.");
  }
}

export function puedeVerDatosPersonales(ctx: Contexto): boolean {
  return puede(ctx, "ver_datos_personales");
}

export function puedeVerRespaldos(ctx: Contexto): boolean {
  return puede(ctx, "ver_respaldos");
}
