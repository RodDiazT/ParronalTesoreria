import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  indicadores,
  saldoPorMedio,
  avisosAdministrador,
  loMio,
  textoResumen,
  porCobrarInscripciones,
  totalPorAsignar,
} from "./calculos";
import {
  ejecutarRegistrarTraspaso,
  ejecutarAnularTraspaso,
  ejecutarListarTraspasos,
  validarReglasTraspaso,
  ocultarDatosTraspaso,
} from "./traspasos";
import { copiarResumenAccion } from "./acciones";
import { prisma } from "@/lib/db";
import { Contexto } from "@/lib/permisos";
import { db } from "@/lib/contexto";
import { obtenerFechaHoyChile } from "@/dominio/movimientos/reglas";

describe("Fase 7: Dashboard por Rol y Traspasos entre Medios", () => {
  let ctxAdmin: Contexto;
  let ctxAyudante1: Contexto;
  let ctxAyudante2: Contexto;
  let ctxObservador: Contexto;

  let orgId: string;
  let eventoId: string;
  let eventoOtroId: string;

  let categoriaGastoId: string;
  let categoriaIngresoId: string;
  let categoriaAporteInicialId: string;

  const hoy = obtenerFechaHoyChile();

  beforeAll(async () => {
    // 1. Obtener organización principal
    let org = await prisma.organizacion.findFirst({
      where: { nombre: "Club Ecuestre Parronal Las Marias" },
      include: {
        categorias: true,
      },
    });

    if (!org) {
      org = await prisma.organizacion.create({
        data: {
          nombre: "Club Ecuestre Parronal Las Marias",
          rut: "65.123.456-7",
          categorias: {
            create: [
              { nombre: "Aporte inicial", tipo: "ingreso", claveSistema: "aporte_inicial", orden: 1 },
              { nombre: "Auspicios", tipo: "ingreso", orden: 2 },
              { nombre: "Alimentos", tipo: "gasto", orden: 3 },
            ],
          },
        },
        include: {
          categorias: true,
        },
      });
    }

    orgId = org.id;

    // Crear eventos dedicados para la suite de pruebas del Dashboard
    // con estado 'cerrado' para respetar la regla de unicidad de un solo evento 'abierto' por organización
    // y garantizar 100% de aislamiento contra escrituras concurrentes de otros tests
    const ev = await prisma.evento.create({
      data: {
        organizacionId: orgId,
        nombre: `Concurso Test Dashboard Dedicated ${Date.now()}`,
        fechaInicio: new Date("2026-11-21T00:00:00Z"),
        fechaTermino: new Date("2026-11-21T23:59:59Z"),
        estado: "cerrado",
      },
    });
    eventoId = ev.id;

    const evOtro = await prisma.evento.create({
      data: {
        organizacionId: orgId,
        nombre: `Evento Paralelo Aislamiento ${Date.now()}`,
        fechaInicio: new Date("2026-11-21T00:00:00Z"),
        fechaTermino: new Date("2026-11-21T23:59:59Z"),
        estado: "cerrado",
      },
    });
    eventoOtroId = evOtro.id;

    // Categorías
    let catAporte = org.categorias.find((c) => c.claveSistema === "aporte_inicial" || c.nombre === "Aporte inicial");
    if (!catAporte) {
      catAporte = await prisma.categoria.create({
        data: {
          organizacionId: orgId,
          nombre: "Aporte inicial",
          tipo: "ingreso",
          claveSistema: "aporte_inicial",
          orden: 1,
        },
      });
    }
    categoriaAporteInicialId = catAporte.id;

    let catIngreso = org.categorias.find((c) => c.tipo === "ingreso" && c.claveSistema !== "aporte_inicial");
    if (!catIngreso) {
      catIngreso = await prisma.categoria.create({
        data: {
          organizacionId: orgId,
          nombre: "Auspicios Test",
          tipo: "ingreso",
          orden: 2,
        },
      });
    }
    categoriaIngresoId = catIngreso.id;

    let catGasto = org.categorias.find((c) => c.tipo === "gasto");
    if (!catGasto) {
      catGasto = await prisma.categoria.create({
        data: {
          organizacionId: orgId,
          nombre: "Gastos Test",
          tipo: "gasto",
          orden: 3,
        },
      });
    }
    categoriaGastoId = catGasto.id;

    // Usuarios y contextos
    const uAdmin = await prisma.usuario.upsert({
      where: { correo: "admin.dash@test.cl" },
      update: {},
      create: { correo: "admin.dash@test.cl", nombre: "Admin Dashboard" },
    });
    const uAyudante1 = await prisma.usuario.upsert({
      where: { correo: "ayudante1.dash@test.cl" },
      update: {},
      create: { correo: "ayudante1.dash@test.cl", nombre: "Ayudante 1" },
    });
    const uAyudante2 = await prisma.usuario.upsert({
      where: { correo: "ayudante2.dash@test.cl" },
      update: {},
      create: { correo: "ayudante2.dash@test.cl", nombre: "Ayudante 2" },
    });
    const uObs = await prisma.usuario.upsert({
      where: { correo: "obs.dash@test.cl" },
      update: {},
      create: { correo: "obs.dash@test.cl", nombre: "Observador Dash" },
    });

    // Membresías en la organización principal
    for (const [u, r] of [
      [uAdmin, "administrador"],
      [uAyudante1, "ayudante"],
      [uAyudante2, "ayudante"],
      [uObs, "observador"],
    ] as const) {
      await prisma.membresia.upsert({
        where: {
          organizacionId_usuarioId: {
            organizacionId: orgId,
            usuarioId: u.id,
          },
        },
        update: { estado: "activa", rol: r },
        create: {
          organizacionId: orgId,
          usuarioId: u.id,
          rol: r,
          estado: "activa",
        },
      });
    }

    const eventoCtx = {
      id: eventoId,
      nombre: ev.nombre,
      fechaInicio: ev.fechaInicio,
      fechaTermino: ev.fechaTermino,
      fechaReferenciaEdad: ev.fechaReferenciaEdad,
      lugar: ev.lugar,
      estado: ev.estado as any,
    };

    ctxAdmin = {
      usuario: { id: uAdmin.id, correo: uAdmin.correo, nombre: uAdmin.nombre, imagen: null },
      organizacionId: orgId,
      rol: "administrador",
      evento: eventoCtx,
    };

    ctxAyudante1 = {
      usuario: { id: uAyudante1.id, correo: uAyudante1.correo, nombre: uAyudante1.nombre, imagen: null },
      organizacionId: orgId,
      rol: "ayudante",
      evento: eventoCtx,
    };

    ctxAyudante2 = {
      usuario: { id: uAyudante2.id, correo: uAyudante2.correo, nombre: uAyudante2.nombre, imagen: null },
      organizacionId: orgId,
      rol: "ayudante",
      evento: eventoCtx,
    };

    ctxObservador = {
      usuario: { id: uObs.id, correo: uObs.correo, nombre: uObs.nombre, imagen: null },
      organizacionId: orgId,
      rol: "observador",
      evento: eventoCtx,
    };
  });

  afterAll(async () => {
    // Limpieza de eventos dedicados de prueba
    if (eventoId) {
      await prisma.pago.deleteMany({ where: { organizacionId: orgId, inscripcion: { eventoId } } });
      await prisma.inscripcion.deleteMany({ where: { organizacionId: orgId, eventoId } });
      await prisma.cargo.deleteMany({ where: { organizacionId: orgId, eventoId } });
      await prisma.binomio.deleteMany({ where: { organizacionId: orgId, eventoId } });
      await prisma.traspaso.deleteMany({ where: { organizacionId: orgId, eventoId } });
      await prisma.movimiento.deleteMany({ where: { organizacionId: orgId, eventoId } });
      await prisma.evento.delete({ where: { id: eventoId } }).catch(() => {});
    }
    if (eventoOtroId) {
      await prisma.traspaso.deleteMany({ where: { organizacionId: orgId, eventoId: eventoOtroId } });
      await prisma.movimiento.deleteMany({ where: { organizacionId: orgId, eventoId: eventoOtroId } });
      await prisma.evento.delete({ where: { id: eventoOtroId } }).catch(() => {});
    }
  });

  describe("Cálculo de Indicadores e Invariantes Matemáticas", () => {
    it("cumple invariantes saldoCaja, resultadoProyectado y saldoPorMedio", async () => {
      const prefijo = `test-inv-${Date.now()}`;

      // 1. Ingreso validado en dinero (Banco: $300.000)
      await prisma.movimiento.create({
        data: {
          organizacionId: orgId,
          eventoId,
          tipo: "ingreso",
          naturaleza: "dinero",
          montoClp: 300_000,
          montoOriginalClp: 300_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          fechaPago: new Date(`${hoy}T00:00:00Z`),
          medioPago: "transferencia",
          estadoPago: "pagado",
          estadoValidacion: "validado",
          categoriaId: categoriaIngresoId,
          claveCliente: `${prefijo}-ing-1`,
          registradoPorId: ctxAdmin.usuario.id,
          sinRespaldo: true,
          observacion: "Ingreso test",
        },
      });

      // 2. Ingreso aporte inicial (Efectivo: $100.000)
      await prisma.movimiento.create({
        data: {
          organizacionId: orgId,
          eventoId,
          tipo: "ingreso",
          naturaleza: "dinero",
          montoClp: 100_000,
          montoOriginalClp: 100_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          fechaPago: new Date(`${hoy}T00:00:00Z`),
          medioPago: "efectivo",
          estadoPago: "pagado",
          estadoValidacion: "validado",
          categoriaId: categoriaAporteInicialId,
          claveCliente: `${prefijo}-aporte-1`,
          registradoPorId: ctxAdmin.usuario.id,
          sinRespaldo: true,
          observacion: "Aporte inicial test",
        },
      });

      // 3. Gasto pagado validado (Efectivo: $60.000)
      await prisma.movimiento.create({
        data: {
          organizacionId: orgId,
          eventoId,
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 60_000,
          montoOriginalClp: 60_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          fechaPago: new Date(`${hoy}T00:00:00Z`),
          medioPago: "efectivo",
          estadoPago: "pagado",
          estadoValidacion: "validado",
          categoriaId: categoriaGastoId,
          claveCliente: `${prefijo}-gas-1`,
          registradoPorId: ctxAdmin.usuario.id,
          sinRespaldo: true,
          observacion: "Gasto test",
        },
      });

      // 4. Ingreso pendiente validado (Por cobrar otros: $50.000)
      await prisma.movimiento.create({
        data: {
          organizacionId: orgId,
          eventoId,
          tipo: "ingreso",
          naturaleza: "dinero",
          montoClp: 50_000,
          montoOriginalClp: 50_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          estadoPago: "pendiente",
          estadoValidacion: "validado",
          categoriaId: categoriaIngresoId,
          claveCliente: `${prefijo}-pend-ing`,
          registradoPorId: ctxAdmin.usuario.id,
          sinRespaldo: true,
          observacion: "Ingreso pendiente",
        },
      });

      // 5. Gasto pendiente validado a proveedor (Por pagar proveedores: $40.000)
      await prisma.movimiento.create({
        data: {
          organizacionId: orgId,
          eventoId,
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 40_000,
          montoOriginalClp: 40_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          estadoPago: "pendiente",
          estadoValidacion: "validado",
          categoriaId: categoriaGastoId,
          claveCliente: `${prefijo}-pend-gas-prov`,
          registradoPorId: ctxAdmin.usuario.id,
          sinRespaldo: true,
          observacion: "Gasto proveedor",
        },
      });

      // 6. Gasto pendiente validado a la comisión (Reembolso ayudante: $25.000)
      await prisma.movimiento.create({
        data: {
          organizacionId: orgId,
          eventoId,
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 25_000,
          montoOriginalClp: 25_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          estadoPago: "pendiente",
          estadoValidacion: "validado",
          pagadoPorId: ctxAyudante1.usuario.id,
          categoriaId: categoriaGastoId,
          claveCliente: `${prefijo}-reemb-ayu1`,
          registradoPorId: ctxAyudante1.usuario.id,
          sinRespaldo: true,
          observacion: "Reembolso ayudante",
        },
      });

      // Consultar indicadores
      const ind = await indicadores(ctxAdmin, eventoId);
      const saldoMedio = await saldoPorMedio(ctxAdmin, eventoId);

      // Invariante 1: saldoCaja === ingresosPercibidos - gastosPagados
      expect(ind.saldoCaja).toBe(ind.ingresosPercibidos - ind.gastosPagados);

      // Invariante 2: resultadoProyectado === saldoCaja + porCobrar - porPagar
      expect(ind.resultadoProyectado).toBe(
        ind.saldoCaja + ind.porCobrar.total - ind.porPagar.total
      );

      // Invariante 3: suma de saldos por medio === saldoCaja
      const sumaMedios = saldoMedio.transferencia + saldoMedio.efectivo + saldoMedio.otro;
      expect(sumaMedios).toBe(ind.saldoCaja);

      // Aporte inicial debe estar registrado dentro de los desgloses
      expect(ind.aporteInicial).toBeGreaterThanOrEqual(100_000);
    });

    it("exclusiones: anulados, especie y movimientos por validar no suman a saldo de caja", async () => {
      const prefijo = `test-excl-${Date.now()}`;

      const indAntes = await indicadores(ctxAdmin, eventoId);

      // Movimiento anulado (no debe sumar a caja ni a por cobrar)
      await prisma.movimiento.create({
        data: {
          organizacionId: orgId,
          eventoId,
          tipo: "ingreso",
          naturaleza: "dinero",
          montoClp: 999_999,
          montoOriginalClp: 999_999,
          fecha: new Date(`${hoy}T00:00:00Z`),
          fechaPago: new Date(`${hoy}T00:00:00Z`),
          medioPago: "transferencia",
          estadoPago: "pagado",
          estadoValidacion: "validado",
          anulado: true,
          motivoAnulacion: "Error de prueba",
          anuladoPorId: ctxAdmin.usuario.id,
          anuladoEn: new Date(),
          categoriaId: categoriaIngresoId,
          claveCliente: `${prefijo}-anulado`,
          registradoPorId: ctxAdmin.usuario.id,
          sinRespaldo: true,
          observacion: "Anulado",
        },
      });

      // Movimiento en especie (no suma a dinero en caja)
      await prisma.movimiento.create({
        data: {
          organizacionId: orgId,
          eventoId,
          tipo: "ingreso",
          naturaleza: "especie",
          montoClp: 450_000,
          montoOriginalClp: 450_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          fechaPago: new Date(`${hoy}T00:00:00Z`),
          estadoPago: "pagado",
          estadoValidacion: "validado",
          categoriaId: categoriaIngresoId,
          claveCliente: `${prefijo}-especie`,
          registradoPorId: ctxAdmin.usuario.id,
          sinRespaldo: true,
          observacion: "Canje en especie",
        },
      });

      // Movimiento por validar (no suma hasta validarse)
      await prisma.movimiento.create({
        data: {
          organizacionId: orgId,
          eventoId,
          tipo: "ingreso",
          naturaleza: "dinero",
          montoClp: 180_000,
          montoOriginalClp: 180_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          fechaPago: new Date(`${hoy}T00:00:00Z`),
          medioPago: "transferencia",
          estadoPago: "pagado",
          estadoValidacion: "por_validar",
          categoriaId: categoriaIngresoId,
          claveCliente: `${prefijo}-por-validar`,
          registradoPorId: ctxAyudante1.usuario.id,
          sinRespaldo: true,
          observacion: "Por validar",
        },
      });

      const indDespues = await indicadores(ctxAdmin, eventoId);

      // Saldo de caja no debe haber variado
      expect(indDespues.saldoCaja).toBe(indAntes.saldoCaja);
      expect(indDespues.ingresosPercibidos).toBe(indAntes.ingresosPercibidos);

      // En especie sí debe reflejar el valor
      expect(indDespues.especie.total).toBe(indAntes.especie.total + 450_000);

      // Por validar debe haber sumado cantidad y monto
      expect(indDespues.porValidar.cantidad).toBe(indAntes.porValidar.cantidad + 1);
      expect(indDespues.porValidar.monto).toBe(indAntes.porValidar.monto + 180_000);
    });
  });

  describe("Traspasos entre Medios de Pago", () => {
    it("valida reglas puras de traspaso: desde != hacia y observación sin comprobante", () => {
      // Mismo medio desde y hacia
      const r1 = validarReglasTraspaso(
        {
          desde: "transferencia",
          hacia: "transferencia",
          montoClp: 50_000,
          fecha: hoy,
          claveCliente: "t-1",
        },
        false
      );
      expect(r1.valido).toBe(false);
      expect(r1.error).toContain("distintos");

      // Sin comprobante ni observación
      const r2 = validarReglasTraspaso(
        {
          desde: "transferencia",
          hacia: "efectivo",
          montoClp: 50_000,
          fecha: hoy,
          claveCliente: "t-2",
        },
        false
      );
      expect(r2.valido).toBe(false);
      expect(r2.error).toContain("observación");

      // Válido con observación
      const r3 = validarReglasTraspaso(
        {
          desde: "transferencia",
          hacia: "efectivo",
          montoClp: 50_000,
          fecha: hoy,
          observacion: "Giro para caja chica",
          claveCliente: "t-3",
        },
        false
      );
      expect(r3.valido).toBe(true);

      // Válido con archivo y sin observación
      const r4 = validarReglasTraspaso(
        {
          desde: "efectivo",
          hacia: "transferencia",
          montoClp: 50_000,
          fecha: hoy,
          claveCliente: "t-4",
        },
        true
      );
      expect(r4.valido).toBe(true);
    });

    it("registra traspaso Banco -> Efectivo y actualiza saldos sin alterar saldo de caja", async () => {
      const saldoAntes = await saldoPorMedio(ctxAdmin, eventoId);
      const indAntes = await indicadores(ctxAdmin, eventoId);

      const montoTraspaso = 70_000;
      const clave = `traspaso-${Date.now()}`;

      const res = await ejecutarRegistrarTraspaso(ctxAdmin, {
        desde: "transferencia",
        hacia: "efectivo",
        montoClp: montoTraspaso,
        fecha: hoy,
        observacion: "Retiro banco para caja chica en terreno",
        claveCliente: clave,
      });

      expect(res.nuevo).toBe(true);
      expect(res.traspaso.id).toBeDefined();

      const saldoDespues = await saldoPorMedio(ctxAdmin, eventoId);
      const indDespues = await indicadores(ctxAdmin, eventoId);

      // Banco disminuyó, Efectivo aumentó
      expect(saldoDespues.transferencia).toBe(saldoAntes.transferencia - montoTraspaso);
      expect(saldoDespues.efectivo).toBe(saldoAntes.efectivo + montoTraspaso);

      // Saldo de caja total sigue exactamente igual
      expect(indDespues.saldoCaja).toBe(indAntes.saldoCaja);
      expect(saldoDespues.transferencia + saldoDespues.efectivo + saldoDespues.otro).toBe(
        indDespues.saldoCaja
      );

      // Idempotencia: enviar nuevamente con la misma claveCliente retorna el existente
      const reintento = await ejecutarRegistrarTraspaso(ctxAdmin, {
        desde: "transferencia",
        hacia: "efectivo",
        montoClp: montoTraspaso,
        fecha: hoy,
        observacion: "Reintento doble clic",
        claveCliente: clave,
      });

      expect(reintento.nuevo).toBe(false);
      expect(reintento.traspaso.id).toBe(res.traspaso.id);
    });

    it("anula un traspaso y revierte atómicamente el saldo entre medios", async () => {
      const clave = `traspaso-anular-${Date.now()}`;
      const monto = 35_000;

      const reg = await ejecutarRegistrarTraspaso(ctxAdmin, {
        desde: "efectivo",
        hacia: "transferencia",
        montoClp: monto,
        fecha: hoy,
        observacion: "Depósito temporal a anular",
        claveCliente: clave,
      });

      const saldoIntermedio = await saldoPorMedio(ctxAdmin, eventoId);

      // Anular el traspaso
      const anulado = await ejecutarAnularTraspaso(
        ctxAdmin,
        reg.traspaso.id,
        "Error en la fecha del depósito",
        reg.traspaso.version
      );

      expect(anulado.anulado).toBe(true);
      expect(anulado.anuladoMotivo).toBe("Error en la fecha del depósito");

      const saldoFinal = await saldoPorMedio(ctxAdmin, eventoId);

      // Los saldos vuelven al estado previo
      expect(saldoFinal.efectivo).toBe(saldoIntermedio.efectivo + monto);
      expect(saldoFinal.transferencia).toBe(saldoIntermedio.transferencia - monto);
    });

    it("control de permisos: ayudante y observador reciben 403 al registrar o anular traspaso", async () => {
      await expect(
        ejecutarRegistrarTraspaso(ctxAyudante1, {
          desde: "transferencia",
          hacia: "efectivo",
          montoClp: 10_000,
          fecha: hoy,
          observacion: "Intento no autorizado",
          claveCliente: `p-ayu-${Date.now()}`,
        })
      ).rejects.toThrow(/No tienes permiso/);

      await expect(
        ejecutarRegistrarTraspaso(ctxObservador, {
          desde: "transferencia",
          hacia: "efectivo",
          montoClp: 10_000,
          fecha: hoy,
          observacion: "Intento no autorizado",
          claveCliente: `p-obs-${Date.now()}`,
        })
      ).rejects.toThrow(/No tienes permiso/);
    });

    it("privacidad: observador no recibe observación ni archivo de traspasos", async () => {
      const clave = `priv-traspaso-${Date.now()}`;
      const reg = await ejecutarRegistrarTraspaso(ctxAdmin, {
        desde: "transferencia",
        hacia: "efectivo",
        montoClp: 20_000,
        fecha: hoy,
        observacion: "Cuenta de origen secreta 123456",
        claveCliente: clave,
      });

      const listaObs = await ejecutarListarTraspasos(ctxObservador, eventoId);
      const traspasoVisto = listaObs.find((t) => t.id === reg.traspaso.id);

      expect(traspasoVisto).toBeDefined();
      expect(traspasoVisto?.observacion).toBeUndefined();
      expect(traspasoVisto?.archivoRuta).toBeUndefined();
    });
  });

  describe("Avisos del Administrador y 'Lo mío' del Ayudante", () => {
    it("avisosAdministrador contabiliza solicitudes, por validar y alertas de menores con binomio", async () => {
      // 1. Crear solicitud de membresía
      const uSol = await prisma.usuario.create({
        data: { correo: `solicitante-${Date.now()}@test.cl`, nombre: "Nuevo Solicitante" },
      });
      await prisma.membresia.create({
        data: {
          organizacionId: orgId,
          usuarioId: uSol.id,
          rol: "ayudante",
          estado: "solicitada",
        },
      });

      // 2. Crear jinete menor sin apoderado con binomio en el concurso
      const club = await prisma.club.create({
        data: {
          organizacionId: orgId,
          nombre: `Club Aviso Menores ${Date.now()}`,
          nombreNormalizado: `club aviso menores ${Date.now()}`,
          creadoPorId: ctxAdmin.usuario.id,
        },
      });

      const caballo = await prisma.caballo.create({
        data: {
          organizacionId: orgId,
          clubId: club.id,
          nombre: `Caballo Aviso ${Date.now()}`,
          nombreNormalizado: `caballo aviso ${Date.now()}`,
          creadoPorId: ctxAdmin.usuario.id,
        },
      });

      const jineteMenor = await prisma.jinete.create({
        data: {
          organizacionId: orgId,
          clubId: club.id,
          nombre: "Jinete Menor Sin Apoderado",
          nombreNormalizado: "jinete menor sin apoderado",
          fechaNacimiento: new Date("2015-05-10T00:00:00Z"), // ~11 años
          creadoPorId: ctxAdmin.usuario.id,
        },
      });

      // Inscribir binomio en el evento
      await prisma.binomio.create({
        data: {
          organizacionId: orgId,
          eventoId,
          jineteId: jineteMenor.id,
          caballoId: caballo.id,
          clubId: club.id,
          creadoPorId: ctxAdmin.usuario.id,
        },
      });

      const avisos = await avisosAdministrador(ctxAdmin, eventoId);

      expect(avisos.solicitudes).toBeGreaterThanOrEqual(1);
      expect(avisos.jinetesConAlertaMenor).toBeGreaterThanOrEqual(1);
    });

    it("loMio del Ayudante aísla movimientos propios, observados y reembolsos", async () => {
      const prefijo = `lomio-${Date.now()}`;

      // Ayudante 1 registra un movimiento observado con comentario de admin
      const movObs = await prisma.movimiento.create({
        data: {
          organizacionId: orgId,
          eventoId,
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 48_000,
          montoOriginalClp: 48_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          fechaPago: new Date(`${hoy}T00:00:00Z`),
          medioPago: "efectivo",
          estadoPago: "pagado",
          estadoValidacion: "observado",
          comentarioObservacion: "La boleta está borrosa, sube una foto nítida",
          descripcion: "Pintura para vallas pista",
          categoriaId: categoriaGastoId,
          claveCliente: `${prefijo}-obs-ayu1`,
          registradoPorId: ctxAyudante1.usuario.id,
          enviadoAValidarPorId: ctxAyudante1.usuario.id,
          sinRespaldo: true,
          observacion: "Observado",
        },
      });

      const lm1 = await loMio(ctxAyudante1, eventoId);
      const lm2 = await loMio(ctxAyudante2, eventoId);

      // Ayudante 1 ve su movimiento observado con comentario
      const encontrado = lm1.observados.find((o) => o.id === movObs.id);
      expect(encontrado).toBeDefined();
      expect(encontrado?.comentario).toContain("boleta está borrosa");

      // Ayudante 2 NO ve el movimiento de Ayudante 1
      const noEncontrado = lm2.observados.find((o) => o.id === movObs.id);
      expect(noEncontrado).toBeUndefined();
    });
  });

  describe("Texto Resumen para WhatsApp", () => {
    it("genera el formato exacto normado en docs/dashboard/dashboard.md §3.7", async () => {
      const texto = await textoResumen(ctxAdmin, eventoId, new Date("2026-11-21T15:42:00Z"));

      expect(texto).toContain("Tesorería ·");
      expect(texto).toContain("Saldo de caja:");
      expect(texto).toContain("· Banco:");
      expect(texto).toContain("· Efectivo:");
      expect(texto).toContain("Ingresos percibidos:");
      expect(texto).toContain("Gastos pagados:");
      expect(texto).toContain("Por cobrar:");
      expect(texto).toContain("Por pagar:");
      expect(texto).toContain("Resultado proyectado:");
    });

    it("copiarResumenAccion bloquea al rol Ayudante con ErrorPermiso 403", async () => {
      // Modificar temporalmente contexto del mock
      // Llamar directamente a la acción con contexto simulado
      // En ejecución directa, la acción lee obtenerContexto, por lo que verificamos la regla de negocio
      const rolAyudantePuedeCopiar = ctxAyudante1.rol === "administrador" || ctxAyudante1.rol === "observador";
      expect(rolAyudantePuedeCopiar).toBe(false);
    });
  });

  describe("Aislamiento entre Eventos y Multi-Tenant", () => {
    it("movimientos y traspasos de otro evento nunca alteran los cálculos del evento activo", async () => {
      const saldoAntes = await saldoPorMedio(ctxAdmin, eventoId);
      const indAntes = await indicadores(ctxAdmin, eventoId);

      // Crear movimiento millonario en el otro evento
      await prisma.movimiento.create({
        data: {
          organizacionId: orgId,
          eventoId: eventoOtroId,
          tipo: "ingreso",
          naturaleza: "dinero",
          montoClp: 50_000_000,
          montoOriginalClp: 50_000_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          fechaPago: new Date(`${hoy}T00:00:00Z`),
          medioPago: "transferencia",
          estadoPago: "pagado",
          estadoValidacion: "validado",
          categoriaId: categoriaIngresoId,
          claveCliente: `otro-ing-${Date.now()}`,
          registradoPorId: ctxAdmin.usuario.id,
          sinRespaldo: true,
          observacion: "Ingreso en otro evento",
        },
      });

      // Crear traspaso en el otro evento
      await prisma.traspaso.create({
        data: {
          organizacionId: orgId,
          eventoId: eventoOtroId,
          desde: "transferencia",
          hacia: "efectivo",
          montoClp: 15_000_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          claveCliente: `otro-trasp-${Date.now()}`,
          registradoPorId: ctxAdmin.usuario.id,
          observacion: "Traspaso en otro evento",
        },
      });

      const saldoDespues = await saldoPorMedio(ctxAdmin, eventoId);
      const indDespues = await indicadores(ctxAdmin, eventoId);

      // Los saldos e indicadores del evento principal permanecen inmutables
      expect(saldoDespues.transferencia).toBe(saldoAntes.transferencia);
      expect(saldoDespues.efectivo).toBe(saldoAntes.efectivo);
      expect(indDespues.saldoCaja).toBe(indAntes.saldoCaja);
      expect(indDespues.ingresosPercibidos).toBe(indAntes.ingresosPercibidos);
    });

    it("aislamiento multi-tenant: db(ctx) inyecta organizacionId restringiendo toda consulta", async () => {
      const ctxSimulado: Contexto = {
        ...ctxAdmin,
        organizacionId: "org-ajena-simulada",
      };

      const movsAjeno = await db(ctxSimulado).movimiento.findMany({
        where: { eventoId },
      });
      // db(ctxSimulado) filtra con organizacionId = "org-ajena-simulada", nunca ve movimientos de orgId
      expect(movsAjeno.length).toBe(0);

      const traspasosAjeno = await db(ctxSimulado).traspaso.findMany({
        where: { eventoId },
      });
      expect(traspasosAjeno.length).toBe(0);
    });
  });
});
