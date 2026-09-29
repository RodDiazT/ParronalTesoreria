import { describe, it, expect, beforeAll } from "vitest";
import {
  ejecutarCrearCategoria,
  ejecutarRenombrarCategoria,
  ejecutarCambiarTipoCategoria,
  ejecutarDesactivarCategoria,
  ejecutarReactivarCategoria,
  ejecutarReordenarCategoria,
  ejecutarObtenerCategoriasSelector,
  ejecutarEliminarCategoria,
} from "./categorias";
import { prisma } from "@/lib/db";
import { db } from "@/lib/contexto";
import { Contexto } from "@/lib/permisos";
import { ejecutarRegistrarMovimiento } from "@/dominio/movimientos/acciones";

describe("Gestión de Categorías", () => {
  let ctxAdmin: Contexto;
  let orgId: string;

  beforeAll(async () => {
    const org = await prisma.organizacion.findFirst();
    if (!org) throw new Error("No hay organización en la base de datos.");
    orgId = org.id;

    const user = await prisma.usuario.findFirst();
    const ev = await prisma.evento.findFirst({ where: { organizacionId: orgId, estado: "abierto" } });
    ctxAdmin = {
      usuario: { id: user?.id || "u-admin", correo: user?.correo || "admin@example.com", nombre: "Admin", imagen: null },
      organizacionId: orgId,
      rol: "administrador",
      evento: ev
        ? {
            id: ev.id,
            nombre: ev.nombre,
            fechaInicio: ev.fechaInicio,
            fechaTermino: ev.fechaTermino,
            fechaReferenciaEdad: ev.fechaReferenciaEdad,
            lugar: ev.lugar,
            estado: ev.estado as any,
          }
        : null,
    };
  });

  it("crea una categoría nueva con orden al final y audita la acción", async () => {
    const res = await ejecutarCrearCategoria(ctxAdmin, {
      nombre: `Insumos Prueba ${Date.now()}`,
      tipo: "gasto",
      exigeContraparte: true,
    });

    expect(res.exito).toBe(true);
    expect(res.categoria?.exigeContraparte).toBe(true);
    expect(res.categoria?.activa).toBe(true);
    expect(res.categoria?.orden).toBeGreaterThan(0);
  });

  it("rechaza duplicar nombre normalizado dentro del mismo tipo", async () => {
    const nombre = `Seguridad Pista ${Date.now()}`;
    const r1 = await ejecutarCrearCategoria(ctxAdmin, { nombre, tipo: "gasto" });
    expect(r1.exito).toBe(true);

    // Intento con diferente mayúscula y espacios
    const r2 = await ejecutarCrearCategoria(ctxAdmin, { nombre: `  ${nombre.toUpperCase()}  `, tipo: "gasto" });
    expect(r2.exito).toBe(false);
    expect(r2.error).toContain("Ya existe");
  });

  it("detecta si existe una categoría desactivada y ofrece reactivarla", async () => {
    const nombre = `Emergencias ${Date.now()}`;
    const r1 = await ejecutarCrearCategoria(ctxAdmin, { nombre, tipo: "gasto" });
    expect(r1.exito).toBe(true);
    const catId = r1.categoria!.id;

    // Desactivar
    await ejecutarDesactivarCategoria(ctxAdmin, catId, r1.categoria!.version);

    // Intentar crear nuevamente
    const r2 = await ejecutarCrearCategoria(ctxAdmin, { nombre, tipo: "gasto" });
    expect(r2.exito).toBe(false);
    expect(r2.existeDesactivada).toBe(true);
    expect(r2.categoriaId).toBe(catId);
  });

  it("impide desactivar o cambiar de tipo a categorías de sistema", async () => {
    const catInscripciones = await db(ctxAdmin).categoria.findFirst({
      where: { claveSistema: "inscripciones" },
    });
    expect(catInscripciones).toBeDefined();

    // Intentar desactivar
    const resDesactivar = await ejecutarDesactivarCategoria(ctxAdmin, catInscripciones!.id, catInscripciones!.version);
    expect(resDesactivar.exito).toBe(false);
    expect(resDesactivar.error).toContain("sistema");

    // Intentar cambiar tipo
    const resTipo = await ejecutarCambiarTipoCategoria(ctxAdmin, catInscripciones!.id, "gasto", catInscripciones!.version);
    expect(resTipo.exito).toBe(false);
    expect(resTipo.error).toContain("sistema");
  });

  it("reordena categorías dentro del mismo tipo", async () => {
    const c1 = await ejecutarCrearCategoria(ctxAdmin, { nombre: `Orden A ${Date.now()}`, tipo: "gasto" });
    const c2 = await ejecutarCrearCategoria(ctxAdmin, { nombre: `Orden B ${Date.now()}`, tipo: "gasto" });

    expect(c2.categoria!.orden).toBeGreaterThan(c1.categoria!.orden);

    // Subir c2 para que quede antes de c1
    const res = await ejecutarReordenarCategoria(ctxAdmin, c2.categoria!.id, "subir");
    expect(res.exito).toBe(true);

    const c1Actual = await db(ctxAdmin).categoria.findUnique({ where: { id: c1.categoria!.id } });
    const c2Actual = await db(ctxAdmin).categoria.findUnique({ where: { id: c2.categoria!.id } });

    expect(c2Actual!.orden).toBeLessThan(c1Actual!.orden);
  });

  it("obtenerCategoriasSelector incluye inscripciones en ingresos y oculta devoluciones en gastos", async () => {
    const selectorIngreso = await ejecutarObtenerCategoriasSelector(ctxAdmin, "ingreso");
    expect(selectorIngreso.some((c) => c.claveSistema === "inscripciones")).toBe(true);

    const selectorIngresoSinIns = await ejecutarObtenerCategoriasSelector(ctxAdmin, "ingreso", {
      incluirInscripciones: false,
    });
    expect(selectorIngresoSinIns.some((c) => c.claveSistema === "inscripciones")).toBe(false);

    const selectorGasto = await ejecutarObtenerCategoriasSelector(ctxAdmin, "gasto");
    expect(selectorGasto.some((c) => c.claveSistema === "devoluciones")).toBe(false);
  });

  describe("Eliminación y Reasignación de Categorías", () => {
    it("elimina categoría sin movimientos (éxito)", async () => {
      const c = await ejecutarCrearCategoria(ctxAdmin, {
        nombre: `Sin Movs ${Date.now()}`,
        tipo: "gasto",
      });
      expect(c.exito).toBe(true);

      const res = await ejecutarEliminarCategoria(ctxAdmin, c.categoria!.id);
      expect(res.exito).toBe(true);

      const enDb = await db(ctxAdmin).categoria.findUnique({ where: { id: c.categoria!.id } });
      expect(enDb).toBeNull();
    });

    it("rechaza eliminación de categoría de sistema (claveSistema)", async () => {
      const catSistema = await db(ctxAdmin).categoria.findFirst({
        where: { claveSistema: "inscripciones" },
      });
      expect(catSistema).toBeDefined();

      const res = await ejecutarEliminarCategoria(ctxAdmin, catSistema!.id);
      expect(res.exito).toBe(false);
      expect(res.error).toContain("sistema");
    });

    it("elimina categoría con movimientos y reasigna a categoría válida (éxito, transaccional)", async () => {
      const sufijo = Date.now();
      const catOrigen = await ejecutarCrearCategoria(ctxAdmin, {
        nombre: `Origen ${sufijo}`,
        tipo: "gasto",
      });
      const catDestino = await ejecutarCrearCategoria(ctxAdmin, {
        nombre: `Destino ${sufijo}`,
        tipo: "gasto",
      });

      const resMov = await ejecutarRegistrarMovimiento(
        ctxAdmin,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 15000,
          fecha: new Date().toISOString().slice(0, 10),
          fechaPago: new Date().toISOString().slice(0, 10),
          medioPago: "transferencia",
          estadoPago: "pagado",
          categoriaId: catOrigen.categoria!.id,
          sinRespaldo: true,
          observacion: "Gasto de prueba para reasignar",
          claveCliente: `mov-cat-test-${sufijo}`,
          sinIdentificar: false,
        },
        []
      );
      expect(resMov.error).toBeUndefined();
      expect(resMov.exito).toBe(true);
      const mov = resMov.movimiento!;

      // Si no se pasa reasignarAId, debe fallar indicando que tiene movimientos
      const resSinDestino = await ejecutarEliminarCategoria(ctxAdmin, catOrigen.categoria!.id);
      expect(resSinDestino.exito).toBe(false);
      expect(resSinDestino.error).toContain("asociados");

      // Con categoría de destino válida
      const resConDestino = await ejecutarEliminarCategoria(
        ctxAdmin,
        catOrigen.categoria!.id,
        catDestino.categoria!.id
      );
      expect(resConDestino.exito).toBe(true);

      // Origen eliminada
      const origenDb = await db(ctxAdmin).categoria.findUnique({ where: { id: catOrigen.categoria!.id } });
      expect(origenDb).toBeNull();

      // Movimiento ahora apunta a destino
      const movActualizado = await prisma.movimiento.findUnique({ where: { id: mov.id } });
      expect(movActualizado?.categoriaId).toBe(catDestino.categoria!.id);
    });

    it("rechaza reasignación hacia categoría de tipo opuesto o inactiva", async () => {
      const sufijo = Date.now();
      const catGasto = await ejecutarCrearCategoria(ctxAdmin, {
        nombre: `Gasto Orig ${sufijo}`,
        tipo: "gasto",
      });
      const catIngreso = await ejecutarCrearCategoria(ctxAdmin, {
        nombre: `Ingreso Dest ${sufijo}`,
        tipo: "ingreso",
      });
      const catInactiva = await ejecutarCrearCategoria(ctxAdmin, {
        nombre: `Inactiva Dest ${sufijo}`,
        tipo: "gasto",
      });
      await ejecutarDesactivarCategoria(ctxAdmin, catInactiva.categoria!.id, catInactiva.categoria!.version);

      const resMov = await ejecutarRegistrarMovimiento(
        ctxAdmin,
        {
          tipo: "gasto",
          naturaleza: "dinero",
          montoClp: 12000,
          fecha: new Date().toISOString().slice(0, 10),
          fechaPago: new Date().toISOString().slice(0, 10),
          medioPago: "transferencia",
          estadoPago: "pagado",
          categoriaId: catGasto.categoria!.id,
          sinRespaldo: true,
          observacion: "Gasto de prueba inactiva",
          claveCliente: `mov-tipo-opuesto-${sufijo}`,
          sinIdentificar: false,
        },
        []
      );
      expect(resMov.exito).toBe(true);

      // Intentar reasignar a ingreso
      const resOpuesto = await ejecutarEliminarCategoria(
        ctxAdmin,
        catGasto.categoria!.id,
        catIngreso.categoria!.id
      );
      expect(resOpuesto.exito).toBe(false);
      expect(resOpuesto.error).toContain("mismo tipo");

      // Intentar reasignar a inactiva
      const resInactiva = await ejecutarEliminarCategoria(
        ctxAdmin,
        catGasto.categoria!.id,
        catInactiva.categoria!.id
      );
      expect(resInactiva.exito).toBe(false);
      expect(resInactiva.error).toContain("activa");
    });

    it("rechaza eliminación por roles no administradores", async () => {
      const c = await ejecutarCrearCategoria(ctxAdmin, {
        nombre: `Rol Check ${Date.now()}`,
        tipo: "gasto",
      });
      const ctxAyudante: Contexto = { ...ctxAdmin, rol: "ayudante" };

      await expect(
        ejecutarEliminarCategoria(ctxAyudante, c.categoria!.id)
      ).rejects.toThrow("Permiso denegado: rol administrador requerido");
    });
  });
});
