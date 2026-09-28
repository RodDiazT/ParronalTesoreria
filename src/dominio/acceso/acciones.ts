"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, EstadoMembresia } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  Contexto,
  exigir,
  puede,
  ErrorPermiso,
} from "@/lib/permisos";
import {
  obtenerContexto,
  obtenerOrganizacionUnica,
  AVISO_PRIVACIDAD_VERSION,
} from "@/lib/contexto";
import { auth } from "@/lib/auth";

// ============================================================================
// Esquemas de validación Zod
// ============================================================================

const esquemaSolicitarAcceso = z.object({
  mensaje: z
    .string()
    .max(200, "El mensaje no puede tener más de 200 caracteres.")
    .optional(),
});

const esquemaAprobarSolicitud = z.object({
  membresiaId: z.string().min(1, "El ID de membresía es obligatorio."),
  rol: z.nativeEnum(Rol),
  version: z.number().int().positive(),
});

const esquemaRechazarSolicitud = z.object({
  membresiaId: z.string().min(1, "El ID de membresía es obligatorio."),
  motivo: z.string().optional(),
  version: z.number().int().positive(),
});

const esquemaInvitar = z.object({
  correo: z
    .string()
    .email("Correo electrónico inválido.")
    .transform((val) => val.trim().toLowerCase()),
  rol: z.nativeEnum(Rol),
});

const esquemaCambiarRol = z.object({
  membresiaId: z.string().min(1, "El ID de membresía es obligatorio."),
  rol: z.nativeEnum(Rol),
  version: z.number().int().positive(),
});

const esquemaRevocar = z.object({
  membresiaId: z.string().min(1, "El ID de membresía es obligatorio."),
  motivo: z.string().min(1, "El motivo de revocación es obligatorio."),
  version: z.number().int().positive(),
});

const esquemaReactivar = z.object({
  membresiaId: z.string().min(1, "El ID de membresía es obligatorio."),
  rol: z.nativeEnum(Rol),
  version: z.number().int().positive(),
});

const esquemaSuprimirDatos = z.object({
  membresiaId: z.string().min(1, "El ID de membresía es obligatorio."),
});

// ============================================================================
// Funciones de Lógica de Negocio (Ejecutores con inyección de contexto/usuario)
// ============================================================================

/**
 * Registra la aceptación del aviso de privacidad para el usuario actual.
 */
export async function ejecutarAceptarAviso(usuarioId: string) {
  const ahora = new Date();

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, correo: true },
  });

  if (!usuario) {
    throw new Error("Usuario no encontrado.");
  }

  // Buscar organización para la auditoría (su membresía o la única organización del portal)
  const membresia = await prisma.membresia.findFirst({
    where: { usuarioId },
    select: { organizacionId: true },
  });

  let organizacionId = membresia?.organizacionId;
  if (!organizacionId) {
    const orgUnica = await obtenerOrganizacionUnica();
    organizacionId = orgUnica.id;
  }

  const [usuarioActualizado] = await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        avisoVersion: AVISO_PRIVACIDAD_VERSION,
        avisoAceptadoEn: ahora,
      },
    }),
    prisma.registroAuditoria.create({
      data: {
        organizacionId,
        usuarioId,
        entidad: "Usuario",
        entidadId: usuarioId,
        accion: "aceptar_aviso",
        despues: {
          avisoVersion: AVISO_PRIVACIDAD_VERSION,
          fecha: ahora.toISOString(),
        },
      },
    }),
  ]);

  return {
    ok: true,
    avisoVersion: usuarioActualizado.avisoVersion,
    avisoAceptadoEn: usuarioActualizado.avisoAceptadoEn,
  };
}

/**
 * Envía o renueva una solicitud de acceso para un usuario sin membresía activa.
 */
