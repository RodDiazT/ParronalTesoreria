import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { Contexto, ErrorPermiso } from "@/lib/permisos";
import {
  estadoItem,
  retiroItem,
  porAsignar,
  repartirMonto,
  avisoEdadPrueba,
  ocultarDatosInscripcion,
  ConflictoBinomios,
} from "./reglas";
import {
  ejecutarCrearPrueba,
  ejecutarEditarPrueba,
  ejecutarCrearConcepto,
  ejecutarEditarConcepto,
  ejecutarInscribir,
  ejecutarAgregarCargo,
  ejecutarAjustarItem,
  ejecutarMarcarVisto,
  ejecutarRevertirAjuste,
  ejecutarCambiarPrueba,
  ejecutarCambiarParBinomio,
  ejecutarCambiarClubBinomio,
  ejecutarMoverInscripcion,
  ejecutarAnularItem,
  ejecutarAnularBinomio,
  reasignarPorFusion,
} from "./acciones";
import {
  ejecutarCrearClub,
  ejecutarCrearJinete,
  ejecutarCrearCaballo,
} from "@/dominio/inscripciones/participantes/acciones";
import {
  ejecutarRegistrarPagoInscripciones,
  ejecutarAsignarPorAsignar,
  ejecutarDesasignarPago,
} from "./pagos";
import {
  ejecutarRetirar,
  ejecutarRegistrarDevolucionRetiro,
  ejecutarDevolverSobrante,
} from "./retiros";
import {
  listarBinomios,
  resumenPorPrueba,
  listarCargos,
  listarPorCobrar,
  listarPorAsignar,
  listarRetiros,
  estadoCuenta,
  textoEstadoCuenta,
  bandejaAjustes,
} from "./consultas";

