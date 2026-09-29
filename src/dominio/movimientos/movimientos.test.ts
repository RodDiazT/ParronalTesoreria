import { describe, it, expect, beforeAll } from "vitest";
import {
  ejecutarRegistrarMovimiento,
  ejecutarEditarMovimiento,
  ejecutarValidarMovimiento,
  ejecutarObservarMovimiento,
  ejecutarReenviarMovimiento,
  ejecutarClasificarMovimiento,
  ejecutarAnularMovimiento,
  ejecutarAgregarRespaldo,
  ejecutarAnularRespaldo,
  ejecutarMarcarRespaldoVisto,
  buscarPosiblesDuplicados,
  resumenPendientesDe,
  listarMovimientos,
} from "./acciones";
import { ejecutarMarcarPagado } from "./abonos";
import { prisma } from "@/lib/db";
import { Contexto } from "@/lib/permisos";
import { obtenerFechaHoyChile } from "./reglas";

describe("Dominio de Movimientos de Tesorería (Fase 4)", () => {
  let ctxAdmin1: Contexto;
  let ctxAdmin2: Contexto;
  let ctxAyudante: Contexto;
  let ctxObservador: Contexto;
  let orgId: string;
  let eventoId: string;
  let categoriaGastoId: string;
  let categoriaIngresoAuspicioId: string;
  let contraparteId: string;

  // Buffer de imagen JPEG válido para pruebas (FF D8 FF E0 ...)
  const jpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
  ]);

  beforeAll(async () => {
    const org = await prisma.organizacion.findFirst({
      include: {
        eventos: { where: { estado: "abierto" } },
        categorias: true,
        contrapartes: { where: { activa: true } },
      },
    });
    if (!org) throw new Error("No hay organización en la base de datos.");
    orgId = org.id;

    const evento = org.eventos[0];
    if (!evento) throw new Error("No hay evento abierto.");
    eventoId = evento.id;

    // Categorías de prueba
    let catGasto = org.categorias.find((c) => c.tipo === "gasto" && !c.claveSistema && c.activa);
    if (!catGasto) {
      catGasto = await prisma.categoria.create({
        data: {
          organizacionId: orgId,
          nombre: "Gasto Test Auto " + Date.now(),
          nombreNormalizado: ("gasto test auto " + Date.now()).toLowerCase(),
          tipo: "gasto",
          activa: true,
          orden: 99,
        },
      });
    }

    let catAuspicio = org.categorias.find(
      (c) => c.tipo === "ingreso" && !c.claveSistema && c.exigeContraparte && c.activa
    );
    if (!catAuspicio) {
      catAuspicio = await prisma.categoria.create({
        data: {
          organizacionId: orgId,
          nombre: "Auspicio Test Auto " + Date.now(),
          nombreNormalizado: ("auspicio test auto " + Date.now()).toLowerCase(),
          tipo: "ingreso",
          exigeContraparte: true,
          activa: true,
          orden: 100,
        },
      });
    }

    categoriaGastoId = catGasto.id;
    categoriaIngresoAuspicioId = catAuspicio.id;

    // Contraparte
    let cp = org.contrapartes[0];
    if (!cp) {
      cp = await prisma.contraparte.create({
        data: {
          organizacionId: orgId,
          nombre: "Proveedor Test Movimientos",
          nombreNormalizado: "proveedor test movimientos",
          esProveedor: true,
          creadoPorId: "u-temp",
        },
      });
    }
    contraparteId = cp.id;

    // Usuarios para pruebas
    const uAdmin1 = await prisma.usuario.upsert({
      where: { correo: "admin1.mov@test.cl" },
      update: {},
      create: { correo: "admin1.mov@test.cl", nombre: "Admin 1" },
    });
    const uAdmin2 = await prisma.usuario.upsert({
      where: { correo: "admin2.mov@test.cl" },
      update: {},
      create: { correo: "admin2.mov@test.cl", nombre: "Admin 2" },
    });
    const uAyudante = await prisma.usuario.upsert({
      where: { correo: "ayudante.mov@test.cl" },
      update: {},
      create: { correo: "ayudante.mov@test.cl", nombre: "Ayudante Mov" },
    });
    const uObservador = await prisma.usuario.upsert({
      where: { correo: "obs.mov@test.cl" },
      update: {},
      create: { correo: "obs.mov@test.cl", nombre: "Observador Mov" },
    });

    // Asegurar membresías activas para los usuarios de prueba
    for (const [u, r] of [
      [uAdmin1, "administrador"],
      [uAdmin2, "administrador"],
      [uAyudante, "ayudante"],
      [uObservador, "observador"],
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
      id: evento.id,
      nombre: evento.nombre,
      fechaInicio: evento.fechaInicio,
      fechaTermino: evento.fechaTermino,
      fechaReferenciaEdad: evento.fechaReferenciaEdad,
      lugar: evento.lugar,
      estado: evento.estado,
    };

    ctxAdmin1 = {
      usuario: { id: uAdmin1.id, correo: uAdmin1.correo, nombre: uAdmin1.nombre, imagen: null },
      organizacionId: orgId,
      rol: "administrador",
      evento: eventoCtx,
    };

    ctxAdmin2 = {
      usuario: { id: uAdmin2.id, correo: uAdmin2.correo, nombre: uAdmin2.nombre, imagen: null },
      organizacionId: orgId,
      rol: "administrador",
      evento: eventoCtx,
    };

    ctxAyudante = {
      usuario: { id: uAyudante.id, correo: uAyudante.correo, nombre: uAyudante.nombre, imagen: null },
      organizacionId: orgId,
      rol: "ayudante",
      evento: eventoCtx,
    };

    ctxObservador = {
      usuario: { id: uObservador.id, correo: uObservador.correo, nombre: uObservador.nombre, imagen: null },
      organizacionId: orgId,
      rol: "observador",
      evento: eventoCtx,
    };
  });

  describe("Validez del registro y reglas de negocio", () => {
    const hoy = obtenerFechaHoyChile();

    it("rechaza montos menores o iguales a 0", async () => {
      const res = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 0,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "efectivo",
          estadoPago: "pagado",
          categoriaId: categoriaGastoId,
          sinRespaldo: true,
          observacion: "Sin boleta almacén",
          claveCliente: `test-monto-0-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      expect(res.exito).toBe(false);
      expect(res.error).toContain("monto");
    });

    it("rechaza fecha de pago futura en movimientos pagados", async () => {
      const fechaFutura = "2029-01-01";
      const res = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 15000,
          fecha: hoy,
          fechaPago: fechaFutura,
          medioPago: "transferencia",
          estadoPago: "pagado",
          categoriaId: categoriaGastoId,
          sinRespaldo: true,
          observacion: "Justificación de prueba",
          claveCliente: `test-futura-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      expect(res.exito).toBe(false);
      expect(res.error).toContain("no puede ser futura");
    });

    it("rechaza un gasto con naturaleza en especie", async () => {
      const res = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "especie",
          montoClp: 50000,
          fecha: hoy,
          estadoPago: "pendiente",
          categoriaId: categoriaGastoId,
          sinRespaldo: true,
          observacion: "Gasto en especie no permitido",
          claveCliente: `test-gasto-esp-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      expect(res.exito).toBe(false);
      expect(res.error).toContain("gastos no pueden ser de naturaleza en especie");
    });

    it("rechaza sinRespaldo sin observación justificativa", async () => {
      const res = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 12000,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "efectivo",
          estadoPago: "pagado",
          categoriaId: categoriaGastoId,
          sinRespaldo: true,
          observacion: "", // Falta observación
          claveCliente: `test-sin-obs-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      expect(res.exito).toBe(false);
      expect(res.error).toContain("observación");
    });

    it("rechaza si no tiene archivos y tampoco se marca sinRespaldo", async () => {
      const res = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 12000,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "efectivo",
          estadoPago: "pagado",
          categoriaId: categoriaGastoId,
          sinRespaldo: false,
          claveCliente: `test-sin-arch-${Date.now()}`,
          sinIdentificar: false,
        },
        [] // Sin archivos
      );
      expect(res.exito).toBe(false);
      expect(res.error).toContain("respaldo");
    });

    it("rechaza movimiento pendiente si no incluye contraparte obligatoria", async () => {
      const res = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 45000,
          fecha: hoy,
          estadoPago: "pendiente",
          categoriaId: categoriaGastoId,
          contraparteId: null, // Falta contraparte
          sinRespaldo: true,
          observacion: "Falta proveedor",
          claveCliente: `test-sin-cp-pend-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      expect(res.exito).toBe(false);
      expect(res.error).toContain("contraparte es obligatoria");
    });

    it("rechaza categoría que exige contraparte si no se indica contraparte", async () => {
      const res = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "ingreso",
          naturaleza: "dinero",
          montoClp: 100000,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "transferencia",
          nombreOrigen: "Auspiciador SA",
          estadoPago: "pagado",
          categoriaId: categoriaIngresoAuspicioId, // Exige contraparte
          contraparteId: null,
          sinRespaldo: true,
          observacion: "Auspicio recibido",
          claveCliente: `test-auspicio-sin-cp-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      expect(res.exito).toBe(false);
      expect(res.error).toContain("contraparte es obligatoria");
    });

    it("rechaza archivo con formato no autorizado (ej. texto plano o SVG disfrazado)", async () => {
      const archivoFalso = {
        buffer: Buffer.from("<svg>malicious</svg>"),
        nombre: "comprobante.jpg",
      };

      const res = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 8000,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "efectivo",
          estadoPago: "pagado",
          categoriaId: categoriaGastoId,
          sinRespaldo: false,
          claveCliente: `test-magic-falso-${Date.now()}`,
          sinIdentificar: false,
        },
        [archivoFalso]
      );
      expect(res.exito).toBe(false);
      expect(res.error).toContain("Formato no permitido");
    });
  });

  describe("Idempotencia y detección de duplicados", () => {
    const hoy = obtenerFechaHoyChile();

    it("dos envíos con la misma claveCliente retornan el mismo movimiento sin duplicar", async () => {
      const clave = `idemp-${Date.now()}`;
      const payload = {
        tipo: "gasto" as const,
        naturaleza: "dinero" as const,
        montoClp: 22000,
        fecha: hoy,
        fechaPago: hoy,
        medioPago: "efectivo" as const,
        estadoPago: "pagado" as const,
        categoriaId: categoriaGastoId,
        sinRespaldo: true,
        observacion: "Compra de clavos",
        claveCliente: clave,
        sinIdentificar: false,
      };

      const primerEnvio = await ejecutarRegistrarMovimiento(ctxAdmin1, payload, []);
      expect(primerEnvio.exito).toBe(true);

      const segundoEnvio = await ejecutarRegistrarMovimiento(ctxAdmin1, payload, []);
      expect(segundoEnvio.exito).toBe(true);
      expect(segundoEnvio.reintento).toBe(true);
      expect(segundoEnvio.movimiento?.id).toBe(primerEnvio.movimiento?.id);
    });

    it("buscarPosiblesDuplicados encuentra movimientos cercanos en fecha y monto", async () => {
      const monto = 33333;
      await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: monto,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "efectivo",
          estadoPago: "pagado",
          categoriaId: categoriaGastoId,
          contraparteId,
          sinRespaldo: true,
          observacion: "Compra inicial",
          claveCliente: `dup-base-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );

      const duplicados = await buscarPosiblesDuplicados(ctxAdmin1, {
        tipo: "gasto",
        montoClp: monto,
        fecha: hoy,
        contraparteId,
      });

      expect(duplicados.length).toBeGreaterThan(0);
      expect(duplicados[0].montoClp).toBe(monto);
    });
  });

  describe("Flujo de validación, observación y probidad", () => {
    const hoy = obtenerFechaHoyChile();

    it("registro por Ayudante nace 'por_validar'; por Administrador nace 'validado'", async () => {
      const resAyudante = await ejecutarRegistrarMovimiento(
        ctxAyudante,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 18000,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "efectivo",
          estadoPago: "pagado",
          categoriaId: categoriaGastoId,
          sinRespaldo: true,
          observacion: "Bencina camión",
          claveCliente: `ayu-reg-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      expect(resAyudante.exito).toBe(true);
      expect(resAyudante.movimiento?.estadoValidacion).toBe("por_validar");

      const resAdmin = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 19000,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "efectivo",
          estadoPago: "pagado",
          categoriaId: categoriaGastoId,
          sinRespaldo: true,
          observacion: "Bencina generador",
          claveCliente: `adm-reg-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      expect(resAdmin.exito).toBe(true);
      expect(resAdmin.movimiento?.estadoValidacion).toBe("validado");
    });

    it("regla de probidad: nadie valida lo que envió él mismo (exigirNoPropio)", async () => {
      // Admin 1 registra un movimiento sin autovalidarse (por ejemplo sin identificar)
      const resCrear = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "ingreso",
          naturaleza: "dinero",
          montoClp: 25000,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "transferencia",
          nombreOrigen: "Desconocido",
          estadoPago: "pagado",
          sinIdentificar: true,
          sinRespaldo: true,
          observacion: "Transferencia sin datos",
          claveCliente: `sin-id-${Date.now()}`,
        },
        []
      );
      expect(resCrear.exito).toBe(true);
      const id = resCrear.movimiento!.id;

      // Primero clasificarlo
      const resClasificar = await ejecutarClasificarMovimiento(ctxAdmin1, id, categoriaIngresoAuspicioId, contraparteId);
      expect(resClasificar.exito).toBe(true);

      // Admin 1 intenta validarlo -> Debe ser rechazado por exigirNoPropio
      const resValidarPropio = await ejecutarValidarMovimiento(ctxAdmin1, id, resClasificar.movimiento!.version);
      expect(resValidarPropio.exito).toBe(false);
      expect(resValidarPropio.error).toContain("No puedes validar ni aprobar un registro que tú mismo enviaste");

      // Admin 2 sí puede validarlo
      const resValidarAdmin2 = await ejecutarValidarMovimiento(ctxAdmin2, id, resClasificar.movimiento!.version);
      expect(resValidarAdmin2.exito).toBe(true);
      expect(resValidarAdmin2.movimiento?.estadoValidacion).toBe("validado");
    });

    it("observar exige comentario y devuelve al ayudante; al editarlo pasa a por_validar", async () => {
      // 1. Ayudante registra
      const resReg = await ejecutarRegistrarMovimiento(
        ctxAyudante,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 14000,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "efectivo",
          estadoPago: "pagado",
          categoriaId: categoriaGastoId,
          sinRespaldo: true,
          observacion: "Cinta de embalaje",
          claveCliente: `ayu-obs-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      const movId = resReg.movimiento!.id;

      // 2. Admin 1 lo observa
      const resObs = await ejecutarObservarMovimiento(
        ctxAdmin1,
        movId,
        "La observación no explica por qué no hay boleta",
        resReg.movimiento!.version
      );
      expect(resObs.exito).toBe(true);
      expect(resObs.movimiento?.estadoValidacion).toBe("observado");

      // 3. Ayudante corrige la observación y guarda -> Pasa automáticamente a por_validar
      const resEdit = await ejecutarEditarMovimiento(
        ctxAyudante,
        movId,
        {
          montoClp: 14000,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "efectivo",
          estadoPago: "pagado",
          categoriaId: categoriaGastoId,
          observacion: "Se compró en ferretería de paso que no entregaba boleta electrónica",
        },
        resObs.movimiento!.version
      );
      expect(resEdit.exito).toBe(true);
      expect(resEdit.movimiento?.estadoValidacion).toBe("por_validar");
    });
  });

  describe("Cobranzas, Pagos y Abonos parciales", () => {
    const hoy = obtenerFechaHoyChile();

    it("ayudante marca pagado un gasto pendiente: vuelve a por_validar", async () => {
      // Crear gasto pendiente con contraparte
      const resReg = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 50000,
          fecha: hoy,
          estadoPago: "pendiente",
          categoriaId: categoriaGastoId,
          contraparteId,
          sinRespaldo: true,
          observacion: "Cuenta de flete por pagar",
          claveCliente: `flete-pend-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      const movId = resReg.movimiento!.id;

      // Ayudante registra que se pagó la totalidad
      const resPago = await ejecutarMarcarPagado(
        ctxAyudante,
        movId,
        {
          montoClp: 50000,
          fechaPago: hoy,
          medioPago: "transferencia",
        },
        resReg.movimiento!.version
      );

      expect(resPago.exito).toBe(true);
      expect(resPago.tipo).toBe("pago_total");
      expect(resPago.movimiento?.estadoPago).toBe("pagado");
      // Al ser marcado por ayudante, vuelve a por_validar
      expect(resPago.movimiento?.estadoValidacion).toBe("por_validar");
    });

    it("abono por administrador descuenta saldo de inmediato; por ayudante no descuenta hasta validarse", async () => {
      // 1. Crear gasto pendiente de $100.000
      const resReg = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 100000,
          fecha: hoy,
          estadoPago: "pendiente",
          categoriaId: categoriaGastoId,
          contraparteId,
          sinRespaldo: true,
          observacion: "Arriendo carpas $100.000",
          claveCliente: `carpas-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      const originalId = resReg.movimiento!.id;

      // 2. Administrador abona $30.000 -> Se descuenta de inmediato del original
      const resAbonoAdmin = await ejecutarMarcarPagado(
        ctxAdmin1,
        originalId,
        {
          montoClp: 30000,
          fechaPago: hoy,
          medioPago: "transferencia",
        },
        resReg.movimiento!.version
      );
      expect(resAbonoAdmin.exito).toBe(true);
      expect(resAbonoAdmin.tipo).toBe("abono");

      // Comprobar que el original ahora tiene saldo $70.000 y montoOriginalClp $100.000
      const originalActualizado = await prisma.movimiento.findUnique({
        where: { id: originalId },
      });
      expect(originalActualizado?.montoClp).toBe(70000);
      expect(originalActualizado?.montoOriginalClp).toBe(100000);

      // 3. Ayudante abona $20.000 al saldo restante de $70.000
      const resAbonoAyu = await ejecutarMarcarPagado(
        ctxAyudante,
        originalId,
        {
          montoClp: 20000,
          fechaPago: hoy,
          medioPago: "efectivo",
        },
        originalActualizado!.version
      );
      expect(resAbonoAyu.exito).toBe(true);
      const abonoAyuId = resAbonoAyu.movimiento!.id;
      expect(resAbonoAyu.movimiento?.estadoValidacion).toBe("por_validar");

      // El original todavía NO se descuenta (sigue en $70.000) porque el abono del ayudante está por validar
      const originalDurantePendiente = await prisma.movimiento.findUnique({
        where: { id: originalId },
      });
      expect(originalDurantePendiente?.montoClp).toBe(70000);

      // 4. Intentar otro abono mientras hay uno por validar debe ser rechazado
      const resIntentoDuplicado = await ejecutarMarcarPagado(
        ctxAdmin1,
        originalId,
        {
          montoClp: 10000,
          fechaPago: hoy,
          medioPago: "efectivo",
        },
        originalDurantePendiente!.version
      );
      expect(resIntentoDuplicado.exito).toBe(false);
      expect(resIntentoDuplicado.error).toContain("tiene un abono por validar");

      // 5. Admin 2 valida el abono del ayudante -> Recién ahí se descuenta
      const resValidarAbono = await ejecutarValidarMovimiento(
        ctxAdmin2,
        abonoAyuId,
        resAbonoAyu.movimiento!.version
      );
      expect(resValidarAbono.exito).toBe(true);

      const originalDespuesValidar = await prisma.movimiento.findUnique({
        where: { id: originalId },
      });
      expect(originalDespuesValidar?.montoClp).toBe(50000); // 70.000 - 20.000
    });

    it("anular un abono validado restituye el saldo al movimiento original", async () => {
      // 1. Crear gasto pendiente de $60.000
      const resReg = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 60000,
          fecha: hoy,
          estadoPago: "pendiente",
          categoriaId: categoriaGastoId,
          contraparteId,
          sinRespaldo: true,
          observacion: "Sonido iluminación",
          claveCliente: `sonido-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      const originalId = resReg.movimiento!.id;

      // 2. Administrador registra abono de $20.000 (saldo queda en $40.000)
      const resAbono = await ejecutarMarcarPagado(
        ctxAdmin1,
        originalId,
        {
          montoClp: 20000,
          fechaPago: hoy,
          medioPago: "transferencia",
        },
        resReg.movimiento!.version
      );
      const abonoId = resAbono.movimiento!.id;

      // 3. Anular el abono
      const resAnularAbono = await ejecutarAnularMovimiento(
        ctxAdmin1,
        abonoId,
        "Abono transferido a cuenta equivocada",
        resAbono.movimiento!.version
      );
      expect(resAnularAbono.exito).toBe(true);

      // 4. El saldo del original se restituye a $60.000
      const originalRestituido = await prisma.movimiento.findUnique({
        where: { id: originalId },
      });
      expect(originalRestituido?.montoClp).toBe(60000);
    });
  });

  describe("Respaldos y Privacidad Normada", () => {
    const hoy = obtenerFechaHoyChile();

    it("respaldo agregado por ayudante a un movimiento ya validado queda como 'esNuevo'", async () => {
      // 1. Movimiento validado
      const resMov = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 8500,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "efectivo",
          estadoPago: "pagado",
          categoriaId: categoriaGastoId,
          sinRespaldo: true,
          observacion: "Almuerzo personal",
          claveCliente: `resp-post-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );
      const movId = resMov.movimiento!.id;

      // 2. Ayudante agrega boleta encontrada después
      const resAgregar = await ejecutarAgregarRespaldo(ctxAyudante, movId, {
        buffer: jpegBuffer,
        nombre: "boleta-encontrada.jpg",
      });

      expect(resAgregar.exito).toBe(true);
      expect(resAgregar.respaldo?.esNuevo).toBe(true);

      // 3. Administrador marca como visto
      const resVisto = await ejecutarMarcarRespaldoVisto(ctxAdmin1, resAgregar.respaldo!.id);
      expect(resVisto.exito).toBe(true);

      const respBd = await prisma.respaldo.findUnique({
        where: { id: resAgregar.respaldo!.id },
      });
      expect(respBd?.esNuevo).toBe(false);
      expect(respBd?.vistoPorId).toBe(ctxAdmin1.usuario.id);
    });

    it("observador nunca recibe nombreOrigen ni observaciones (filtrado servidor)", async () => {
      // Crear movimiento con datos personales protegidos
      const resCrear = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "ingreso",
          naturaleza: "dinero",
          montoClp: 90000,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "transferencia",
          nombreOrigen: "Juan Pérez Protección",
          estadoPago: "pagado",
          categoriaId: categoriaIngresoAuspicioId,
          contraparteId,
          sinRespaldo: true,
          observacion: "Texto privado de observación",
          claveCliente: `obs-priv-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );

      const listadoObservador = await listarMovimientos(ctxObservador, {
        tipo: "ingreso",
      });

      const encontrado = listadoObservador.movimientos.find((m) => m.id === resCrear.movimiento?.id);
      expect(encontrado).toBeDefined();
      expect(encontrado?.nombreOrigen).toBeUndefined();
      expect(encontrado?.observacion).toBeUndefined();
    });

    it("resumenPendientesDe contabiliza correctamente movimientos por validar y reembolsos", async () => {
      // Ayudante registra un reembolso (gasto pagado por él de su bolsillo)
      await ejecutarRegistrarMovimiento(
        ctxAyudante,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 27000,
          fecha: hoy,
          estadoPago: "pendiente",
          pagadoPorId: ctxAyudante.usuario.id,
          categoriaId: categoriaGastoId,
          sinRespaldo: true,
          observacion: "Pintura comprada por mí",
          claveCliente: `reembolso-${Date.now()}`,
          sinIdentificar: false,
        },
        []
      );

      const resumen = await resumenPendientesDe(ctxAyudante, ctxAyudante.usuario.id);
      expect(resumen.reembolsosPendientes).toBeGreaterThan(0);
      expect(resumen.montoReembolsosPendientes).toBeGreaterThanOrEqual(27000);
    });
  });

  describe("Centralización de Ingresos Operativos y Filtro por Caballo", () => {
    it("permite registrar ingreso con caballoId y categoriaId y verifica reportes filtrados", async () => {
      const hoy = obtenerFechaHoyChile();
      const sufijo = Date.now();
      const club = await prisma.club.create({
        data: {
          organizacion: { connect: { id: orgId } },
          creadoPor: { connect: { id: ctxAdmin1.usuario.id } },
          nombre: `Club Mov Caballo ${sufijo}`,
          nombreNormalizado: `club mov caballo ${sufijo}`,
        },
      });
      const caballo = await prisma.caballo.create({
        data: {
          organizacion: { connect: { id: orgId } },
          club: { connect: { id: club.id } },
          creadoPor: { connect: { id: ctxAdmin1.usuario.id } },
          nombre: `Caballo Pesebrera ${sufijo}`,
          nombreNormalizado: `caballo pesebrera ${sufijo}`,
        },
      });

      const res = await ejecutarRegistrarMovimiento(
        ctxAdmin1,
        {
          tipo: "ingreso",
          naturaleza: "dinero",
          montoClp: 65000,
          fecha: hoy,
          fechaPago: hoy,
          medioPago: "transferencia",
          nombreOrigen: "Dueño de Caballo",
          estadoPago: "pagado",
          categoriaId: categoriaIngresoAuspicioId,
          contraparteId,
          caballoId: caballo.id,
          sinRespaldo: true,
          observacion: "Pesebrera concurso",
          claveCliente: `ingreso-caballo-${sufijo}`,
          sinIdentificar: false,
        },
        []
      );

      expect(res.exito).toBe(true);
      expect(res.movimiento?.caballoId).toBe(caballo.id);

      // Verificar que los reportes de ingresos filtran adecuadamente por caballo
      const listado = await listarMovimientos(ctxAdmin1, {
        tipo: "ingreso",
        caballoId: caballo.id,
      });

      expect(listado.movimientos.length).toBeGreaterThan(0);
      expect(listado.movimientos.every((m) => m.caballoId === caballo.id)).toBe(true);
      expect(listado.movimientos.some((m) => m.id === res.movimiento?.id)).toBe(true);

      // Limpieza
      await prisma.movimiento.deleteMany({ where: { caballoId: caballo.id } });
      await prisma.caballo.delete({ where: { id: caballo.id } });
      await prisma.club.delete({ where: { id: club.id } });
    });
  });
});