export async function ejecutarSolicitarAcceso(
  usuarioId: string,
  datos: z.infer<typeof esquemaSolicitarAcceso>
) {
  const { mensaje } = esquemaSolicitarAcceso.parse(datos);
  const org = await obtenerOrganizacionUnica();
  const ahora = new Date();

  return prisma.$transaction(async (tx) => {
    const existente = await tx.membresia.findUnique({
      where: {
        organizacionId_usuarioId: {
          organizacionId: org.id,
          usuarioId,
        },
      },
    });

    if (existente) {
      if (existente.estado === "activa") {
        throw new Error("Ya tienes acceso activo al portal.");
      }
      if (existente.estado === "solicitada") {
        throw new Error("Tu solicitud de acceso ya está pendiente de revisión.");
      }

      // Previamente revocada o rechazada: se vuelve a solicitar
      const actualizada = await tx.membresia.update({
        where: { id: existente.id },
        data: {
          estado: "solicitada",
          mensajeSolicitud: mensaje?.trim() || null,
          solicitadaEn: ahora,
          version: { increment: 1 },
        },
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: org.id,
          usuarioId,
          entidad: "Membresia",
          entidadId: actualizada.id,
          accion: "solicitar_acceso",
          despues: {
            mensaje: mensaje?.trim() || null,
            reintento: true,
            version: actualizada.version,
          },
        },
      });

      return { ok: true, membresiaId: actualizada.id, estado: actualizada.estado };
    }

    // Nueva solicitud
    const nueva = await tx.membresia.create({
      data: {
        organizacionId: org.id,
        usuarioId,
        estado: "solicitada",
        mensajeSolicitud: mensaje?.trim() || null,
        solicitadaEn: ahora,
        version: 1,
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: org.id,
        usuarioId,
        entidad: "Membresia",
        entidadId: nueva.id,
        accion: "solicitar_acceso",
        despues: {
          mensaje: mensaje?.trim() || null,
          version: 1,
        },
      },
    });

    return { ok: true, membresiaId: nueva.id, estado: nueva.estado };
  });
}

/**
 * Aprueba una solicitud de acceso asignándole un rol.
 */
export async function ejecutarAprobarSolicitud(
  ctx: Contexto,
  datos: z.infer<typeof esquemaAprobarSolicitud>
) {
  exigir(ctx, "gestionar_accesos");
  const { membresiaId, rol, version } = esquemaAprobarSolicitud.parse(datos);

  return prisma.$transaction(async (tx) => {
    const membresia = await tx.membresia.findUnique({
      where: { id: membresiaId },
      include: { usuario: true },
    });

    if (!membresia || membresia.organizacionId !== ctx.organizacionId) {
      throw new Error("La solicitud no existe en esta organización.");
    }

    if (membresia.version !== version) {
      throw new Error("Alguien cambió este registro mientras lo editabas.");
    }

    if (membresia.estado !== "solicitada") {
      throw new Error("La solicitud no está en estado pendiente.");
    }

    const ahora = new Date();
    const actualizada = await tx.membresia.update({
      where: { id: membresiaId },
      data: {
        estado: "activa",
        rol,
        aprobadaEn: ahora,
        aprobadaPorId: ctx.usuario.id,
        version: { increment: 1 },
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Membresia",
        entidadId: membresiaId,
        accion: "aprobar_acceso",
        despues: {
          rol,
          usuarioId: membresia.usuarioId,
          correo: membresia.usuario.correo,
          version: actualizada.version,
        },
      },
    });

    return { ok: true, version: actualizada.version };
  });
}

/**
 * Rechaza una solicitud de acceso (pasa a revocada con motivo opcional interno).
 */
export async function ejecutarRechazarSolicitud(
  ctx: Contexto,
  datos: z.infer<typeof esquemaRechazarSolicitud>
) {
  exigir(ctx, "gestionar_accesos");
  const { membresiaId, motivo, version } = esquemaRechazarSolicitud.parse(datos);

  return prisma.$transaction(async (tx) => {
    const membresia = await tx.membresia.findUnique({
      where: { id: membresiaId },
      include: { usuario: true },
    });

    if (!membresia || membresia.organizacionId !== ctx.organizacionId) {
      throw new Error("La solicitud no existe en esta organización.");
    }

    if (membresia.version !== version) {
      throw new Error("Alguien cambió este registro mientras lo editabas.");
    }

    if (membresia.estado !== "solicitada") {
      throw new Error("La solicitud no está en estado pendiente.");
    }

    const ahora = new Date();
    const actualizada = await tx.membresia.update({
      where: { id: membresiaId },
      data: {
        estado: "revocada",
        motivoRevocacion: motivo?.trim() || null,
        revocadaEn: ahora,
        revocadaPorId: ctx.usuario.id,
        version: { increment: 1 },
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Membresia",
        entidadId: membresiaId,
        accion: "rechazar_acceso",
        despues: {
          motivo: motivo?.trim() || null,
          usuarioId: membresia.usuarioId,
          version: actualizada.version,
        },
      },
    });

    return { ok: true, version: actualizada.version };
  });
}

/**
 * Invita a una persona por correo de Google con un rol preasignado.
 */
