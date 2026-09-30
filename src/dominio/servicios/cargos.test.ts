import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { Contexto } from "@/lib/permisos";
import {
  ejecutarCrearCargo,
  ejecutarEditarCargo,
  ejecutarAnularCargo,
  listarCargosPorCategoria,
  obtenerCargosPorSujeto,
} from "./cargos";
import {
  ejecutarCrearPrueba,
  ejecutarInscribir,
} from "@/dominio/inscripciones/binomios/acciones";
import {
  ejecutarCrearClub,
  ejecutarCrearJinete,
  ejecutarCrearCaballo,
} from "@/dominio/inscripciones/participantes/acciones";
import { ejecutarRegistrarPagoInscripciones } from "@/dominio/inscripciones/binomios/pagos";

describe("Dominio de Servicios y Cargos Operativos", () => {
  let ctxAdmin: Contexto;
  let ctxAyudante: Contexto;
  let ctxOrgB: Contexto;
  let orgId: string;
  let orgBId: string;
  let eventoId: string;
  let eventoBId: string;

  let categoriaPensionId: string;
  let categoriaAlimentoId: string;

  beforeAll(async () => {
    // 1. Organizaciones
    let org = await prisma.organizacion.findFirst();
    if (!org) {
      org = await prisma.organizacion.create({
        data: {
          nombre: "Club Hipico Central",
          nombreNormalizado: "club hipico central",
        },
      });
    }
    orgId = org.id;

    const timestamp = Date.now();
    const orgB = await prisma.organizacion.create({
      data: {
        nombre: `Org B Servicios ${timestamp}`,
        nombreNormalizado: `org b servicios ${timestamp}`,
      },
    });
    orgBId = orgB.id;

    // 2. Usuarios
    let user = await prisma.usuario.findFirst();
    if (!user) {
      user = await prisma.usuario.create({
        data: {
          correo: `admin-servicios-${timestamp}@test.cl`,
          nombre: "Admin Servicios",
        },
      });
    }

    // 3. Evento principal
    let ev = await prisma.evento.findFirst({
      where: { organizacionId: orgId, estado: "abierto" },
    });
    if (!ev) {
      ev = await prisma.evento.create({
        data: {
          organizacionId: orgId,
          nombre: "Concurso Servicios 2026",
          fechaInicio: new Date("2026-11-20T00:00:00Z"),
          fechaTermino: new Date("2026-11-22T00:00:00Z"),
          estado: "abierto",
        },
      });
    }
    eventoId = ev.id;

    // 4. Evento org B
    const evB = await prisma.evento.create({
      data: {
        organizacionId: orgBId,
        nombre: `Evento Org B ${timestamp}`,
        fechaInicio: new Date("2026-11-20T00:00:00Z"),
        fechaTermino: new Date("2026-11-22T00:00:00Z"),
        estado: "abierto",
      },
    });
    eventoBId = evB.id;

    // Contextos
    ctxAdmin = {
      organizacionId: orgId,
      rol: "administrador",
      usuario: { id: user.id, correo: user.correo, nombre: user.nombre, imagen: null },
      evento: {
        id: eventoId,
        nombre: ev.nombre,
        fechaInicio: ev.fechaInicio,
        fechaTermino: ev.fechaTermino,
        fechaReferenciaEdad: null,
        lugar: "Cancha Principal",
        estado: "abierto",
      },
    };

    ctxAyudante = {
      ...ctxAdmin,
      rol: "ayudante",
    };

    ctxOrgB = {
      organizacionId: orgBId,
      rol: "administrador",
      usuario: { id: user.id, correo: user.correo, nombre: user.nombre, imagen: null },
      evento: {
        id: eventoBId,
        nombre: evB.nombre,
        fechaInicio: evB.fechaInicio,
        fechaTermino: evB.fechaTermino,
        fechaReferenciaEdad: null,
        lugar: "Cancha B",
        estado: "abierto",
      },
    };

    // 5. Categorías para servicios
    const catPension = await prisma.categoria.create({
      data: {
        organizacionId: orgId,
        nombre: `Pensión Caballo ${timestamp}`,
        nombreNormalizado: `pension caballo ${timestamp}`,
        tipo: "ingreso",
        sujetoAsociado: "caballo",
        tarifaBaseClp: 120000,
        activa: true,
        orden: 10,
      },
    });
    categoriaPensionId = catPension.id;

    const catAlimento = await prisma.categoria.create({
      data: {
        organizacionId: orgId,
        nombre: `Alimento Fardo ${timestamp}`,
        nombreNormalizado: `alimento fardo ${timestamp}`,
        tipo: "ingreso",
        sujetoAsociado: "caballo",
        tarifaBaseClp: 25000,
        activa: true,
        orden: 11,
      },
    });
    categoriaAlimentoId = catAlimento.id;
  });

  afterAll(async () => {
    // Limpieza de datos creados en el test
    await prisma.pago.deleteMany({
      where: {
        OR: [
          { cargo: { organizacionId: { in: [orgId, orgBId] } } },
          { movimiento: { claveCliente: { startsWith: "pago-test-" } } },
          { movimiento: { claveCliente: { startsWith: "pago-multi-" } } },
          { movimiento: { claveCliente: { startsWith: "pago-cargo-" } } },
        ],
      },
    });
    await prisma.cargo.deleteMany({ where: { organizacionId: { in: [orgId, orgBId] } } });
    await prisma.movimiento.deleteMany({
      where: {
        OR: [
          { claveCliente: { startsWith: "pago-test-" } },
          { claveCliente: { startsWith: "pago-multi-" } },
          { claveCliente: { startsWith: "pago-cargo-" } },
        ],
      },
    });
    await prisma.categoria.deleteMany({ where: { id: { in: [categoriaPensionId, categoriaAlimentoId] } } });
  });

  describe("1. Creación de Cargo Operativo", () => {
    it("crea un cargo con tarifa estándar y sujeto caballo", async () => {
      const club = await ejecutarCrearClub(ctxAdmin, { nombre: `Club Test Cargos ${Date.now()}` });
      const caballo = await ejecutarCrearCaballo(ctxAdmin, {
        nombre: `Tornado ${Date.now()}`,
        clubId: club.club!.id,
      });

      const res = await ejecutarCrearCargo(ctxAdmin, {
        categoriaId: categoriaPensionId,
        caballoId: caballo.caballo!.id,
        cantidad: 2,
        tarifaClp: 120000,
        claveCliente: `test-cargo-1-${Date.now()}`,
      });

      expect(res.exito).toBe(true);
      expect(res.cargo).toBeDefined();
      expect(res.cargo.cantidad).toBe(2);
      expect(res.cargo.tarifaClp).toBe(120000);
      expect(res.cargo.montoClp).toBe(240000);
      expect(res.cargo.caballoId).toBe(caballo.caballo!.id);
      expect(res.cargo.anulado).toBe(false);
    });

    it("crea un cargo con pago inmediato y movimiento vinculado", async () => {
      const club = await ejecutarCrearClub(ctxAdmin, { nombre: `Club Pago Inm ${Date.now()}` });
      const caballo = await ejecutarCrearCaballo(ctxAdmin, {
        nombre: `Relámpago ${Date.now()}`,
        clubId: club.club!.id,
      });

      const res = await ejecutarCrearCargo(ctxAdmin, {
        categoriaId: categoriaPensionId,
        caballoId: caballo.caballo!.id,
        cantidad: 1,
        tarifaClp: 120000,
        claveCliente: `test-cargo-pago-inm-${Date.now()}`,
        pagoInmediato: {
          medioPago: "transferencia",
          nombreOrigen: "Juan Pérez",
        },
      });

      expect(res.exito).toBe(true);
      expect(res.cargo).toBeDefined();

      // Verificar que el pago y movimiento existen
      const pagos = await prisma.pago.findMany({
        where: { cargoId: res.cargo.id },
        include: { movimiento: true },
      });

      expect(pagos.length).toBe(1);
      expect(pagos[0].montoClp).toBe(120000);
      expect(pagos[0].movimiento.montoClp).toBe(120000);
      expect(pagos[0].movimiento.nombreOrigen).toBe("Juan Pérez");
    });
  });

  describe("2. Edición Concurrente con Control de Versión", () => {
    it("edita exitosamente un cargo e incrementa su versión", async () => {
      const club = await ejecutarCrearClub(ctxAdmin, { nombre: `Club Edit ${Date.now()}` });
      const caballo = await ejecutarCrearCaballo(ctxAdmin, {
        nombre: `Centella ${Date.now()}`,
        clubId: club.club!.id,
      });

      const resCrear = await ejecutarCrearCargo(ctxAdmin, {
        categoriaId: categoriaAlimentoId,
        caballoId: caballo.caballo!.id,
        cantidad: 1,
        tarifaClp: 25000,
        claveCliente: `test-edit-${Date.now()}`,
      });

      const cargoId = resCrear.cargo.id;
      const vOriginal = resCrear.cargo.version;

      const resEdit = await ejecutarEditarCargo(ctxAdmin, {
        id: cargoId,
        version: vOriginal,
        cantidad: 3,
        motivoAjuste: "Agrega 2 fardos adicionales",
      });

      expect(resEdit.exito).toBe(true);
      expect(resEdit.cargo.cantidad).toBe(3);
      expect(resEdit.cargo.montoClp).toBe(75000);
      expect(resEdit.cargo.version).toBe(vOriginal + 1);

      // Intento con versión desactualizada falla por concurrencia
      const resConflicto = await ejecutarEditarCargo(ctxAdmin, {
        id: cargoId,
        version: vOriginal, // versión vieja
        cantidad: 4,
      });

      expect(resConflicto.exito).toBe(false);
      expect(resConflicto.error).toContain("modificado concurrentemente");
    });
  });

  describe("3. Anulación de Cargo Operativo", () => {
    it("anula un cargo sin pagos correctamente", async () => {
      const club = await ejecutarCrearClub(ctxAdmin, { nombre: `Club Anular ${Date.now()}` });
      const caballo = await ejecutarCrearCaballo(ctxAdmin, {
        nombre: `Sultán ${Date.now()}`,
        clubId: club.club!.id,
      });

      const resCrear = await ejecutarCrearCargo(ctxAdmin, {
        categoriaId: categoriaAlimentoId,
        caballoId: caballo.caballo!.id,
        cantidad: 1,
        tarifaClp: 25000,
        claveCliente: `test-anular-${Date.now()}`,
      });

      const resAnular = await ejecutarAnularCargo(
        ctxAdmin,
        resCrear.cargo.id,
        "Caballo canceló servicio",
        resCrear.cargo.version
      );

      expect(resAnular.exito).toBe(true);

      const dbCargo = await prisma.cargo.findUnique({ where: { id: resCrear.cargo.id } });
      expect(dbCargo?.anulado).toBe(true);
      expect(dbCargo?.motivoAnulacion).toBe("Caballo canceló servicio");
    });

    it("bloquea la anulación si el cargo tiene pagos vigentes", async () => {
      const club = await ejecutarCrearClub(ctxAdmin, { nombre: `Club Anular Bloq ${Date.now()}` });
      const caballo = await ejecutarCrearCaballo(ctxAdmin, {
        nombre: `Furia ${Date.now()}`,
        clubId: club.club!.id,
      });

      const resCrear = await ejecutarCrearCargo(ctxAdmin, {
        categoriaId: categoriaAlimentoId,
        caballoId: caballo.caballo!.id,
        cantidad: 1,
        tarifaClp: 25000,
        claveCliente: `test-anular-bloq-${Date.now()}`,
        pagoInmediato: { medioPago: "efectivo" },
      });

      const resAnular = await ejecutarAnularCargo(
        ctxAdmin,
        resCrear.cargo.id,
        "Intento anular con pago",
        resCrear.cargo.version
      );

      expect(resAnular.exito).toBe(false);
      expect(resAnular.error).toContain("pagos asociados");
    });
  });

  describe("4. Pago Unificado y Reparto Multiconcepto (Inscripción + Cargo)", () => {
    it("distribuye 1 movimiento de transferencia entre 1 inscripción y 1 cargo operativo", async () => {
      const sufijo = Date.now();
      const club = await ejecutarCrearClub(ctxAdmin, { nombre: `Club Multi ${sufijo}` });
      const jinete = await ejecutarCrearJinete(ctxAdmin, {
        nombre: `Jinete Multi ${sufijo}`,
        clubId: club.club!.id,
      });
      const caballo = await ejecutarCrearCaballo(ctxAdmin, {
        nombre: `Caballo Multi ${sufijo}`,
        clubId: club.club!.id,
      });

      // 1. Crear prueba de 80.000 e inscribir
      const resPrueba = await ejecutarCrearPrueba(ctxAdmin, {
        nombre: `Prueba Multi ${sufijo}`,
        tarifaClp: 80000,
      });
      expect(resPrueba.exito).toBe(true);

      const resInscripcion = await ejecutarInscribir(ctxAdmin, {
        jineteId: jinete.jinete!.id,
        caballoId: caballo.caballo!.id,
        clubId: club.club!.id,
        pruebas: [{ pruebaId: resPrueba.prueba!.id }],
        claveCliente: `ins-multi-${sufijo}`,
      });
      expect(resInscripcion.exito).toBe(true);

      const inscripcionId = resInscripcion.inscripciones![0].id;

      // 2. Crear cargo de servicio por 25.000 para el caballo
      const resCargo = await ejecutarCrearCargo(ctxAdmin, {
        categoriaId: categoriaAlimentoId,
        caballoId: caballo.caballo!.id,
        cantidad: 1,
        tarifaClp: 25000,
        claveCliente: `cargo-multi-${sufijo}`,
      });
      const cargoId = resCargo.cargo.id;

      // 3. El jinete paga $105.000 en 1 sola transferencia ($80.000 inscripción + $25.000 cargo)
      const resPago = await ejecutarRegistrarPagoInscripciones(ctxAdmin, {
        montoClp: 105000,
        fecha: "2026-11-21",
        medioPago: "transferencia",
        nombreOrigen: `Transferencia Jinete ${sufijo}`,
        sinRespaldo: true,
        observacion: "Pago unificado inscripción + alimento fardo",
        claveCliente: `pago-multi-${sufijo}`,
        reparto: [
          { tipo: "inscripcion", id: inscripcionId, montoClp: 80000 },
          { tipo: "cargo", id: cargoId, montoClp: 25000 },
        ],
      });

      expect(resPago.exito).toBe(true);
      expect(resPago.pagos.length).toBe(2);

      // Verificar que el movimiento financiero es único por 105.000
      expect(resPago.movimiento.montoClp).toBe(105000);

      // Verificar estados en nómina
      const datosNomina = await listarCargosPorCategoria(ctxAdmin, categoriaAlimentoId);
      const cargoEnNomina = datosNomina.cargos.find((c) => c.id === cargoId);

      expect(cargoEnNomina).toBeDefined();
      expect(cargoEnNomina?.saldoClp).toBe(0);
      expect(cargoEnNomina?.pagadoClp).toBe(25000);
      expect(cargoEnNomina?.estado).toBe("pagado");
    });
  });

  describe("5. Aislamiento Multi-Tenant", () => {
    it("impide que una organización distinta consulte o modifique cargos", async () => {
      const club = await ejecutarCrearClub(ctxAdmin, { nombre: `Club OrgA ${Date.now()}` });
      const caballo = await ejecutarCrearCaballo(ctxAdmin, {
        nombre: `Pegaso ${Date.now()}`,
        clubId: club.club!.id,
      });

      const resCargo = await ejecutarCrearCargo(ctxAdmin, {
        categoriaId: categoriaPensionId,
        caballoId: caballo.caballo!.id,
        cantidad: 1,
        tarifaClp: 120000,
        claveCliente: `cargo-tenant-${Date.now()}`,
      });

      // Org B intenta consultar
      const cargosOrgB = await listarCargosPorCategoria(ctxOrgB, categoriaPensionId);
      expect(cargosOrgB.cargos.some((c) => c.id === resCargo.cargo.id)).toBe(false);

      // Org B intenta anular
      await expect(
        ejecutarAnularCargo(ctxOrgB, resCargo.cargo.id, "Intento cruzado", resCargo.cargo.version)
      ).rejects.toThrow();
    });
  });
});
