import { describe, it, expect, beforeAll } from "vitest";
import {
  ejecutarCrearCategoria,
  ejecutarRenombrarCategoria,
  ejecutarCambiarTipoCategoria,
  ejecutarDesactivarCategoria,
  ejecutarReactivarCategoria,
  ejecutarReordenarCategoria,
  ejecutarObtenerCategoriasSelector,
} from "./categorias";
import { prisma } from "@/lib/db";
import { db } from "@/lib/contexto";
import { Contexto } from "@/lib/permisos";

describe("Gestión de Categorías", () => {
  let ctxAdmin: Contexto;
  let orgId: string;

  beforeAll(async () => {
    const org = await prisma.organizacion.findFirst();
    if (!org) throw new Error("No hay organización en la base de datos.");
    orgId = org.id;

    const user = await prisma.usuario.findFirst();
    ctxAdmin = {
      usuario: { id: user?.id || "u-admin", correo: user?.correo || "admin@example.com", nombre: "Admin", imagen: null },
      organizacionId: orgId,
      rol: "administrador",
      evento: null,
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

  it("obtenerCategoriasSelector oculta inscripciones y devoluciones", async () => {
    const selectorIngreso = await ejecutarObtenerCategoriasSelector(ctxAdmin, "ingreso");
    expect(selectorIngreso.some((c) => c.claveSistema === "inscripciones")).toBe(false);

    const selectorGasto = await ejecutarObtenerCategoriasSelector(ctxAdmin, "gasto");
    expect(selectorGasto.some((c) => c.claveSistema === "devoluciones")).toBe(false);
  });
});