export async function ejecutarInvitar(
  ctx: Contexto,
  datos: z.infer<typeof esquemaInvitar>
) {
  exigir(ctx, "gestionar_accesos");
  const { correo, rol } = esquemaInvitar.parse(datos);

  return prisma.$transaction(async (tx) => {
    let usuario = await tx.usuario.findUnique({
      where: { correo },
    });

    if (!usuario) {
      usuario = await tx.usuario.create({
        data: {
          correo,
        },
      });
    }

    const membresiaExistente = await tx.membresia.findUnique({
      where: {
        organizacionId_usuarioId: {
          organizacionId: ctx.organizacionId,
          usuarioId: usuario.id,
        },
      },
    });

    const ahora = new Date();

    if (membresiaExistente) {
      if (membresiaExistente.estado === "activa") {
        throw new Error(`Este correo ya tiene acceso activo como ${membresiaExistente.rol}.`);
      }

      if (membresiaExistente.estado === "solicitada") {
        // Deriva en aprobación de la solicitud
        const actualizada = await tx.membresia.update({
          where: { id: membresiaExistente.id },
          data: {
            estado: "activa",
            rol,
            aprobadaEn: ahora,
            aprobadaPorId: ctx.usuario.id,
            version: { increment: 1 },
          },
        });

        await tx.registroAuditoria.create({
          data: {
            organizacionId: ctx.organizacionId,
            usuarioId: ctx.usuario.id,
            entidad: "Membresia",
            entidadId: actualizada.id,
            accion: "aprobar_acceso",
            despues: {
              rol,
              correo,
              invitacionConvertida: true,
              version: actualizada.version,
            },
          },
        });

        return { ok: true, accion: "aprobada", membresiaId: actualizada.id };
      }

      // membresiaExistente.estado === "revocada": reactivar
      const reactivada = await tx.membresia.update({
        where: { id: membresiaExistente.id },
        data: {
          estado: "activa",
          rol,
          aprobadaEn: ahora,
          aprobadaPorId: ctx.usuario.id,
          revocadaEn: null,
          revocadaPorId: null,
          motivoRevocacion: null,
          version: { increment: 1 },
        },
      });

      await tx.registroAuditoria.create({
        data: {
          organizacionId: ctx.organizacionId,
          usuarioId: ctx.usuario.id,
          entidad: "Membresia",
          entidadId: reactivada.id,
          accion: "reactivar_acceso",
          despues: {
            rol,
            correo,
            invitacionReactivada: true,
            version: reactivada.version,
          },
        },
      });

      return { ok: true, accion: "reactivada", membresiaId: reactivada.id };
    }

    // Crear membresía nueva como invitado activo
    const nueva = await tx.membresia.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: usuario.id,
        rol,
        estado: "activa",
        aprobadaEn: ahora,
        invitadaPorId: ctx.usuario.id,
        version: 1,
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Membresia",
        entidadId: nueva.id,
        accion: "invitar",
        despues: {
          correo,
          rol,
          version: 1,
        },
      },
    });

    return { ok: true, accion: "creada", membresiaId: nueva.id };
  });
}

/**
 * Cambia el rol de un miembro activo, con bloqueo y verificación del mínimo de administradores.
 */
export async function ejecutarCambiarRol(
  ctx: Contexto,
  datos: z.infer<typeof esquemaCambiarRol>
) {
  exigir(ctx, "gestionar_accesos");
  const { membresiaId, rol, version } = esquemaCambiarRol.parse(datos);

  return prisma.$transaction(async (tx) => {
    // 1. Bloqueo de filas de administradores activos
    const admins = await tx.$queryRaw<Array<{ id: string; usuario_id: string }>>`
      SELECT id, usuario_id
      FROM membresia
      WHERE organizacion_id = ${ctx.organizacionId}
        AND estado = 'activa'::"EstadoMembresia"
        AND rol = 'administrador'::"Rol"
      FOR UPDATE
    `;

    const membresia = await tx.membresia.findUnique({
      where: { id: membresiaId },
      include: { usuario: true },
    });

    if (!membresia || membresia.organizacionId !== ctx.organizacionId) {
      throw new Error("La membresía no existe en esta organización.");
    }

    if (membresia.version !== version) {
      throw new Error("Alguien cambió este registro mientras lo editabas.");
    }

    if (membresia.estado !== "activa") {
      throw new Error("Solo se puede cambiar el rol de una membresía activa.");
    }

    // 2. Verificar que no quede sin administradores activos
    if (membresia.rol === "administrador" && rol !== "administrador") {
      const esAdminActivo = admins.some((a) => a.id === membresia.id);
      if (esAdminActivo && admins.length <= 1) {
        throw new Error("La organización debe tener al menos un administrador activo.");
      }
    }

    const rolAnterior = membresia.rol;
    const actualizada = await tx.membresia.update({
      where: { id: membresiaId },
      data: {
        rol,
        version: { increment: 1 },
      },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Membresia",
        entidadId: membresiaId,
        accion: "cambiar_rol",
        antes: { rol: rolAnterior },
        despues: {
          rol,
          usuarioId: membresia.usuarioId,
          version: actualizada.version,
        },
      },
    });

    return { ok: true, version: actualizada.version };
  });
}