describe("Fase 6: Inscripciones de Binomios, Pruebas, Cargos, Pagos y Retiros", () => {
  let ctxAdmin: Contexto;
  let ctxAyudante: Contexto;
  let ctxObservador: Contexto;
  let ctxOrgB: Contexto;
  let orgId: string;
  let orgBId: string;
  let eventoId: string;
  let eventoBId: string;

  beforeAll(async () => {
    // 1. Obtener o crear organización principal
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

    // 2. Crear segunda organización para pruebas multi-tenant
    const timestamp = Date.now();
    const orgB = await prisma.organizacion.create({
      data: {
        nombre: `Org B ${timestamp}`,
        nombreNormalizado: `org b ${timestamp}`,
      },
    });
    orgBId = orgB.id;

    const user = await prisma.usuario.findFirst();
    const userId = user?.id || "u-test-fase6";

    // 3. Evento principal
    let ev = await prisma.evento.findFirst({
      where: { organizacionId: orgId, estado: "abierto" },
    });
    if (!ev) {
      ev = await prisma.evento.create({
        data: {
          organizacionId: orgId,
          nombre: "Concurso Oficial 2026",
          fechaInicio: new Date("2026-11-20T00:00:00Z"),
          fechaTermino: new Date("2026-11-22T00:00:00Z"),
          fechaReferenciaEdad: new Date("2026-11-21T00:00:00Z"),
          estado: "abierto",
        },
      });
    }
    eventoId = ev.id;

    // 4. Evento org B
    let evB = await prisma.evento.findFirst({
      where: { organizacionId: orgBId, estado: "abierto" },
    });
    if (!evB) {
      evB = await prisma.evento.create({
        data: {
          organizacionId: orgBId,
          nombre: "Concurso Org B 2026",
          fechaInicio: new Date("2026-11-20T00:00:00Z"),
          fechaTermino: new Date("2026-11-22T00:00:00Z"),
          fechaReferenciaEdad: new Date("2026-11-21T00:00:00Z"),
          estado: "abierto",
        },
      });
    }
    eventoBId = evB.id;

    const contextoEvento = {
      id: ev.id,
      nombre: ev.nombre,
      fechaInicio: ev.fechaInicio,
      fechaTermino: ev.fechaTermino,
      fechaReferenciaEdad: ev.fechaReferenciaEdad,
      lugar: ev.lugar,
      estado: ev.estado as any,
    };

    ctxAdmin = {
      usuario: { id: userId, correo: "admin@test.cl", nombre: "Admin Test", imagen: null },
      organizacionId: orgId,
      rol: "administrador",
      evento: contextoEvento,
    };

    ctxAyudante = {
      usuario: { id: userId, correo: "ayudante@test.cl", nombre: "Ayudante Test", imagen: null },
      organizacionId: orgId,
      rol: "ayudante",
      evento: contextoEvento,
    };

    ctxObservador = {
      usuario: { id: userId, correo: "obs@test.cl", nombre: "Observador Test", imagen: null },
      organizacionId: orgId,
      rol: "observador",
      evento: contextoEvento,
    };

    ctxOrgB = {
      usuario: { id: userId, correo: "orgb@test.cl", nombre: "Admin Org B", imagen: null },
      organizacionId: orgBId,
      rol: "administrador",
      evento: {
        id: evB.id,
        nombre: evB.nombre,
        fechaInicio: evB.fechaInicio,
        fechaTermino: evB.fechaTermino,
        fechaReferenciaEdad: evB.fechaReferenciaEdad,
        lugar: evB.lugar,
        estado: evB.estado as any,
      },
    };
  });

  afterAll(async () => {
    if (orgBId) {
      await prisma.devolucion.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.pago.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.movimiento.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.cargo.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.inscripcion.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.binomio.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.jinete.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.caballo.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.club.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.prueba.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.concepto.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.categoria.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.evento.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.membresia.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.registroAuditoria.deleteMany({ where: { organizacionId: orgBId } });
      await prisma.organizacion.deleteMany({ where: { id: orgBId } });
    }
  });

  // Helpers para creación rápida en tests
  async function crearClubTest(ctx: Contexto, nombre: string, extras: any = {}) {
    const res = await ejecutarCrearClub(ctx, { nombre, confirmarAunqueParecido: true, ...extras });
    if (!res.exito || !res.club) throw new Error("Fallo al crear club: " + res.error);
    return res.club;
  }

  async function crearJineteTest(ctx: Contexto, nombre: string, clubId: string, extras: any = {}) {
    const res = await ejecutarCrearJinete(ctx, { nombre, clubId, confirmarAunqueParecido: true, ...extras });
    if (!res.exito || !res.jinete) throw new Error("Fallo al crear jinete: " + res.error);
    return res.jinete;
  }

  async function crearCaballoTest(ctx: Contexto, nombre: string, clubId: string, extras: any = {}) {
    const res = await ejecutarCrearCaballo(ctx, { nombre, clubId, confirmarAunqueParecido: true, ...extras });
    if (!res.exito || !res.caballo) throw new Error("Fallo al crear caballo: " + res.error);
    return res.caballo;
  }

  function generarRutValido(): string {
    const cuerpoNum = Math.floor(20000000 + Math.random() * 70000000);
    const cuerpo = cuerpoNum.toString();
    let suma = 0;
    let multiplicador = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i], 10) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    const resto = 11 - (suma % 11);
    const dv = resto === 11 ? "0" : resto === 10 ? "K" : resto.toString();
    return `${cuerpo}-${dv}`;
  }

  // =============================================================
  // 1. REGLAS PURAS (Unit Tests)
  // =============================================================
  describe("Reglas Puras del Dominio", () => {
    it("estadoItem calcula correctamente pendiente, parcial y pagado", () => {
      const itemBase = {
        id: "ins-1",
        montoClp: 50000,
        ajuste: null,
        anulado: false,
        retirado: false,
      };

      // 1. Sin pagos -> pendiente
      const r1 = estadoItem(itemBase, []);
      expect(r1.estado).toBe("pendiente");
      expect(r1.monto).toBe(50000);
      expect(r1.pagado).toBe(0);
      expect(r1.saldo).toBe(50000);

      // 2. Pago parcial
      const pagosParciales = [
        { id: "p1", montoClp: 20000, anulado: false, movimiento: { estadoValidacion: "validado" } },
      ];
      const r2 = estadoItem(itemBase, pagosParciales);
      expect(r2.estado).toBe("parcial");
      expect(r2.pagado).toBe(20000);
      expect(r2.saldo).toBe(30000);

      // 3. Pagado completo
      const pagosCompletos = [
        { id: "p1", montoClp: 20000, anulado: false, movimiento: { estadoValidacion: "validado" } },
        { id: "p2", montoClp: 30000, anulado: false, movimiento: { estadoValidacion: "validado" } },
      ];
      const r3 = estadoItem(itemBase, pagosCompletos);
      expect(r3.estado).toBe("pagado");
      expect(r3.pagado).toBe(50000);
      expect(r3.saldo).toBe(0);

      // 4. Con ajuste
      const itemAjustado = { ...itemBase, ajuste: -10000 };
      const r4 = estadoItem(itemAjustado, pagosParciales);
      expect(r4.monto).toBe(40000);
      expect(r4.saldo).toBe(20000);
    });

    it("estadoItem prioriza anulado y retirado", () => {
      const itemAnulado = {
        id: "ins-2",
        montoClp: 30000,
        anulado: true,
        retirado: false,
      };
      expect(estadoItem(itemAnulado, []).estado).toBe("anulado");

      const itemRetirado = {
        id: "ins-3",
        montoClp: 30000,
        anulado: false,
        retirado: true,
      };
      expect(estadoItem(itemRetirado, []).estado).toBe("retirado");
    });

    it("retiroItem desglosa retenido y devuelto según pagos vigentes", () => {
      const item = {
        id: "ins-ret",
        montoClp: 50000,
        retirado: true,
        anulado: false,
      };
      const pagos = [
        { id: "p1", montoClp: 50000, anulado: false, movimiento: { estadoValidacion: "validado" } },
      ];
      const devoluciones = [
        { id: "d1", montoClp: 20000, anulado: false, movimiento: { estadoValidacion: "validado" } },
      ];

      const ret = retiroItem(item, pagos, devoluciones);
      expect(ret.totalPagado).toBe(50000);
      expect(ret.totalDevuelto).toBe(20000);
      expect(ret.totalRetenido).toBe(30000);
    });

    it("porAsignar calcula el saldo libre de un movimiento", () => {
      const movimiento = { montoClp: 100000 };
      const pagos = [
        { id: "p1", montoClp: 40000, anulado: false },
        { id: "p2", montoClp: 20000, anulado: false },
        { id: "p3", montoClp: 10000, anulado: true }, // anulado no resta
      ];
      const devolucionesSobrante = [
        { id: "d1", montoClp: 15000, anulado: false },
      ];

      const saldoLibre = porAsignar(movimiento, pagos, devolucionesSobrante);
      expect(saldoLibre).toBe(25000); // 100000 - 60000 - 15000
    });

    it("repartirMonto distribuye montos en estricto orden FIFO", () => {
      const items = [
        { id: "i1", tipo: "inscripcion" as const, saldo: 30000, creadoEn: new Date("2026-10-01") },
        { id: "i2", tipo: "inscripcion" as const, saldo: 50000, creadoEn: new Date("2026-10-02") },
        { id: "i3", tipo: "cargo" as const, saldo: 20000, creadoEn: new Date("2026-10-03") },
      ];

      const res = repartirMonto(60000, items);
      expect(res.porAsignar).toBe(0);
      expect(res.repartos).toEqual([
        { id: "i1", tipo: "inscripcion", montoAsignado: 30000 },
        { id: "i2", tipo: "inscripcion", montoAsignado: 30000 },
      ]);

      // Si sobra dinero
      const resSobra = repartirMonto(120000, items);
      expect(resSobra.porAsignar).toBe(20000); // 120k - 100k
      expect(resSobra.repartos.reduce((a, b) => a + b.montoAsignado, 0)).toBe(100000);
    });

    it("avisoEdadPrueba detecta si el jinete cumple o no los límites", () => {
      const evento = {
        fechaInicio: new Date("2026-11-20T00:00:00Z"),
        fechaReferenciaEdad: new Date("2026-11-21T00:00:00Z"),
      };

      const pruebaConLimites = {
        edadMinima: 12,
        edadMaxima: 16,
      };

      // Jinete sin fecha -> edad_sin_dato
      expect(avisoEdadPrueba({ fechaNacimiento: null }, pruebaConLimites, evento)).toBe("edad_sin_dato");

      // Jinete de 14 años -> cumple (null)
      expect(
        avisoEdadPrueba(
          { fechaNacimiento: new Date("2012-05-10T00:00:00Z") },
          pruebaConLimites,
          evento
        )
      ).toBeNull();

      // Jinete de 10 años -> no_cumple_edad
      expect(
        avisoEdadPrueba(
          { fechaNacimiento: new Date("2016-05-10T00:00:00Z") },
          pruebaConLimites,
          evento
        )
      ).toBe("no_cumple_edad");
    });

    it("ocultarDatosInscripcion anonimiza estrictamente para observador", () => {
      const objetoCompleto = {
        id: "test-id",
        montoClp: 50000,
        motivoAjuste: "Descuento privado",
        motivoAnulacion: "Error de inscripción",
        nombreOrigen: "Juan Pérez Transferencia",
        avisoPendiente: true,
        avisoEdad: "no_cumple_edad",
        jinete: {
          id: "j-1",
          nombre: "Pedro Gómez",
          rut: "12.345.678-5",
          contacto: "+56911223344",
          fechaNacimiento: new Date("2010-01-01"),
        },
      };

      const filtrado = ocultarDatosInscripcion(ctxObservador, objetoCompleto);
      expect(filtrado.motivoAjuste).toBeNull();
      expect(filtrado.motivoAnulacion).toBeNull();
      expect(filtrado.nombreOrigen).toBeNull();
      expect(filtrado.avisoPendiente).toBeUndefined();
      expect(filtrado.avisoEdad).toBeUndefined();
      expect(filtrado.jinete.rut).toBeUndefined();
      expect(filtrado.jinete.contacto).toBeUndefined();
      expect(filtrado.jinete.fechaNacimiento).toBeUndefined();
      expect(filtrado.jinete.nombre).toBe("Pedro Gómez"); // nombre sí se preserva
    });
  });

  // =============================================================
  // 2. CONFIGURACIÓN DE PRUEBAS Y CONCEPTOS
  // =============================================================
  describe("Configuración de Pruebas y Conceptos", () => {
    it("permite a administrador crear y editar pruebas", async () => {
      const sufijo = Date.now();
      const res = await ejecutarCrearPrueba(ctxAdmin, {
        nombre: `Prueba 1.10m ${sufijo}`,
        tarifaClp: 35000,
        edadMinima: 12,
        edadMaxima: 18,
      });

      expect(res.exito).toBe(true);
      expect(res.prueba).toBeDefined();
      expect(res.prueba?.tarifaClp).toBe(35000);

      // Edición de prueba
      const editRes = await ejecutarEditarPrueba(ctxAdmin, res.prueba!.id, {
        tarifaClp: 40000,
      }, res.prueba!.version);
      expect(editRes.exito).toBe(true);
      expect(editRes.prueba?.tarifaClp).toBe(40000);
    });

    it("bloquea a ayudante u observador de crear pruebas", async () => {
      await expect(
        ejecutarCrearPrueba(ctxAyudante, {
          nombre: "Prueba no permitida",
          tarifaClp: 20000,
        })
      ).rejects.toThrow(ErrorPermiso);

      await expect(
        ejecutarCrearPrueba(ctxObservador, {
          nombre: "Prueba no permitida",
          tarifaClp: 20000,
        })
      ).rejects.toThrow(ErrorPermiso);
    });

    it("permite crear concepto de cobro con porBinomio", async () => {
      const sufijo = Date.now();
      const res = await ejecutarCrearConcepto(ctxAdmin, {
        nombre: `Cuota Fija Test ${sufijo}`,
        tarifaClp: 15000,
        aplicaA: "binomio",
      });

      expect(res.exito).toBe(true);
      expect(res.concepto?.aplicaA).toBe("binomio");
    });
  });

  // =============================================================
  // 3. INSCRIPCIÓN EN TERRENO Y CARGO AUTOMÁTICO
  // =============================================================
  describe("Inscripción de Binomios e Idempotencia", () => {
    it("inscribe binomio, crea cuota fija automática y es idempotente", async () => {
      const sufijo = Date.now();

      const club = await crearClubTest(ctxAdmin, `Club Inscribir ${sufijo}`);
      const jinete = await crearJineteTest(ctxAdmin, `Jinete Inscribir ${sufijo}`, club.id);
      const caballo = await crearCaballoTest(ctxAdmin, `Caballo Inscribir ${sufijo}`, club.id);

      const pruebaRes = await ejecutarCrearPrueba(ctxAdmin, {
        nombre: `Prueba Terreno ${sufijo}`,
        tarifaClp: 30000,
      });

      const claveCliente = `test-inscribir-${sufijo}`;

      // Inscribir por Ayudante
      const insRes = await ejecutarInscribir(ctxAyudante, {
        jineteId: jinete.id,
        caballoId: caballo.id,
        clubId: club.id,
        pruebas: [{ pruebaId: pruebaRes.prueba!.id }],
        claveCliente,
      });

      expect(insRes.exito).toBe(true);
      expect(insRes.binomio).toBeDefined();
      expect(insRes.inscripciones?.length).toBe(1);

      // Si existe concepto porBinomio activo, se carga cuota automática
      const cargosCreados = await prisma.cargo.findMany({
        where: { binomioId: insRes.binomio!.id },
      });
      for (const cargo of cargosCreados) {
        if (cargo.automatico) {
          expect(cargo.binomioId).toBe(insRes.binomio!.id);
        }
      }

      // Idempotencia: reenviar misma claveCliente no duplica
      const insDuplicada = await ejecutarInscribir(ctxAyudante, {
        jineteId: jinete.id,
        caballoId: caballo.id,
        clubId: club.id,
        pruebas: [{ pruebaId: pruebaRes.prueba!.id }],
        claveCliente,
      });
      expect(insDuplicada.exito).toBe(true);
      expect(insDuplicada.binomio?.id).toBe(insRes.binomio!.id);

      const totalInscripciones = await prisma.inscripcion.count({
        where: { binomioId: insRes.binomio!.id },
      });
      expect(totalInscripciones).toBe(1);
    });
  });

  // =============================================================
  // 4. AJUSTES, VISTO Y REVERSIÓN
  // =============================================================
  describe("Ajustes de Tarifas y Flujo de Auditoría", () => {
    it("permite ajustar monto, genera avisoPendiente para ayudante y permite visto/reversión al admin", async () => {
      const sufijo = Date.now();

      const club = await crearClubTest(ctxAdmin, `Club Ajustes ${sufijo}`);
      const jinete = await crearJineteTest(ctxAdmin, `Jinete Ajustes ${sufijo}`, club.id);
      const caballo = await crearCaballoTest(ctxAdmin, `Caballo Ajustes ${sufijo}`, club.id);

      const pRes = await ejecutarCrearPrueba(ctxAdmin, {
        nombre: `Prueba Ajuste ${sufijo}`,
        tarifaClp: 50000,
      });

      const insRes = await ejecutarInscribir(ctxAdmin, {
        jineteId: jinete.id,
        caballoId: caballo.id,
        clubId: club.id,
        pruebas: [{ pruebaId: pRes.prueba!.id }],
        claveCliente: `ins-ajuste-${sufijo}`,
      });

      const inscripcionId = insRes.inscripciones![0].id;

      // 1. Ayudante realiza ajuste de tarifa a 35000
      const ajusteRes = await ejecutarAjustarItem(
        ctxAyudante,
        "inscripcion",
        inscripcionId,
        35000,
        "Descuento autorizado por directiva"
      );
      expect(ajusteRes.exito).toBe(true);

      const insBD = await prisma.inscripcion.findUnique({ where: { id: inscripcionId } });
      expect(insBD?.montoClp).toBe(35000);
      expect(insBD!.montoClp - insBD!.tarifaClp).toBe(-15000);
      expect(insBD?.avisoPendiente).toBe(true); // Ayudante genera aviso

      // 2. Aparece en bandejaAjustes del administrador
      const bandeja = await bandejaAjustes(ctxAdmin);
      const enBandeja = bandeja.inscripciones.some((i) => i.id === inscripcionId);
      expect(enBandeja).toBe(true);

      // 3. Admin marca visto
      const vistoRes = await ejecutarMarcarVisto(ctxAdmin, "inscripcion", inscripcionId);
      expect(vistoRes.exito).toBe(true);

      const insVisto = await prisma.inscripcion.findUnique({ where: { id: inscripcionId } });
      expect(insVisto?.avisoPendiente).toBe(false);

      // 4. Admin revierte ajuste
      const revRes = await ejecutarRevertirAjuste(
        ctxAdmin,
        "inscripcion",
        inscripcionId,
        insVisto!.version,
        "Reversión de prueba por término de plazo"
      );
      expect(revRes.exito).toBe(true);

      const insRevertida = await prisma.inscripcion.findUnique({ where: { id: inscripcionId } });
      expect(insRevertida?.montoClp).toBe(50000); // Vuelve a la tarifa original
      expect(insRevertida!.montoClp - insRevertida!.tarifaClp).toBe(0);
      expect(insRevertida?.motivoAjuste).toBeNull();
    });
  });

  // =============================================================
  // 5. REGISTRO DE PAGOS Y ASIGNACIÓN
  // =============================================================
  describe("Pagos de Inscripciones y Control Concurrente", () => {
    it("registra pago, crea movimiento de sistema y aplica reparto a ítems", async () => {
      const sufijo = Date.now();

      const club = await crearClubTest(ctxAdmin, `Club Pagos ${sufijo}`);
      const jinete = await crearJineteTest(ctxAdmin, `Jinete Pagos ${sufijo}`, club.id);
      const caballo = await crearCaballoTest(ctxAdmin, `Caballo Pagos ${sufijo}`, club.id);

      const pRes = await ejecutarCrearPrueba(ctxAdmin, {
        nombre: `Prueba Pago ${sufijo}`,
        tarifaClp: 40000,
      });

      const insRes = await ejecutarInscribir(ctxAdmin, {
        jineteId: jinete.id,
        caballoId: caballo.id,
        clubId: club.id,
        pruebas: [{ pruebaId: pRes.prueba!.id }],
        claveCliente: `ins-pago-${sufijo}`,
      });

      const insId = insRes.inscripciones![0].id;

      // Registrar pago por $50.000 ($40.000 a la prueba y $10.000 por asignar)
      const pagoRes = await ejecutarRegistrarPagoInscripciones(ctxAdmin, {
        montoClp: 50000,
        fecha: "2026-11-20",
        medioPago: "transferencia",
        nombreOrigen: "Transferencia Club Pagos",
        sinRespaldo: true,
        observacion: "Pago comprobado en extracto",
        claveCliente: `pago-${sufijo}`,
        reparto: [{ id: insId, tipo: "inscripcion", montoClp: 40000 }],
      });

      expect(pagoRes.exito).toBe(true);
      expect(pagoRes.movimiento).toBeDefined();

      // Verificar que el movimiento pertenece a la categoría de sistema 'inscripciones'
      const mov = await prisma.movimiento.findUnique({
        where: { id: pagoRes.movimiento!.id },
        include: { categoria: true, pagos: true },
      });
      expect(mov?.categoria?.claveSistema).toBe("inscripciones");
      expect(mov?.pagos.length).toBe(1);
      expect(mov?.pagos[0].montoClp).toBe(40000);

      // Verificar estado de la inscripción -> pagado
      const insBD = await prisma.inscripcion.findUnique({
        where: { id: insId },
        include: { pagos: true },
      });
      const calc = estadoItem(insBD!, insBD!.pagos);
      expect(calc.estado).toBe("pagado");
      expect(calc.saldo).toBe(0);

      // Verificar que los $10.000 sobrantes aparecen en listarPorAsignar
      const libres = await listarPorAsignar(ctxAdmin);
      const movLibre = libres.find((m: any) => m.id === mov!.id);
      expect(movLibre).toBeDefined();
      expect(movLibre.porAsignar).toBe(10000);
    });

    it("desasignarPago anula el pago y restaura el saldo por asignar en el movimiento", async () => {
      const sufijo = Date.now();

      const club = await crearClubTest(ctxAdmin, `Club Desasig ${sufijo}`);
      const jinete = await crearJineteTest(ctxAdmin, `Jinete Desasig ${sufijo}`, club.id);
      const caballo = await crearCaballoTest(ctxAdmin, `Caballo Desasig ${sufijo}`, club.id);

      const pRes = await ejecutarCrearPrueba(ctxAdmin, {
        nombre: `Prueba Desasig ${sufijo}`,
        tarifaClp: 30000,
      });

      const insRes = await ejecutarInscribir(ctxAdmin, {
        jineteId: jinete.id,
        caballoId: caballo.id,
        clubId: club.id,
        pruebas: [{ pruebaId: pRes.prueba!.id }],
        claveCliente: `ins-desasig-${sufijo}`,
      });

      const insId = insRes.inscripciones![0].id;

      const pagoRes = await ejecutarRegistrarPagoInscripciones(ctxAdmin, {
        montoClp: 30000,
        fecha: "2026-11-20",
        medioPago: "efectivo",
        sinRespaldo: true,
        observacion: "Efectivo entregado en mesa",
        claveCliente: `pago-desasig-${sufijo}`,
        reparto: [{ id: insId, tipo: "inscripcion", montoClp: 30000 }],
      });

      const pagoId = pagoRes.pagos![0].id;

      // Desasignar por admin
      const desRes = await ejecutarDesasignarPago(
        ctxAdmin,
        pagoId,
        "Error en la imputación, era para otro binomio"
      );
      expect(desRes.exito).toBe(true);

      const pagoBD = await prisma.pago.findUnique({ where: { id: pagoId } });
      expect(pagoBD?.anulado).toBe(true);

      // Ahora el movimiento tiene los $30.000 como por asignar
      const libres = await listarPorAsignar(ctxAdmin);
      const movLibre = libres.find((m: any) => m.id === pagoRes.movimiento!.id);
      expect(movLibre.porAsignar).toBe(30000);
    });
  });

  // =============================================================
  // 6. RETIROS Y DEVOLUCIONES
  // =============================================================
  describe("Retiros, Retención y Devoluciones", () => {
    it("procesa retiro con retención total en caja", async () => {
      const sufijo = Date.now();

      const club = await crearClubTest(ctxAdmin, `Club Retiro Ret ${sufijo}`);
      const jinete = await crearJineteTest(ctxAdmin, `Jinete Retiro Ret ${sufijo}`, club.id);
      const caballo = await crearCaballoTest(ctxAdmin, `Caballo Retiro Ret ${sufijo}`, club.id);

      const pRes = await ejecutarCrearPrueba(ctxAdmin, {
        nombre: `Prueba Retiro Ret ${sufijo}`,
        tarifaClp: 25000,
      });

      const insRes = await ejecutarInscribir(ctxAdmin, {
        jineteId: jinete.id,
        caballoId: caballo.id,
        clubId: club.id,
        pruebas: [{ pruebaId: pRes.prueba!.id }],
        claveCliente: `ins-ret-ret-${sufijo}`,
      });

      const insId = insRes.inscripciones![0].id;

      // Pagar los $25.000
      await ejecutarRegistrarPagoInscripciones(ctxAdmin, {
        montoClp: 25000,
        fecha: "2026-11-20",
        medioPago: "efectivo",
        sinRespaldo: true,
        observacion: "Efectivo",
        claveCliente: `pago-ret-ret-${sufijo}`,
        reparto: [{ id: insId, tipo: "inscripcion", montoClp: 25000 }],
      });

      // Retirar con retención (sin objeto devolucion)
      const retRes = await ejecutarRetirar(
        ctxAdmin,
        insRes.binomio!.id,
        [{ id: insId, tipo: "inscripcion" }],
        "Jinete no podrá asistir por motivos laborales"
      );

      expect(retRes.exito).toBe(true);

      const insBD = await prisma.inscripcion.findUnique({
        where: { id: insId },
        include: { pagos: true, devoluciones: true },
      });
      expect(insBD?.retirado).toBe(true);

      const retCalc = retiroItem(insBD!, insBD!.pagos, insBD!.devoluciones);
      expect(retCalc.totalPagado).toBe(25000);
      expect(retCalc.totalRetenido).toBe(25000);
      expect(retCalc.totalDevuelto).toBe(0);
    });

    it("procesa retiro con devolución en dinero creando egreso de sistema en devoluciones", async () => {
      const sufijo = Date.now();

      const club = await crearClubTest(ctxAdmin, `Club Retiro Dev ${sufijo}`);
      const jinete = await crearJineteTest(ctxAdmin, `Jinete Retiro Dev ${sufijo}`, club.id);
      const caballo = await crearCaballoTest(ctxAdmin, `Caballo Retiro Dev ${sufijo}`, club.id);

      const pRes = await ejecutarCrearPrueba(ctxAdmin, {
        nombre: `Prueba Retiro Dev ${sufijo}`,
        tarifaClp: 30000,
      });

      const insRes = await ejecutarInscribir(ctxAdmin, {
        jineteId: jinete.id,
        caballoId: caballo.id,
        clubId: club.id,
        pruebas: [{ pruebaId: pRes.prueba!.id }],
        claveCliente: `ins-ret-dev-${sufijo}`,
      });

      const insId = insRes.inscripciones![0].id;

      await ejecutarRegistrarPagoInscripciones(ctxAdmin, {
        montoClp: 30000,
        fecha: "2026-11-20",
        medioPago: "transferencia",
        sinRespaldo: true,
        observacion: "Pago comprobado",
        claveCliente: `pago-ret-dev-${sufijo}`,
        reparto: [{ id: insId, tipo: "inscripcion", montoClp: 30000 }],
      });

      // Retirar con devolución de $20.000 ($10.000 retenido)
      const retRes = await ejecutarRetirar(
        ctxAdmin,
        insRes.binomio!.id,
        [{ id: insId, tipo: "inscripcion" }],
        "Certificado veterinario por lesión del caballo",
        {
          montoClp: 20000,
          fecha: "2026-11-21",
          medioPago: "transferencia",
          observacion: "Reintegro bancario parcial",
          sinRespaldo: true,
          claveCliente: `dev-ret-${sufijo}`,
        }
      );

      expect(retRes.exito).toBe(true);
      expect(retRes.movimientoGasto).toBeDefined();

      const gastoBD = await prisma.movimiento.findUnique({
        where: { id: retRes.movimientoGasto!.id },
        include: { categoria: true },
      });
      expect(gastoBD?.tipo).toBe("gasto");
      expect(gastoBD?.montoClp).toBe(20000);
      expect(gastoBD?.categoria?.claveSistema).toBe("devoluciones");

      const insBD = await prisma.inscripcion.findUnique({
        where: { id: insId },
        include: { pagos: true, devoluciones: true },
      });
      const retCalc = retiroItem(insBD!, insBD!.pagos, insBD!.devoluciones);
      expect(retCalc.totalPagado).toBe(30000);
      expect(retCalc.totalDevuelto).toBe(20000);
      expect(retCalc.totalRetenido).toBe(10000);
    });
  });

  // =============================================================
  // 7. FUSIÓN Y CONFLICTO DE BINOMIOS
  // =============================================================
  describe("Ganchos de Fusión y Detección de Conflictos", () => {
    it("detecta ConflictoBinomios si fusionar jinetes crearía un binomio duplicado con el mismo caballo", async () => {
      const sufijo = Date.now();

      const club = await crearClubTest(ctxAdmin, `Club Fusion ${sufijo}`);
      const jineteA = await crearJineteTest(ctxAdmin, `Jinete A Fusion ${sufijo}`, club.id);
      const jineteB = await crearJineteTest(ctxAdmin, `Jinete B Fusion ${sufijo}`, club.id);
      const caballo = await crearCaballoTest(ctxAdmin, `Caballo Compartido ${sufijo}`, club.id);

      // Crear Binomio 1: Jinete A + Caballo
      await prisma.binomio.create({
        data: {
          organizacionId: orgId,
          eventoId,
          jineteId: jineteA.id,
          caballoId: caballo.id,
          clubId: club.id,
          creadoPorId: ctxAdmin.usuario.id,
        },
      });

      // Crear Binomio 2: Jinete B + Caballo
      await prisma.binomio.create({
        data: {
          organizacionId: orgId,
          eventoId,
          jineteId: jineteB.id,
          caballoId: caballo.id,
          clubId: club.id,
          creadoPorId: ctxAdmin.usuario.id,
        },
      });

      // Intentar reasignar por fusión de jineteB hacia jineteA en una transacción
      await expect(
        prisma.$transaction(async (tx) => {
          return reasignarPorFusion(tx, ctxAdmin, "jinete", jineteB.id, jineteA.id);
        })
      ).rejects.toThrow(ConflictoBinomios);
    });
  });

  // =============================================================
  // 8. ESTADOS DE CUENTA Y PRIVACIDAD WHATSAPP
  // =============================================================
  describe("Estados de Cuenta y Formato WhatsApp Seguro", () => {
    it("genera textoEstadoCuenta limpio para WhatsApp sin RUT ni datos personales", async () => {
      const sufijo = Date.now();

      const rutClub = generarRutValido();
      const rutJinete = generarRutValido();

      const club = await crearClubTest(ctxAdmin, `Club WhatsApp ${sufijo}`, {
        rut: rutClub,
        contacto: "+56999887766",
      });

      const jinete = await crearJineteTest(ctxAdmin, `Jinete WhatsApp ${sufijo}`, club.id, {
        rut: rutJinete,
        contacto: "+56911223344",
      });

      const caballo = await crearCaballoTest(ctxAdmin, `Caballo WhatsApp ${sufijo}`, club.id);

      const pRes = await ejecutarCrearPrueba(ctxAdmin, {
        nombre: `Prueba WA ${sufijo}`,
        tarifaClp: 30000,
      });

      const insRes = await ejecutarInscribir(ctxAdmin, {
        jineteId: jinete.id,
        caballoId: caballo.id,
        clubId: club.id,
        pruebas: [{ pruebaId: pRes.prueba!.id }],
        claveCliente: `ins-wa-${sufijo}`,
      });

      const texto = await textoEstadoCuenta(ctxAdmin, { binomioId: insRes.binomio!.id });

      expect(texto).toContain(jinete.nombre);
      expect(texto).toContain(caballo.nombre);
      expect(texto).toContain("Prueba WA");
      expect(texto).toContain("$30.000");

      // Verificación de privacidad: NO debe contener RUT, teléfonos ni correos
      expect(texto).not.toContain(rutJinete);
      expect(texto).not.toContain(rutClub);
      expect(texto).not.toContain("+569");

      // Debe haber registrado auditoría de copia
      const aud = await prisma.registroAuditoria.findFirst({
        where: {
          organizacionId: orgId,
          accion: "copiar_estado_cuenta",
        },
        orderBy: { creadoEn: "desc" },
      });
      expect(aud).toBeDefined();
    });
  });

  // =============================================================
  // 9. AISLAMIENTO MULTI-TENANT
  // =============================================================
  describe("Aislamiento Multi-Tenant", () => {
    it("impide que una organización vea o modifique inscripciones de otra", async () => {
      const sufijo = Date.now();

      const clubA = await crearClubTest(ctxAdmin, `Club OrgA ${sufijo}`);
      const jineteA = await crearJineteTest(ctxAdmin, `Jinete OrgA ${sufijo}`, clubA.id);
      const caballoA = await crearCaballoTest(ctxAdmin, `Caballo OrgA ${sufijo}`, clubA.id);

      const pRes = await ejecutarCrearPrueba(ctxAdmin, {
        nombre: `Prueba OrgA ${sufijo}`,
        tarifaClp: 20000,
      });

      const insRes = await ejecutarInscribir(ctxAdmin, {
        jineteId: jineteA.id,
        caballoId: caballoA.id,
        clubId: clubA.id,
        pruebas: [{ pruebaId: pRes.prueba!.id }],
        claveCliente: `ins-multi-${sufijo}`,
      });

      const binomioId = insRes.binomio!.id;

      // Intentar anular desde OrgB debe fallar por no pertenecer a la organización
      await expect(
        ejecutarAnularBinomio(ctxOrgB, binomioId, "Intento no autorizado desde otra organización")
      ).rejects.toThrow();

      // Listar binomios desde OrgB no debe incluir el binomio de OrgA
      const binomiosOrgB = await listarBinomios(ctxOrgB);
      expect(binomiosOrgB.some((b: any) => b.id === binomioId)).toBe(false);
    });
  });
});
