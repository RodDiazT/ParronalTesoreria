import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { Contexto, ErrorPermiso } from "@/lib/permisos";
import {
  ejecutarAceptarAviso,
  ejecutarSolicitarAcceso,
  ejecutarAprobarSolicitud,
  ejecutarRechazarSolicitud,
  ejecutarInvitar,
  ejecutarCambiarRol,
  ejecutarRevocar,
  ejecutarReactivar,
  ejecutarSuprimirDatosUsuario,
  ejecutarCerrarMisSesiones,
  ejecutarResumenPendientesDe,
} from "./acciones";
import { AVISO_PRIVACIDAD_VERSION } from "@/lib/contexto";

describe("src/dominio/acceso/acciones.ts", () => {
  let orgId: string;
  let adminId: string;
  let ayudanteId: string;
  let observadorId: string;

  let ctxAdmin: Contexto;
  let ctxAyudante: Contexto;
  let ctxObservador: Contexto;

  beforeAll(async () => {
    // Buscar la organización existente de la carga inicial
    const org = await prisma.organizacion.findFirstOrThrow({
      orderBy: { creadoEn: "asc" },
    });
    orgId = org.id;

    // Crear usuarios de prueba con correos únicos
    const adminUser = await prisma.usuario.create({
      data: {
        correo: `test-admin-${Date.now()}@club.cl`,
        nombre: "Admin Test",
      },
    });
    adminId = adminUser.id;

    const ayudanteUser = await prisma.usuario.create({
      data: {
        correo: `test-ayudante-${Date.now()}@club.cl`,
        nombre: "Ayudante Test",
      },
    });
    ayudanteId = ayudanteUser.id;

    const observadorUser = await prisma.usuario.create({
      data: {
        correo: `test-obs-${Date.now()}@club.cl`,
        nombre: "Observador Test",
      },
    });
    observadorId = observadorUser.id;

    // Membresías
    await prisma.membresia.create({
      data: {
        organizacionId: orgId,
        usuarioId: adminId,
        rol: "administrador",
        estado: "activa",
        version: 1,
      },
    });

    await prisma.membresia.create({
      data: {
        organizacionId: orgId,
        usuarioId: ayudanteId,
        rol: "ayudante",
        estado: "activa",
        version: 1,
      },
    });

    await prisma.membresia.create({
      data: {
        organizacionId: orgId,
        usuarioId: observadorId,
        rol: "observador",
        estado: "activa",
        version: 1,
      },
    });

    ctxAdmin = {
      usuario: { id: adminId, correo: adminUser.correo, nombre: "Admin Test", imagen: null },
      organizacionId: orgId,
      rol: "administrador",
      evento: null,
    };

    ctxAyudante = {
      usuario: { id: ayudanteId, correo: ayudanteUser.correo, nombre: "Ayudante Test", imagen: null },
      organizacionId: orgId,
      rol: "ayudante",
      evento: null,
    };

    ctxObservador = {
      usuario: { id: observadorId, correo: observadorUser.correo, nombre: "Observador Test", imagen: null },
      organizacionId: orgId,
      rol: "observador",
      evento: null,
    };
  });

  afterAll(async () => {
    // Limpieza de datos creados en la prueba
    const userIds = [adminId, ayudanteId, observadorId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.registroAuditoria.deleteMany({ where: { usuarioId: { in: userIds } } });
      await prisma.session.deleteMany({ where: { usuarioId: { in: userIds } } });
      await prisma.account.deleteMany({ where: { usuarioId: { in: userIds } } });
      await prisma.membresia.deleteMany({ where: { usuarioId: { in: userIds } } });
      await prisma.usuario.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  describe("Control de permisos en servidor", () => {
    it("rechaza con ErrorPermiso a ayudante y observador al intentar gestionar accesos", async () => {
      await expect(
        ejecutarInvitar(ctxAyudante, { correo: "alguien@test.cl", rol: "ayudante" })
      ).rejects.toThrow(ErrorPermiso);

      await expect(
        ejecutarInvitar(ctxObservador, { correo: "alguien@test.cl", rol: "ayudante" })
      ).rejects.toThrow(ErrorPermiso);

      await expect(
        ejecutarAprobarSolicitud(ctxAyudante, { membresiaId: "dummy", rol: "ayudante", version: 1 })
      ).rejects.toThrow(ErrorPermiso);

      await expect(
        ejecutarRechazarSolicitud(ctxObservador, { membresiaId: "dummy", version: 1 })
      ).rejects.toThrow(ErrorPermiso);

      await expect(
        ejecutarRevocar(ctxAyudante, { membresiaId: "dummy", motivo: "test", version: 1 })
      ).rejects.toThrow(ErrorPermiso);

      await expect(
        ejecutarReactivar(ctxObservador, { membresiaId: "dummy", rol: "ayudante", version: 1 })
      ).rejects.toThrow(ErrorPermiso);

      await expect(
        ejecutarSuprimirDatosUsuario(ctxAyudante, { membresiaId: "dummy" })
      ).rejects.toThrow(ErrorPermiso);

      await expect(
        ejecutarResumenPendientesDe(ctxAyudante, "dummy")
      ).rejects.toThrow(ErrorPermiso);
    });
  });

  describe("Aceptación del aviso de privacidad", () => {
    it("registra avisoVersion y avisoAceptadoEn con auditoría", async () => {
      const res = await ejecutarAceptarAviso(ayudanteId);
      expect(res.ok).toBe(true);
      expect(res.avisoVersion).toBe(AVISO_PRIVACIDAD_VERSION);
      expect(res.avisoAceptadoEn).toBeInstanceOf(Date);

      const audit = await prisma.registroAuditoria.findFirst({
        where: {
          entidad: "Usuario",
          entidadId: ayudanteId,
          accion: "aceptar_aviso",
        },
      });
      expect(audit).not.toBeNull();
    });
  });

  describe("Ciclo de vida y transiciones de Membresía", () => {
    let nuevoUsuarioId: string;
    let membresiaId: string;

    beforeAll(async () => {
      const u = await prisma.usuario.create({
        data: {
          correo: `solicitante-${Date.now()}@club.cl`,
          nombre: "Solicitante Test",
        },
      });
      nuevoUsuarioId = u.id;
    });

    afterAll(async () => {
      await prisma.registroAuditoria.deleteMany({ where: { usuarioId: nuevoUsuarioId } });
      await prisma.membresia.deleteMany({ where: { usuarioId: nuevoUsuarioId } });
      await prisma.usuario.deleteMany({ where: { id: nuevoUsuarioId } });
    });

    it("solicitarAcceso crea una membresía en estado 'solicitada'", async () => {
      const res = await ejecutarSolicitarAcceso(nuevoUsuarioId, {
        mensaje: "Hola, soy nuevo en la comisión",
      });
      expect(res.ok).toBe(true);
      expect(res.estado).toBe("solicitada");
      membresiaId = res.membresiaId;

      const mem = await prisma.membresia.findUnique({ where: { id: membresiaId } });
      expect(mem?.estado).toBe("solicitada");
      expect(mem?.rol).toBeNull();
      expect(mem?.mensajeSolicitud).toBe("Hola, soy nuevo en la comisión");
      expect(mem?.version).toBe(1);
    });

    it("no permite solicitar de nuevo si ya está pendiente", async () => {
      await expect(
        ejecutarSolicitarAcceso(nuevoUsuarioId, { mensaje: "Otro mensaje" })
      ).rejects.toThrow("ya está pendiente");
    });

    it("rechazarSolicitud pasa la membresía a 'revocada' con motivo interno", async () => {
      const res = await ejecutarRechazarSolicitud(ctxAdmin, {
        membresiaId,
        motivo: "No pertenece a la comisión",
        version: 1,
      });
      expect(res.ok).toBe(true);
      expect(res.version).toBe(2);

      const mem = await prisma.membresia.findUnique({ where: { id: membresiaId } });
      expect(mem?.estado).toBe("revocada");
      expect(mem?.motivoRevocacion).toBe("No pertenece a la comisión");
    });

    it("permite volver a solicitar tras haber sido rechazada", async () => {
      const res = await ejecutarSolicitarAcceso(nuevoUsuarioId, {
        mensaje: "Aclaré mi rol con el presidente",
      });
      expect(res.ok).toBe(true);
      expect(res.membresiaId).toBe(membresiaId);

      const mem = await prisma.membresia.findUnique({ where: { id: membresiaId } });
      expect(mem?.estado).toBe("solicitada");
      expect(mem?.mensajeSolicitud).toBe("Aclaré mi rol con el presidente");
      expect(mem?.version).toBe(3);
    });

    it("aprobarSolicitud pasa de 'solicitada' a 'activa' con rol asignado", async () => {
      const res = await ejecutarAprobarSolicitud(ctxAdmin, {
        membresiaId,
        rol: "ayudante",
        version: 3,
      });
      expect(res.ok).toBe(true);
      expect(res.version).toBe(4);

      const mem = await prisma.membresia.findUnique({ where: { id: membresiaId } });
      expect(mem?.estado).toBe("activa");
      expect(mem?.rol).toBe("ayudante");
    });

    it("rechaza actualización si la versión no coincide (control de concurrencia)", async () => {
      await expect(
        ejecutarCambiarRol(ctxAdmin, {
          membresiaId,
          rol: "observador",
          version: 2, // Versión obsoleta (actual es 4)
        })
      ).rejects.toThrow("Alguien cambió este registro");
    });

    it("cambiarRol actualiza el rol e incrementa la versión", async () => {
      const res = await ejecutarCambiarRol(ctxAdmin, {
        membresiaId,
        rol: "observador",
        version: 4,
      });
      expect(res.ok).toBe(true);
      expect(res.version).toBe(5);

      const mem = await prisma.membresia.findUnique({ where: { id: membresiaId } });
      expect(mem?.rol).toBe("observador");
    });

    it("revocar pasa a 'revocada', exige motivo y elimina sesiones activas", async () => {
      // Crear una sesión falsa para probar la eliminación
      await prisma.session.create({
        data: {
          sessionToken: `token-test-${Date.now()}`,
          usuarioId: nuevoUsuarioId,
          expires: new Date(Date.now() + 86400000),
        },
      });

      const res = await ejecutarRevocar(ctxAdmin, {
        membresiaId,
        motivo: "Fin del evento",
        version: 5,
      });
      expect(res.ok).toBe(true);
      expect(res.version).toBe(6);

      const mem = await prisma.membresia.findUnique({ where: { id: membresiaId } });
      expect(mem?.estado).toBe("revocada");
      expect(mem?.motivoRevocacion).toBe("Fin del evento");

      const sesionesRestantes = await prisma.session.count({
        where: { usuarioId: nuevoUsuarioId },
      });
      expect(sesionesRestantes).toBe(0);
    });

    it("reactivar pasa a 'activa' y limpia el motivo de revocación", async () => {
      const res = await ejecutarReactivar(ctxAdmin, {
        membresiaId,
        rol: "ayudante",
        version: 6,
      });
      expect(res.ok).toBe(true);
      expect(res.version).toBe(7);

      const mem = await prisma.membresia.findUnique({ where: { id: membresiaId } });
      expect(mem?.estado).toBe("activa");
      expect(mem?.rol).toBe("ayudante");
      expect(mem?.motivoRevocacion).toBeNull();
    });

    it("suprimirDatosUsuario anonimiza el correo y elimina datos personales", async () => {
      // Primero revocar
      await ejecutarRevocar(ctxAdmin, {
        membresiaId,
        motivo: "Solicitud de supresión de datos",
        version: 7,
      });

      const res = await ejecutarSuprimirDatosUsuario(ctxAdmin, {
        membresiaId,
      });
      expect(res.ok).toBe(true);

      const u = await prisma.usuario.findUnique({ where: { id: nuevoUsuarioId } });
      expect(u?.correo).toBe(`suprimido-${nuevoUsuarioId}`);
      expect(u?.imagen).toBeNull();
      expect(u?.suprimidoEn).toBeInstanceOf(Date);
      // El nombre se conserva para trazabilidad histórica de rendición
      expect(u?.nombre).toBe("Solicitante Test");

      const audit = await prisma.registroAuditoria.findFirst({
        where: {
          entidad: "Usuario",
          entidadId: nuevoUsuarioId,
          accion: "suprimir_datos",
        },
      });
      expect(audit).not.toBeNull();
    });
  });

  describe("Regla del Mínimo de un Administrador Activo", () => {
    let adminAId: string;
    let adminBId: string;
    let memAId: string;
    let memBId: string;

    beforeAll(async () => {
      const uA = await prisma.usuario.create({
        data: { correo: `admin-a-${Date.now()}@club.cl`, nombre: "Admin A" },
      });
      adminAId = uA.id;

      const mA = await prisma.membresia.create({
        data: {
          organizacionId: orgId,
          usuarioId: adminAId,
          rol: "administrador",
          estado: "activa",
          version: 1,
        },
      });
      memAId = mA.id;

      const uB = await prisma.usuario.create({
        data: { correo: `admin-b-${Date.now()}@club.cl`, nombre: "Admin B" },
      });
      adminBId = uB.id;

      const mB = await prisma.membresia.create({
        data: {
          organizacionId: orgId,
          usuarioId: adminBId,
          rol: "administrador",
          estado: "activa",
          version: 1,
        },
      });
      memBId = mB.id;
    });

    afterAll(async () => {
      await prisma.registroAuditoria.deleteMany({
        where: { usuarioId: { in: [adminAId, adminBId] } },
      });
      await prisma.membresia.deleteMany({
        where: { id: { in: [memAId, memBId] } },
      });
      await prisma.usuario.deleteMany({
        where: { id: { in: [adminAId, adminBId] } },
      });
    });

    it("permite revocar un administrador si todavía queda otro activo", async () => {
      const res = await ejecutarRevocar(ctxAdmin, {
        membresiaId: memBId,
        motivo: "Cambio de administración",
        version: 1,
      });
      expect(res.ok).toBe(true);
    });

    it("impide revocar o bajar de rol al único administrador si solo queda uno", async () => {
      // Creamos una organización aislada para verificar la regla con exactamente 1 administrador
      const orgAislada = await prisma.organizacion.create({
        data: {
          nombre: `Org Aislada ${Date.now()}`,
          nombreNormalizado: `org_aislada_${Date.now()}`,
        },
      });

      const uSolo = await prisma.usuario.create({
        data: { correo: `solo-${Date.now()}@club.cl`, nombre: "Solo Admin" },
      });

      const memSolo = await prisma.membresia.create({
        data: {
          organizacionId: orgAislada.id,
          usuarioId: uSolo.id,
          rol: "administrador",
          estado: "activa",
          version: 1,
        },
      });

      const ctxAislado: Contexto = {
        usuario: { id: uSolo.id, correo: uSolo.correo, nombre: "Solo Admin", imagen: null },
        organizacionId: orgAislada.id,
        rol: "administrador",
        evento: null,
      };

      // Intentar revocar al único admin debe ser rechazado
      await expect(
        ejecutarRevocar(ctxAislado, {
          membresiaId: memSolo.id,
          motivo: "Intento de revocar último",
          version: 1,
        })
      ).rejects.toThrow("La organización debe tener al menos un administrador activo.");

      // Intentar cambiar de rol al único admin debe ser rechazado
      await expect(
        ejecutarCambiarRol(ctxAislado, {
          membresiaId: memSolo.id,
          rol: "ayudante",
          version: 1,
        })
      ).rejects.toThrow("La organización debe tener al menos un administrador activo.");

      // Limpieza de org aislada
      await prisma.membresia.deleteMany({ where: { organizacionId: orgAislada.id } });
      await prisma.usuario.deleteMany({ where: { id: uSolo.id } });
      await prisma.organizacion.delete({ where: { id: orgAislada.id } });
    });
  });

  describe("Cierre de sesiones de usuario", () => {
    it("elimina todas las sesiones activas del usuario", async () => {
      await prisma.session.create({
        data: {
          sessionToken: `token-close-${Date.now()}`,
          usuarioId: ayudanteId,
          expires: new Date(Date.now() + 86400000),
        },
      });

      const res = await ejecutarCerrarMisSesiones(ayudanteId);
      expect(res.ok).toBe(true);

      const count = await prisma.session.count({
        where: { usuarioId: ayudanteId },
      });
      expect(count).toBe(0);
    });
  });
});