/**
 * Revoca el acceso a un miembro activo o invitado, cerrando de inmediato sus sesiones.
 */
export async function ejecutarRevocar(
  ctx: Contexto,
  datos: z.infer<typeof esquemaRevocar>
) {
  exigir(ctx, "gestionar_accesos");
  const { membresiaId, motivo, version } = esquemaRevocar.parse(datos);

  return prisma.$transaction(async (tx) => {
    // 1. Bloqueo de filas de administradores activos
    const admins = await tx.$queryRaw<Array<{ id: string; usuario_id: string }>>`
      SELECT id, usuario_id
      FROM membresia
      WHERE organizacion_id = ${ctx.organizacionId}
        AND estado = 'activa'::"EstadoMembresia"
        AND rol = 'administrador'::"Rol"
      FOR UPDATE
    `;

    const membresia = await tx.membresia.findUnique({
      where: { id: membresiaId },
      include: { usuario: true },
    });

    if (!membresia || membresia.organizacionId !== ctx.organizacionId) {
      throw new Error("La membresía no existe en esta organización.");
    }

    if (membresia.version !== version) {
      throw new Error("Alguien cambió este registro mientras lo editabas.");
    }

    if (membresia.estado === "revocada") {
      throw new Error("La membresía ya se encuentra revocada.");
    }

    // 2. Verificar que no quede sin administradores activos
    if (membresia.rol === "administrador" && membresia.estado === "activa") {
      const esAdminActivo = admins.some((a) => a.id === membresia.id);
      if (esAdminActivo && admins.length <= 1) {
        throw new Error("La organización debe tener al menos un administrador activo.");
      }
    }

    const ahora = new Date();
    const actualizada = await tx.membresia.update({
      where: { id: membresiaId },
      data: {
        estado: "revocada",
        motivoRevocacion: motivo.trim(),
        revocadaEn: ahora,
        revocadaPorId: ctx.usuario.id,
        version: { increment: 1 },
      },
    });

    // Cerrar de inmediato todas las sesiones activas del usuario revocado
    await tx.session.deleteMany({
      where: { usuarioId: membresia.usuarioId },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Membresia",
        entidadId: membresiaId,
        accion: "revocar_acceso",
        despues: {
          motivo: motivo.trim(),
          usuarioId: membresia.usuarioId,
          version: actualizada.version,
        },
      },
    });

    return { ok: true, version: actualizada.version };
  });
}

/**
 * Reactiva una membresía revocada o rechazada asignándole un rol.
 */
export async function ejecutarReactivar(
  ctx: Contexto,
  datos: z.infer<typeof esquemaReactivar>
) {
  exigir(ctx, "gestionar_accesos");
  const { membresiaId, rol, version } = esquemaReactivar.parse(datos);

  return prisma.$transaction(async (tx) => {
    const membresia = await tx.membresia.findUnique({
      where: { id: membresiaId },
      include: { usuario: true },
    });

    if (!membresia || membresia.organizacionId !== ctx.organizacionId) {
      throw new Error("La membresía no existe en esta organización.");
    }

    if (membresia.version !== version) {
      throw new Error("Alguien cambió este registro mientras lo editabas.");
    }

    if (membresia.estado !== "revocada") {
      throw new Error("Solo se puede reactivar una membresía revocada o rechazada.");
    }

    const ahora = new Date();
    const actualizada = await tx.membresia.update({
      where: { id: membresiaId },
      data: {
        estado: "activa",
        rol,
        aprobadaEn: ahora,
        aprobadaPorId: ctx.usuario.id,
        revocadaEn: null,
        revocadaPorId: null,
        motivoRevocacion: null,
        version: { increment: 1 },
      },
    });

    // Limpieza de cualquier sesión remanente
    await tx.session.deleteMany({
      where: { usuarioId: membresia.usuarioId },
    });

    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Membresia",
        entidadId: membresiaId,
        accion: "reactivar_acceso",
        despues: {
          rol,
          usuarioId: membresia.usuarioId,
          version: actualizada.version,
        },
      },
    });

    return { ok: true, version: actualizada.version };
  });
}

