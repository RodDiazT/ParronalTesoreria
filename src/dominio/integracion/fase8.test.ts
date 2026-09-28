import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { Contexto } from "@/lib/permisos";
import { db, exigirDeLaOrganizacion } from "@/lib/contexto";
import { indicadores, saldoPorMedio } from "@/dominio/dashboard/calculos";
import { ejecutarRegistrarTraspaso, ejecutarAnularTraspaso } from "@/dominio/dashboard/traspasos";
import {
  ejecutarRegistrarMovimiento,
  ejecutarValidarMovimiento,
  ejecutarAnularMovimiento,
} from "@/dominio/movimientos/acciones";
import { ejecutarMarcarPagado } from "@/dominio/movimientos/abonos";
import { obtenerFechaHoyChile } from "@/dominio/movimientos/reglas";
import { GET as healthCheckGET } from "@/app/api/health/route";

describe("Fase 8: Pruebas Integrales de Aislamiento, Cuadratura de Caja, Despliegue y Puesta en Marcha", () => {
  // Contextos para organizaciones independientes
  let ctxAlphaAdmin: Contexto;
  let ctxBetaAdmin: Contexto;

  let orgAlphaId: string;
  let orgBetaId: string;

  let eventoAlphaId: string;
  let eventoBetaId: string;

  let catAlphaAporteId: string;
  let catAlphaIngresoId: string;
  let catAlphaGastoId: string;

  let catBetaGastoId: string;

  let cpAlphaProveedorId: string;
  let cpBetaProveedorId: string;

  let clubAlphaId: string;
  let clubBetaId: string;

  const hoy = obtenerFechaHoyChile();

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Crear Organización Alpha de prueba
    const orgAlpha = await prisma.organizacion.create({
      data: {
        nombre: `Org Alpha Integral ${timestamp}`,
        nombreNormalizado: `org alpha integral ${timestamp}`,
        categorias: {
          create: [
            { nombre: "Aporte inicial", nombreNormalizado: "aporte inicial", tipo: "ingreso", claveSistema: "aporte_inicial", orden: 1 },
            { nombre: "Auspicios Alpha", nombreNormalizado: "auspicios alpha", tipo: "ingreso", orden: 2 },
            { nombre: "Gastos Alpha", nombreNormalizado: "gastos alpha", tipo: "gasto", orden: 3 },
          ],
        },
      },
      include: { categorias: true },
    });
    orgAlphaId = orgAlpha.id;

    catAlphaAporteId = orgAlpha.categorias.find((c) => c.claveSistema === "aporte_inicial")!.id;
    catAlphaIngresoId = orgAlpha.categorias.find((c) => c.nombre === "Auspicios Alpha")!.id;
    catAlphaGastoId = orgAlpha.categorias.find((c) => c.nombre === "Gastos Alpha")!.id;

    // 2. Crear Organización Beta de prueba (aislamiento)
    const orgBeta = await prisma.organizacion.create({
      data: {
        nombre: `Org Beta Integral ${timestamp}`,
        nombreNormalizado: `org beta integral ${timestamp}`,
        categorias: {
          create: [
            { nombre: "Gastos Beta", nombreNormalizado: "gastos beta", tipo: "gasto", orden: 1 },
          ],
        },
      },
      include: { categorias: true },
    });
    orgBetaId = orgBeta.id;
    catBetaGastoId = orgBeta.categorias.find((c) => c.nombre === "Gastos Beta")!.id;

    // 3. Crear eventos dedicados abiertos para cada organización de prueba
    const evAlpha = await prisma.evento.create({
      data: {
        organizacionId: orgAlphaId,
        nombre: `Evento Alpha ${timestamp}`,
        fechaInicio: new Date("2026-11-21T00:00:00Z"),
        fechaTermino: new Date("2026-11-21T23:59:59Z"),
        estado: "abierto",
      },
    });
    eventoAlphaId = evAlpha.id;

    const evBeta = await prisma.evento.create({
      data: {
        organizacionId: orgBetaId,
        nombre: `Evento Beta ${timestamp}`,
        fechaInicio: new Date("2026-11-21T00:00:00Z"),
        fechaTermino: new Date("2026-11-21T23:59:59Z"),
        estado: "abierto",
      },
    });
    eventoBetaId = evBeta.id;

    // 4. Crear usuarios administradores
    const userAlpha = await prisma.usuario.create({
      data: {
        correo: `admin.alpha.${timestamp}@test.cl`,
        nombre: "Admin Alpha",
        avisoAceptadoEn: new Date(),
        avisoVersion: 1,
        membresias: {
          create: {
            organizacionId: orgAlphaId,
            rol: "administrador",
            estado: "activa",
          },
        },
      },
    });

    const userBeta = await prisma.usuario.create({
      data: {
        correo: `admin.beta.${timestamp}@test.cl`,
        nombre: "Admin Beta",
        avisoAceptadoEn: new Date(),
        avisoVersion: 1,
        membresias: {
          create: {
            organizacionId: orgBetaId,
            rol: "administrador",
            estado: "activa",
          },
        },
      },
    });

    ctxAlphaAdmin = {
      usuario: { id: userAlpha.id, correo: userAlpha.correo, nombre: userAlpha.nombre, imagen: null },
      organizacionId: orgAlphaId,
      rol: "administrador",
      evento: {
        id: evAlpha.id,
        nombre: evAlpha.nombre,
        fechaInicio: evAlpha.fechaInicio,
        fechaTermino: evAlpha.fechaTermino,
        fechaReferenciaEdad: evAlpha.fechaReferenciaEdad,
        lugar: null,
        estado: "abierto",
      },
    };

    ctxBetaAdmin = {
      usuario: { id: userBeta.id, correo: userBeta.correo, nombre: userBeta.nombre, imagen: null },
      organizacionId: orgBetaId,
      rol: "administrador",
      evento: {
        id: evBeta.id,
        nombre: evBeta.nombre,
        fechaInicio: evBeta.fechaInicio,
        fechaTermino: evBeta.fechaTermino,
        fechaReferenciaEdad: evBeta.fechaReferenciaEdad,
        lugar: null,
        estado: "abierto",
      },
    };

    // 5. Contrapartes en cada organización
    const cpAlpha = await prisma.contraparte.create({
      data: {
        organizacionId: orgAlphaId,
        nombre: "Proveedor Alpha",
        nombreNormalizado: "proveedor alpha",
        esProveedor: true,
        creadoPorId: userAlpha.id,
      },
    });
    cpAlphaProveedorId = cpAlpha.id;

    const cpBeta = await prisma.contraparte.create({
      data: {
        organizacionId: orgBetaId,
        nombre: "Proveedor Beta",
        nombreNormalizado: "proveedor beta",
        esProveedor: true,
        creadoPorId: userBeta.id,
      },
    });
    cpBetaProveedorId = cpBeta.id;

    // 6. Clubes en cada organización
    const clubAlpha = await prisma.club.create({
      data: {
        organizacionId: orgAlphaId,
        nombre: "Club Ecuestre Alpha",
        nombreNormalizado: "club ecuestre alpha",
        creadoPorId: userAlpha.id,
      },
    });
    clubAlphaId = clubAlpha.id;

    const clubBeta = await prisma.club.create({
      data: {
        organizacionId: orgBetaId,
        nombre: "Club Ecuestre Beta",
        nombreNormalizado: "club ecuestre beta",
        creadoPorId: userBeta.id,
      },
    });
    clubBetaId = clubBeta.id;
  });

  afterAll(async () => {
    // Limpieza de datos creados en la suite integral
    const limpiarOrg = async (orgId: string, usuarioId?: string) => {
      if (!orgId) return;
      try {
        await prisma.registroAuditoria.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        await prisma.respaldo.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        await prisma.pago.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        await prisma.devolucion.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        await prisma.traspaso.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        await prisma.movimiento.updateMany({ where: { organizacionId: orgId }, data: { abonoDeId: null } }).catch(() => {});
        await prisma.movimiento.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        await prisma.contraparte.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        await prisma.jinete.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        await prisma.club.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        await prisma.categoria.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        await prisma.evento.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        await prisma.membresia.deleteMany({ where: { organizacionId: orgId } }).catch(() => {});
        if (usuarioId) {
          await prisma.usuario.deleteMany({ where: { id: usuarioId } }).catch(() => {});
        }
        await prisma.organizacion.deleteMany({ where: { id: orgId } }).catch(() => {});
      } catch (e) {
        console.error("Error en limpiarOrg:", e);
      }
    };

    await limpiarOrg(orgAlphaId, ctxAlphaAdmin?.usuario?.id);
    await limpiarOrg(orgBetaId, ctxBetaAdmin?.usuario?.id);
  });

  describe("8.1 Suite de Pruebas Automatizadas: Aislamiento Multi-Tenant", () => {
    it("las consultas a través de db(ctx) nunca filtran ni acceden a datos de otra organización", async () => {
      // Registrar un movimiento en Beta
      await prisma.movimiento.create({
        data: {
          organizacionId: orgBetaId,
          eventoId: eventoBetaId,
          tipo: "gasto",
          medioPago: "transferencia",
          montoClp: 999_999,
          montoOriginalClp: 999_999,
          fecha: new Date(`${hoy}T00:00:00Z`),
          fechaPago: new Date(`${hoy}T00:00:00Z`),
          categoriaId: catBetaGastoId,
          estadoPago: "pagado",
          estadoValidacion: "validado",
          claveCliente: `mov-beta-${Date.now()}`,
          registradoPorId: ctxBetaAdmin.usuario.id,
          sinRespaldo: true,
          observacion: "Gasto exclusivo de Beta",
        },
      });

      // Consultar movimientos a través de db(ctxAlphaAdmin)
      const movsAlpha = await db(ctxAlphaAdmin).movimiento.findMany();
      expect(movsAlpha.some((m) => m.montoClp === 999_999)).toBe(false);
      expect(movsAlpha.every((m) => m.organizacionId === orgAlphaId)).toBe(true);

      // Consultar clubes a través de db(ctxAlphaAdmin)
      const clubesAlpha = await db(ctxAlphaAdmin).club.findMany();
      expect(clubesAlpha.some((c) => c.id === clubBetaId)).toBe(false);
      expect(clubesAlpha.every((c) => c.organizacionId === orgAlphaId)).toBe(true);

      // Consultar contrapartes a través de db(ctxAlphaAdmin)
      const contrapartesAlpha = await db(ctxAlphaAdmin).contraparte.findMany();
      expect(contrapartesAlpha.some((cp) => cp.id === cpBetaProveedorId)).toBe(false);
      expect(contrapartesAlpha.every((cp) => cp.organizacionId === orgAlphaId)).toBe(true);
    });

    it("exigirDeLaOrganizacion corta con error al referenciar entidades de otra organización", async () => {
      // Validar contraparte de Beta desde Alpha
      await expect(
        exigirDeLaOrganizacion(ctxAlphaAdmin, "contraparte", cpBetaProveedorId)
      ).rejects.toThrow(/no pertenece a tu organización o no existe/);

      // Validar categoría de Beta desde Alpha
      await expect(
        exigirDeLaOrganizacion(ctxAlphaAdmin, "categoria", catBetaGastoId)
      ).rejects.toThrow(/no pertenece a tu organización o no existe/);

      // Validar club de Beta desde Alpha
      await expect(
        exigirDeLaOrganizacion(ctxAlphaAdmin, "club", clubBetaId)
      ).rejects.toThrow(/no pertenece a tu organización o no existe/);
    });

    it("rechaza crear un movimiento en Alpha referenciando una categoría de Beta", async () => {
      await expect(
        ejecutarRegistrarMovimiento(
          ctxAlphaAdmin,
          {
            tipo: "gasto",
            medioPago: "transferencia",
            montoClp: 50_000,
            fecha: hoy,
            fechaPago: hoy,
            categoriaId: catBetaGastoId, // Pertenece a Beta!
            contraparteId: cpAlphaProveedorId,
            estadoPago: "pagado",
            sinRespaldo: true,
            observacion: "Intento de cruzar tenant",
            claveCliente: `cross-tenant-${Date.now()}`,
          },
          []
        )
      ).rejects.toThrow(/no pertenece a tu organización/);
    });
  });

  describe("8.1 Suite de Pruebas Automatizadas: Cuadratura de Caja y Saldo por Medio de Pago", () => {
    it("cumple invariantes contables estrictas de saldoCaja, saldos por medio y resultado proyectado", async () => {
      // 1. Ingreso Aporte Inicial: $1.000.000 (transferencia/banco, pagado, validado)
      await ejecutarRegistrarMovimiento(
        ctxAlphaAdmin,
        {
          tipo: "ingreso",
          medioPago: "transferencia",
          montoClp: 1_000_000,
          fecha: hoy,
          fechaPago: hoy,
          nombreOrigen: "Aporte Inicial Parronal",
          categoriaId: catAlphaAporteId,
          estadoPago: "pagado",
          sinRespaldo: true,
          observacion: "Aporte inicial del club",
          claveCliente: `ing-aporte-${Date.now()}`,
        },
        []
      );

      // 2. Ingreso por Auspicio: $500.000 (efectivo, pagado, validado)
      await ejecutarRegistrarMovimiento(
        ctxAlphaAdmin,
        {
          tipo: "ingreso",
          medioPago: "efectivo",
          montoClp: 500_000,
          fecha: hoy,
          fechaPago: hoy,
          categoriaId: catAlphaIngresoId,
          contraparteId: cpAlphaProveedorId,
          estadoPago: "pagado",
          sinRespaldo: true,
          observacion: "Auspicio en efectivo",
          claveCliente: `ing-efectivo-${Date.now()}`,
        },
        []
      );

      // 3. Ingreso Venta/Otro: $200.000 (otro, pagado, validado)
      await ejecutarRegistrarMovimiento(
        ctxAlphaAdmin,
        {
          tipo: "ingreso",
          medioPago: "otro",
          montoClp: 200_000,
          fecha: hoy,
          fechaPago: hoy,
          categoriaId: catAlphaIngresoId,
          estadoPago: "pagado",
          sinRespaldo: true,
          observacion: "Ingreso por cheque u otro medio",
          claveCliente: `ing-otro-${Date.now()}`,
        },
        []
      );

      // 4. Gasto Pagado Banco: $400.000 (transferencia, pagado, validado)
      await ejecutarRegistrarMovimiento(
        ctxAlphaAdmin,
        {
          tipo: "gasto",
          medioPago: "transferencia",
          montoClp: 400_000,
          fecha: hoy,
          fechaPago: hoy,
          categoriaId: catAlphaGastoId,
          contraparteId: cpAlphaProveedorId,
          estadoPago: "pagado",
          sinRespaldo: true,
          observacion: "Arriendo de pista pagado",
          claveCliente: `gasto-banco-${Date.now()}`,
        },
        []
      );

      // 5. Gasto Pagado Efectivo: $150.000 (efectivo, pagado, validado)
      await ejecutarRegistrarMovimiento(
        ctxAlphaAdmin,
        {
          tipo: "gasto",
          medioPago: "efectivo",
          montoClp: 150_000,
          fecha: hoy,
          fechaPago: hoy,
          categoriaId: catAlphaGastoId,
          estadoPago: "pagado",
          sinRespaldo: true,
          observacion: "Insumos menores en efectivo",
          claveCliente: `gasto-efectivo-${Date.now()}`,
        },
        []
      );

      // 6. Gasto Pendiente Proveedor: $300.000 (sin medioPago, pagado: false, validado)
      await ejecutarRegistrarMovimiento(
        ctxAlphaAdmin,
        {
          tipo: "gasto",
          montoClp: 300_000,
          fecha: hoy,
          categoriaId: catAlphaGastoId,
          contraparteId: cpAlphaProveedorId,
          estadoPago: "pendiente",
          sinRespaldo: true,
          observacion: "Sonido por pagar a proveedor",
          claveCliente: `gasto-pendiente-prov-${Date.now()}`,
        },
        []
      );

      // 7. Gasto Pendiente a Comisión (Reembolso): $50.000 (pagado: false, pagadoPorId: userAlpha.id)
      await prisma.movimiento.create({
        data: {
          organizacionId: orgAlphaId,
          eventoId: eventoAlphaId,
          tipo: "gasto",
          medioPago: null,
          montoClp: 50_000,
          montoOriginalClp: 50_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          categoriaId: catAlphaGastoId,
          estadoPago: "pendiente",
          pagadoPorId: ctxAlphaAdmin.usuario.id,
          estadoValidacion: "validado",
          claveCliente: `gasto-reembolso-${Date.now()}`,
          registradoPorId: ctxAlphaAdmin.usuario.id,
          sinRespaldo: true,
          observacion: "Combustible anticipado por el administrador",
        },
      });

      // 8. Ingreso Pendiente por Cobrar: $250.000 (sin medioPago, pagado: false, validado)
      await ejecutarRegistrarMovimiento(
        ctxAlphaAdmin,
        {
          tipo: "ingreso",
          montoClp: 250_000,
          fecha: hoy,
          categoriaId: catAlphaIngresoId,
          contraparteId: cpAlphaProveedorId,
          estadoPago: "pendiente",
          sinRespaldo: true,
          observacion: "Compromiso de auspicio pendiente",
          claveCliente: `ing-por-cobrar-${Date.now()}`,
        },
        []
      );

      // 9. Movimiento en Especie: $80.000 (no debe tocar dinero en caja)
      await prisma.movimiento.create({
        data: {
          organizacionId: orgAlphaId,
          eventoId: eventoAlphaId,
          tipo: "ingreso",
          medioPago: null,
          naturaleza: "especie",
          montoClp: 80_000,
          montoOriginalClp: 80_000,
          fecha: new Date(`${hoy}T00:00:00Z`),
          fechaPago: new Date(`${hoy}T00:00:00Z`),
          categoriaId: catAlphaIngresoId,
          estadoPago: "pagado",
          estadoValidacion: "validado",
          claveCliente: `ing-especie-${Date.now()}`,
          registradoPorId: ctxAlphaAdmin.usuario.id,
          sinRespaldo: true,
          observacion: "Donación de 4 copas de trofeo",
        },
      });

      // Validar cálculo de indicadores del dashboard
      const ind = await indicadores(ctxAlphaAdmin, eventoAlphaId);

      // Ingresos percibidos = 1.000.000 + 500.000 + 200.000 = 1.700.000
      expect(ind.ingresosPercibidos).toBe(1_700_000);
      expect(ind.aporteInicial).toBe(1_000_000);

      // Gastos pagados = 400.000 + 150.000 = 550.000
      expect(ind.gastosPagados).toBe(550_000);

      // Invariante 1: Saldo de caja = ingresosPercibidos - gastosPagados = 1.150.000
      expect(ind.saldoCaja).toBe(1_150_000);
      expect(ind.saldoCaja).toBe(ind.ingresosPercibidos - ind.gastosPagados);

      // Por cobrar = 250.000
      expect(ind.porCobrar.total).toBe(250_000);

      // Por pagar = 300.000 (proveedor) + 50.000 (comisión) = 350.000
      expect(ind.porPagar.proveedores).toBe(300_000);
      expect(ind.porPagar.comision).toBe(50_000);
      expect(ind.porPagar.total).toBe(350_000);

      // Invariante 2: Resultado proyectado = saldoCaja + porCobrar - porPagar
      // 1.150.000 + 250.000 - 350.000 = 1.050.000
      expect(ind.resultadoProyectado).toBe(1_050_000);
      expect(ind.resultadoProyectado).toBe(ind.saldoCaja + ind.porCobrar.total - ind.porPagar.total);

      // Especie está en sección aparte sin contaminar caja
      expect(ind.especie.total).toBe(80_000);

      // Validar desglose por medio de pago
      const spm = await saldoPorMedio(ctxAlphaAdmin, eventoAlphaId);

      // Banco (transferencia): 1.000.000 - 400.000 = 600.000
      expect(spm.transferencia).toBe(600_000);

      // Efectivo: 500.000 - 150.000 = 350.000
      expect(spm.efectivo).toBe(350_000);

      // Otro: 200.000
      expect(spm.otro).toBe(200_000);

      // Invariante 3: transferencia + efectivo + otro === saldoCaja
      expect(spm.transferencia + spm.efectivo + spm.otro).toBe(ind.saldoCaja);
    });

    it("el registro y anulación de un traspaso conserva exactamente la invariante de caja", async () => {
      const indAntes = await indicadores(ctxAlphaAdmin, eventoAlphaId);
      const spmAntes = await saldoPorMedio(ctxAlphaAdmin, eventoAlphaId);

      // Retiro bancario de $200.000 para habilitar caja chica en efectivo
      const { traspaso } = await ejecutarRegistrarTraspaso(ctxAlphaAdmin, {
        desde: "transferencia",
        hacia: "efectivo",
        montoClp: 200_000,
        fecha: hoy,
        observacion: "Habilitación de caja chica para el concurso",
        claveCliente: `trasp-integral-${Date.now()}`,
      });

      const indDurante = await indicadores(ctxAlphaAdmin, eventoAlphaId);
      const spmDurante = await saldoPorMedio(ctxAlphaAdmin, eventoAlphaId);

      // El saldo total de caja NO cambia (el dinero solo se movió de medio)
      expect(indDurante.saldoCaja).toBe(indAntes.saldoCaja);

      // Banco disminuyó en 200.000, Efectivo aumentó en 200.000
      expect(spmDurante.transferencia).toBe(spmAntes.transferencia - 200_000);
      expect(spmDurante.efectivo).toBe(spmAntes.efectivo + 200_000);
      expect(spmDurante.otro).toBe(spmAntes.otro);
      expect(spmDurante.transferencia + spmDurante.efectivo + spmDurante.otro).toBe(indDurante.saldoCaja);

      // Anulación del traspaso (parámetros posicionales)
      await ejecutarAnularTraspaso(
        ctxAlphaAdmin,
        traspaso.id,
        "Error en el monto retirado, se anula",
        traspaso.version
      );

      const indDespues = await indicadores(ctxAlphaAdmin, eventoAlphaId);
      const spmDespues = await saldoPorMedio(ctxAlphaAdmin, eventoAlphaId);

      // Los saldos vuelven con exactitud absoluta a los valores antes del traspaso
      expect(indDespues.saldoCaja).toBe(indAntes.saldoCaja);
      expect(spmDespues.transferencia).toBe(spmAntes.transferencia);
      expect(spmDespues.efectivo).toBe(spmAntes.efectivo);
      expect(spmDespues.otro).toBe(spmAntes.otro);
    });
  });

  describe("8.1 Suite de Pruebas Automatizadas: Integridad de Pagos Parciales, Abonos y Restitución", () => {
    it("gestiona abonos sucesivos, amortización de saldo y restitución atómica al anular", async () => {
      // 1. Crear gasto pendiente de $100.000 a proveedor (sin medioPago al nacer pendiente)
      const resReg = await ejecutarRegistrarMovimiento(
        ctxAlphaAdmin,
        {
          tipo: "gasto",
          montoClp: 100_000,
          fecha: hoy,
          categoriaId: catAlphaGastoId,
          contraparteId: cpAlphaProveedorId,
          estadoPago: "pendiente",
          sinRespaldo: true,
          observacion: "Servicio de ambulancia",
          claveCliente: `gasto-abonos-${Date.now()}`,
        },
        []
      );

      expect(resReg.exito).toBe(true);
      const movId = resReg.movimiento!.id;
      const movInicial = await prisma.movimiento.findUnique({ where: { id: movId } });
      expect(movInicial!.estadoPago).toBe("pendiente");
      expect(movInicial!.montoClp).toBe(100_000);
      expect(movInicial!.montoOriginalClp).toBe(100_000);

      // 2. Abono parcial 1: $30.000 por administrador (se valida y aplica de inmediato)
      const resAbono1 = await ejecutarMarcarPagado(
        ctxAlphaAdmin,
        movId,
        {
          montoClp: 30_000,
          fechaPago: hoy,
          medioPago: "transferencia",
        },
        movInicial!.version
      );
      expect(resAbono1.tipo).toBe("abono");

      const movPostAbono1 = await prisma.movimiento.findUnique({
        where: { id: movId },
      });
      expect(movPostAbono1!.estadoPago).toBe("pendiente");
      expect(movPostAbono1!.montoClp).toBe(70_000);

      // 3. Anulación del abono parcial 1: el saldo del movimiento original se restituye a $100.000
      const abono1Obj = (resAbono1 as any).movimiento;
      const resAnularAbono = await ejecutarAnularMovimiento(
        ctxAlphaAdmin,
        abono1Obj.id,
        "Abono transferido por error de digitación",
        abono1Obj.version
      );
      expect(resAnularAbono.exito).toBe(true);

      const movPostAnulacion = await prisma.movimiento.findUnique({
        where: { id: movId },
      });
      expect(movPostAnulacion!.estadoPago).toBe("pendiente");
      expect(movPostAnulacion!.montoClp).toBe(100_000);

      // 4. Pago total del saldo ($100.000)
      const resPagoTotal = await ejecutarMarcarPagado(
        ctxAlphaAdmin,
        movId,
        {
          montoClp: 100_000,
          fechaPago: hoy,
          medioPago: "transferencia",
        },
        movPostAnulacion!.version
      );
      expect(resPagoTotal.tipo).toBe("pago_total");

      const movPostPagoTotal = await prisma.movimiento.findUnique({
        where: { id: movId },
      });
      expect(movPostPagoTotal!.estadoPago).toBe("pagado");

      // 5. Intentar abonar sobre un movimiento totalmente pagado debe ser rechazado
      const resRechazo = await ejecutarMarcarPagado(
        ctxAlphaAdmin,
        movId,
        {
          montoClp: 10_000,
          fechaPago: hoy,
          medioPago: "transferencia",
        },
        movPostPagoTotal!.version
      );
      expect(resRechazo.exito).toBe(false);
      expect((resRechazo as any).error).toContain("El movimiento ya está marcado como pagado.");
    });
  });

  describe("8.2 Configuración de Build y Endpoint de Salud en Railway", () => {
    it("el endpoint GET /api/health responde 200 OK con conexión activa a PostgreSQL", async () => {
      const response = await healthCheckGET();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe("ok");
      expect(json.database).toBe("conectado");
      expect(typeof json.uptime).toBe("number");
      expect(json.timestamp).toBeDefined();
    });
  });
});
