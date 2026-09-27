import { describe, it, expect, beforeAll } from "vitest";
import {
  ejecutarCrearContraparte,
  ejecutarEditarContraparte,
  ejecutarDesactivarContraparte,
  ejecutarReactivarContraparte,
  ejecutarFusionarContrapartes,
  ejecutarSuprimirDatosContraparte,
  ejecutarBuscarParecidosContrapartes,
} from "./contrapartes";
import { ocultarDatosContraparte } from "@/lib/utilidades";
import { prisma } from "@/lib/db";
import { db } from "@/lib/contexto";
import { Contexto } from "@/lib/permisos";

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

describe("Gestión de Contrapartes", () => {
  let ctxAdmin: Contexto;
  let ctxAyudante: Contexto;
  let ctxObservador: Contexto;
  let orgId: string;

  beforeAll(async () => {
    const org = await prisma.organizacion.findFirst();
    if (!org) throw new Error("No hay organización.");
    orgId = org.id;

    const user = await prisma.usuario.findFirst();
    const userId = user?.id || "u-admin";

    ctxAdmin = {
      usuario: { id: userId, correo: "admin@test.cl", nombre: "Admin", imagen: null },
      organizacionId: orgId,
      rol: "administrador",
      evento: null,
    };

    ctxAyudante = {
      usuario: { id: userId, correo: "ayudante@test.cl", nombre: "Ayudante", imagen: null },
      organizacionId: orgId,
      rol: "ayudante",
      evento: null,
    };

    ctxObservador = {
      usuario: { id: userId, correo: "obs@test.cl", nombre: "Observador", imagen: null },
      organizacionId: orgId,
      rol: "observador",
      evento: null,
    };
  });

  it("permite a ayudante y administrador crear contrapartes con RUT válido", async () => {
    const rutValido = generarRutValido();
    const res = await ejecutarCrearContraparte(ctxAyudante, {
      nombre: `Veterinaria Cordillera ${Date.now()}`,
      esProveedor: true,
      esAuspiciador: false,
      contacto: "+56 9 8888 7777",
      rut: rutValido,
    });

    expect(res.exito).toBe(true);
    expect(res.contraparte?.rut).toBe(rutValido);
  });

  it("rechaza crear contraparte con RUT inválido o duplicado activo", async () => {
    // 1. RUT inválido
    const rInvalido = await ejecutarCrearContraparte(ctxAdmin, {
      nombre: `Ferretería Invalida ${Date.now()}`,
      rut: "11.111.111-9", // DV erróneo
    });
    expect(rInvalido.exito).toBe(false);
    expect(rInvalido.error).toContain("dígito verificador");

    // 2. RUT duplicado
    const rutValido = generarRutValido();
    const r1 = await ejecutarCrearContraparte(ctxAdmin, {
      nombre: `Empresa Uno ${Date.now()}`,
      rut: rutValido,
    });
    expect(r1.exito).toBe(true);

    const rDuplicado = await ejecutarCrearContraparte(ctxAdmin, {
      nombre: `Empresa Dos ${Date.now()}`,
      rut: rutValido,
    });
    expect(rDuplicado.exito).toBe(false);
    expect(rDuplicado.error).toContain("ya está registrado");
  });

  it("detecta nombres parecidos para evitar duplicados en la cancha", async () => {
    const sufijo = Date.now();
    await ejecutarCrearContraparte(ctxAdmin, { nombre: `Distribuidora Maule ${sufijo}` });

    const parecidos = await ejecutarBuscarParecidosContrapartes(ctxAdmin, `distribuidora maule ${sufijo}`);
    expect(parecidos.length).toBeGreaterThan(0);
    expect(parecidos[0].nombre).toContain(`Distribuidora Maule ${sufijo}`);
  });

  it("fusiona duplicados en una transacción: completa campos y desactiva el duplicado", async () => {
    const rutValido = generarRutValido();
    const c1 = await ejecutarCrearContraparte(ctxAdmin, {
      nombre: `Agro Sur ${Date.now()}`,
      esAuspiciador: true,
      contacto: null, // vacío
      rut: rutValido,
    });
    expect(c1.exito).toBe(true);

    const c2 = await ejecutarCrearContraparte(ctxAdmin, {
      nombre: `AgroSur Ltda ${Date.now()}`,
      esProveedor: true,
      contacto: "contacto@agrosur.cl",
      rut: null,
    });
    expect(c2.exito).toBe(true);

    const resFusion = await ejecutarFusionarContrapartes(ctxAdmin, c1.contraparte!.id, c2.contraparte!.id);
    expect(resFusion.exito).toBe(true);

    const c1Actual = await db(ctxAdmin).contraparte.findUnique({ where: { id: c1.contraparte!.id } });
    const c2Actual = await db(ctxAdmin).contraparte.findUnique({ where: { id: c2.contraparte!.id } });

    // c1 (conservada) adquirió el contacto de c2 y combinó marcas
    expect(c1Actual!.contacto).toBe("contacto@agrosur.cl");
    expect(c1Actual!.esAuspiciador).toBe(true);
    expect(c1Actual!.esProveedor).toBe(true);

    // c2 (duplicada) quedó desactivada con referencia a c1
    expect(c2Actual!.activa).toBe(false);
    expect(c2Actual!.fusionadaEnId).toBe(c1.contraparte!.id);
  });

  it("suprime datos personales (contacto y RUT) conforme a la ley conservando nombre", async () => {
    const rutValido = generarRutValido();
    const creada = await ejecutarCrearContraparte(ctxAdmin, {
      nombre: `Persona Natural ${Date.now()}`,
      contacto: "+56 9 9999 0000",
      rut: rutValido,
    });
    expect(creada.exito).toBe(true);

    const resSup = await ejecutarSuprimirDatosContraparte(ctxAdmin, creada.contraparte!.id, creada.contraparte!.version);
    expect(resSup.exito).toBe(true);

    const cpActual = await db(ctxAdmin).contraparte.findUnique({ where: { id: creada.contraparte!.id } });
    expect(cpActual!.contacto).toBeNull();
    expect(cpActual!.rut).toBeNull();
    expect(cpActual!.nombre).toBe(creada.contraparte!.nombre);
  });

  it("ocultarDatosContraparte elimina contacto y RUT para el rol observador", () => {
    const cp = {
      nombre: "Proveedor Test",
      contacto: "test@correo.cl",
      rut: "11111111-1",
    };

    const oculto = ocultarDatosContraparte(ctxObservador, cp);
    expect(oculto.contacto).toBeNull();
    expect(oculto.rut).toBeNull();

    const visibleAdmin = ocultarDatosContraparte(ctxAdmin, cp);
    expect(visibleAdmin.contacto).toBe("test@correo.cl");
    expect(visibleAdmin.rut).toBe("11111111-1");
  });
});