/**
 * Suprime los datos personales de un usuario rechazado o revocado (Ley 19.628 / 21.719).
 * Conserva el nombre para trazabilidad de movimientos pasados y anonimiza el correo e imagen.
 */
export async function ejecutarSuprimirDatosUsuario(
  ctx: Contexto,
  datos: z.infer<typeof esquemaSuprimirDatos>
) {
  exigir(ctx, "gestionar_accesos");
  const { membresiaId } = esquemaSuprimirDatos.parse(datos);

  return prisma.$transaction(async (tx) => {
    const membresia = await tx.membresia.findUnique({
      where: { id: membresiaId },
      include: { usuario: true },
    });

    if (!membresia || membresia.organizacionId !== ctx.organizacionId) {
      throw new Error("La membresía no existe en esta organización.");
    }

    if (membresia.estado !== "revocada") {
      throw new Error("Solo se pueden suprimir datos de un usuario con acceso revocado o rechazado.");
    }

    const usuarioId = membresia.usuarioId;
    const ahora = new Date();

    // Anonimizar usuario
    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        correo: `suprimido-${usuarioId}`,
        imagen: null,
        suprimidoEn: ahora,
      },
    });

    // Limpiar mensaje de solicitud en la membresía
    await tx.membresia.update({
      where: { id: membresiaId },
      data: {
        mensajeSolicitud: null,
        version: { increment: 1 },
      },
    });

    // Eliminar cuentas vinculadas y sesiones
    await tx.account.deleteMany({ where: { usuarioId } });
    await tx.session.deleteMany({ where: { usuarioId } });

    // Registro de auditoría sin copiar datos eliminados
    await tx.registroAuditoria.create({
      data: {
        organizacionId: ctx.organizacionId,
        usuarioId: ctx.usuario.id,
        entidad: "Usuario",
        entidadId: usuarioId,
        accion: "suprimir_datos",
        despues: {
          suprimido: true,
          fecha: ahora.toISOString(),
        },
      },
    });

    return { ok: true };
  });
}

/**
 * Cierra todas las sesiones activas del usuario en todos los dispositivos.
 */
export async function ejecutarCerrarMisSesiones(usuarioId: string) {
  await prisma.session.deleteMany({
    where: { usuarioId },
  });

  const membresia = await prisma.membresia.findFirst({
    where: { usuarioId, estado: "activa" },
    select: { organizacionId: true },
  });

  if (membresia) {
    await prisma.registroAuditoria.create({
      data: {
        organizacionId: membresia.organizacionId,
        usuarioId,
        entidad: "Usuario",
        entidadId: usuarioId,
        accion: "cerrar_sesiones",
        despues: { fecha: new Date().toISOString() },
      },
    });
  }

  return { ok: true };
}

/**
 * Conteo de movimientos pendientes y reembolsos por pagar de un usuario
 * para la advertencia previa a revocar o bajar de rol.
 */
export async function ejecutarResumenPendientesDe(
  ctx: Contexto,
  usuarioId: string
) {
  exigir(ctx, "gestionar_accesos");

  const movimientosPorValidar = await prisma.movimiento.count({
    where: {
      organizacionId: ctx.organizacionId,
      registradoPorId: usuarioId,
      estadoValidacion: { in: ["por_validar", "observado"] },
      anulado: false,
    },
  });

  const reembolsosPendientes = await prisma.movimiento.count({
    where: {
      organizacionId: ctx.organizacionId,
      pagadoPorId: usuarioId,
      tipo: "gasto",
      estadoPago: "pendiente",
      anulado: false,
    },
  });

  return {
    porValidar: movimientosPorValidar,
    reembolsosPendientes,
    total: movimientosPorValidar + reembolsosPendientes,
  };
}

// ============================================================================
// Server Actions para Next.js (obtienen el contexto de sesión automáticamente)
// ============================================================================

export async function aceptarAviso() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No hay sesión activa.");
  }
  return ejecutarAceptarAviso(session.user.id);
}

export async function solicitarAcceso(datos: { mensaje?: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No hay sesión activa.");
  }
  return ejecutarSolicitarAcceso(session.user.id, datos);
}

export async function aprobarSolicitud(datos: {
  membresiaId: string;
  rol: Rol;
  version: number;
}) {
  const ctx = await obtenerContexto();
  return ejecutarAprobarSolicitud(ctx, datos);
}

export async function rechazarSolicitud(datos: {
  membresiaId: string;
  motivo?: string;
  version: number;
}) {
  const ctx = await obtenerContexto();
  return ejecutarRechazarSolicitud(ctx, datos);
}

export async function invitar(datos: { correo: string; rol: Rol }) {
  const ctx = await obtenerContexto();
  return ejecutarInvitar(ctx, datos);
}

export async function cambiarRol(datos: {
  membresiaId: string;
  rol: Rol;
  version: number;
}) {
  const ctx = await obtenerContexto();
  return ejecutarCambiarRol(ctx, datos);
}

export async function revocar(datos: {
  membresiaId: string;
  motivo: string;
  version: number;
}) {
  const ctx = await obtenerContexto();
  return ejecutarRevocar(ctx, datos);
}

export async function reactivar(datos: {
  membresiaId: string;
  rol: Rol;
  version: number;
}) {
  const ctx = await obtenerContexto();
  return ejecutarReactivar(ctx, datos);
}

export async function suprimirDatosUsuario(datos: { membresiaId: string }) {
  const ctx = await obtenerContexto();
  return ejecutarSuprimirDatosUsuario(ctx, datos);
}

export async function cerrarMisSesiones() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: true };
  }
  return ejecutarCerrarMisSesiones(session.user.id);
}

export async function resumenPendientesDe(usuarioId: string) {
  const ctx = await obtenerContexto();
  return ejecutarResumenPendientesDe(ctx, usuarioId);
}

// ============================================================================
// Consultas de Lectura de Acceso y Perfil (Identidad de Usuario)
// ============================================================================

export async function obtenerUsuarioParaBienvenida(usuarioId: string) {
  return prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      id: true,
      nombre: true,
      avisoVersion: true,
      avisoAceptadoEn: true,
    },
  });
}

export async function obtenerDatosSolicitud(usuarioId: string) {
  return prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      membresias: {
        orderBy: { creadoEn: "desc" },
      },
    },
  });
}

export async function obtenerDatosMiCuenta(usuarioId: string) {
  return prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      membresias: {
        where: { estado: "activa" },
        include: { organizacion: { select: { nombre: true } } },
      },
    },
  });
}

export async function obtenerExportacionDatos(usuarioId: string) {
  return prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      membresias: {
        include: {
          organizacion: {
            select: { nombre: true },
          },
        },
      },
    },
  });
}

// ============================================================================
// Edición de Perfil de Usuario (§3.4)
// ============================================================================

const esquemaActualizarPerfil = z.object({
  nombre: z
    .string({ required_error: "El nombre es obligatorio." })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "El nombre no puede tener más de 120 caracteres."),
  telefono: z
    .string()
    .trim()
    .max(30, "El teléfono no puede tener más de 30 caracteres.")
    .optional()
    .nullable(),
});

export type ActualizarPerfilInput = z.infer<typeof esquemaActualizarPerfil>;

export async function ejecutarActualizarMiPerfil(
  usuarioId: string,
  datos: { nombre: string; telefono?: string | null }
) {
  const parseado = esquemaActualizarPerfil.safeParse(datos);
  if (!parseado.success) {
    return {
      exito: false,
      error: parseado.error.errors[0]?.message || "Datos de perfil no válidos.",
    };
  }

  // 1. Verificar usuario
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      membresias: {
        where: { estado: "activa" },
      },
    },
  });

  if (!usuario) {
    return { exito: false, error: "Usuario no encontrado." };
  }

  // 2. Verificar membresía activa (Regla 3.4 §2: Si está en estado solicitada o revocada, o no tiene, rechazar con 403)
  if (!usuario.membresias || usuario.membresias.length === 0) {
    return {
      exito: false,
      error: "No tienes una membresía activa para editar tu perfil.",
      codigo: 403,
    };
  }

  const { nombre, telefono } = parseado.data;

  const actualizado = await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      nombre,
      telefono: telefono && telefono.length > 0 ? telefono : null,
    },
  });

  try {
    revalidatePath("/mi-cuenta");
    revalidatePath("/", "layout");
  } catch {
    // Entorno de pruebas sin Next.js
  }

  return { exito: true, usuario: actualizado };
}

export async function actualizarMiPerfil(datos: { nombre: string; telefono?: string | null }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { exito: false, error: "Debes iniciar sesión para actualizar tu perfil." };
  }
  return ejecutarActualizarMiPerfil(session.user.id, datos);
}


