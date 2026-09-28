import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { Contexto, ErrorPermiso } from "@/lib/permisos";
import {
  edadEnEvento,
  alertasJinete,
  buscarParecidos,
} from "./reglas";
import {
  ejecutarCrearClub,
  ejecutarEditarClub,
  ejecutarDesactivarClub,
  ejecutarReactivarClub,
  ejecutarFusionarClubes,
  ejecutarSuprimirDatosClub,
  ejecutarCrearJinete,
  ejecutarEditarJinete,
  ejecutarVincularApoderado,
  ejecutarDesvincularApoderado,
  ejecutarRegistrarAutorizacion,
  ejecutarFusionarJinetes,
  ejecutarSuprimirDatosJinete,
  ejecutarCrearApoderado,
  ejecutarFusionarApoderados,
  ejecutarSuprimirDatosApoderado,
  ejecutarCrearCaballo,
  ejecutarFusionarCaballos,
  ejecutarDescargarDatosParticipante,
  ejecutarJinetesAfectadosPorCambioDeFecha,
} from "./acciones";
import {
  ejecutarListarParticipantes,
  ejecutarObtenerFichaJinete,
  ejecutarObtenerFichaClub,
  ejecutarObtenerFichaApoderado,
} from "./consultas";

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

describe("Fase 5: Participantes (Jinetes, Caballos, Apoderados y Clubes)", () => {
  let ctxAdmin: Contexto;
  let ctxAyudante: Contexto;
  let ctxObservador: Contexto;
  let orgId: string;
  let eventoId: string;

  beforeAll(async () => {
    const org = await prisma.organizacion.findFirst();
    if (!org) throw new Error("No hay organización en la base de datos.");
    orgId = org.id;

    const user = await prisma.usuario.findFirst();
    const userId = user?.id || "u-test-fase5";

    let ev = await prisma.evento.findFirst({ where: { organizacionId: orgId } });
    if (!ev) {
      ev = await prisma.evento.create({
        data: {
          organizacionId: orgId,
          nombre: "Concurso Primavera 2026",
          fechaInicio: new Date("2026-11-20T00:00:00Z"),
          fechaTermino: new Date("2026-11-22T00:00:00Z"),
          fechaReferenciaEdad: new Date("2026-11-21T00:00:00Z"),
          estado: "abierto",
        },
      });
    }
    eventoId = ev.id;

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
      usuario: { id: userId, correo: "admin@test.cl", nombre: "Admin", imagen: null },
      organizacionId: orgId,
      rol: "administrador",
      evento: contextoEvento,
    };

    ctxAyudante = {
      usuario: { id: userId, correo: "ayudante@test.cl", nombre: "Ayudante", imagen: null },
      organizacionId: orgId,
      rol: "ayudante",
      evento: contextoEvento,
    };

    ctxObservador = {
      usuario: { id: userId, correo: "obs@test.cl", nombre: "Observador", imagen: null },
      organizacionId: orgId,
      rol: "observador",
      evento: contextoEvento,
    };
  });

  // -------------------------------------------------------------
  // Suite 1: Reglas de edad (edadEnEvento)
  // -------------------------------------------------------------
  describe("Reglas de edad (edadEnEvento)", () => {
    const eventoRef = {
      fechaInicio: new Date("2026-11-20T00:00:00Z"),
      fechaReferenciaEdad: new Date("2026-11-21T00:00:00Z"),
    };

    it("calcula edad exacta en el día del cumpleaños", () => {
      // Nacido 2010-11-21, a 2026-11-21 cumple exactamente 16 años
      const edad = edadEnEvento(new Date("2010-11-21T00:00:00Z"), eventoRef);
      expect(edad).toBe(16);
    });

    it("calcula edad un día antes del cumpleaños (no ha cumplido años)", () => {
      // Nacido 2010-11-22, a 2026-11-21 tiene 15 años
      const edad = edadEnEvento(new Date("2010-11-22T00:00:00Z"), eventoRef);
      expect(edad).toBe(15);
    });

    it("calcula edad un día después del cumpleaños", () => {
      // Nacido 2010-11-20, a 2026-11-21 ya cumplió 16 años
      const edad = edadEnEvento(new Date("2010-11-20T00:00:00Z"), eventoRef);
      expect(edad).toBe(16);
    });

    it("maneja correctamente años bisiestos (nacido 29 de febrero)", () => {
      // Nacido 2008-02-29
      // Ref: 2026-02-28 -> 17 años
      const edadAntes = edadEnEvento("2008-02-29", { fechaInicio: "2026-02-28" });
      expect(edadAntes).toBe(17);

      // Ref: 2026-03-01 -> 18 años cumplidos
      const edadDespues = edadEnEvento("2008-02-29", { fechaInicio: "2026-03-01" });
      expect(edadDespues).toBe(18);

      // Ref: año bisiesto 2012-02-29 -> 4 años cumplidos
      const edadBisiesto = edadEnEvento("2008-02-29", { fechaInicio: "2012-02-29" });
      expect(edadBisiesto).toBe(4);
    });

    it("retorna null si la fecha de nacimiento no está informada", () => {
      expect(edadEnEvento(null, eventoRef)).toBeNull();
      expect(edadEnEvento(undefined, eventoRef)).toBeNull();
    });

    it("usa fecha de inicio cuando fechaReferenciaEdad es null", () => {
      const eventoSinRef = {
        fechaInicio: new Date("2026-10-15T00:00:00Z"),
        fechaReferenciaEdad: null,
      };
      // Nacido 2008-10-15 -> 18 años al 2026-10-15
      const edad = edadEnEvento("2008-10-15", eventoSinRef);
      expect(edad).toBe(18);
    });
  });

  // -------------------------------------------------------------
  // Suite 2: Alertas de Jinete (alertasJinete)
  // -------------------------------------------------------------
  describe("Alertas de Jinete (alertasJinete)", () => {
    const ev = { fechaInicio: "2026-11-20" };

    it("jinete sin fecha de nacimiento retorna alerta 'sin_fecha_nacimiento' y ninguna de menor", () => {
      const alertas = alertasJinete({ fechaNacimiento: null }, [], [], ev);
      expect(alertas.some((a) => a.tipo === "sin_fecha_nacimiento")).toBe(true);
      expect(alertas.some((a) => a.tipo === "menor_sin_apoderado")).toBe(false);
      expect(alertas.some((a) => a.tipo === "falta_autorizacion")).toBe(false);
    });

    it("menor de 18 sin apoderados genera 'menor_sin_apoderado'", () => {
      // Nacido 2011-01-01 (15 años)
      const alertas = alertasJinete(
        { fechaNacimiento: "2011-01-01", autorizacionApoderadoFecha: null },
        [],
        [],
        ev
      );
      expect(alertas.some((a) => a.tipo === "menor_sin_apoderado")).toBe(true);
      // No debe pedir autorización porque tiene 15 (>14)
      expect(alertas.some((a) => a.tipo === "falta_autorizacion")).toBe(false);
    });

    it("menor de 14 sin autorización genera 'falta_autorizacion' y 'menor_sin_apoderado' si no tiene apoderado", () => {
      // Nacido 2014-01-01 (12 años)
      const alertas = alertasJinete(
        { fechaNacimiento: "2014-01-01", autorizacionApoderadoFecha: null },
        [],
        [],
        ev
      );
      expect(alertas.some((a) => a.tipo === "menor_sin_apoderado")).toBe(true);
      expect(alertas.some((a) => a.tipo === "falta_autorizacion")).toBe(true);
    });

    it("menor de 14 con apoderado y con autorización no genera alertas", () => {
      const apId = "ap-1";
      const alertas = alertasJinete(
        { fechaNacimiento: "2014-01-01", autorizacionApoderadoFecha: "2026-10-01" },
        [{ apoderadoId: apId, activo: true }],
        [{ id: apId, telefono: "+56 9 8888 7777" }],
        ev
      );
      expect(alertas.length).toBe(0);
    });

    it("vínculo de apoderado inactivo no cuenta como apoderado", () => {
      const apId = "ap-2";
      const alertas = alertasJinete(
        { fechaNacimiento: "2012-01-01", autorizacionApoderadoFecha: "2026-10-01" },
        [{ apoderadoId: apId, activo: false }],
        [{ id: apId, telefono: "+56 9 8888 7777" }],
        ev
      );
      expect(alertas.some((a) => a.tipo === "menor_sin_apoderado")).toBe(true);
    });

    it("apoderado sin teléfono genera alerta 'apoderado_sin_telefono'", () => {
      const apId = "ap-3";
      const alertas = alertasJinete(
        { fechaNacimiento: "2010-01-01", autorizacionApoderadoFecha: null },
        [{ apoderadoId: apId, activo: true }],
        [{ id: apId, telefono: null }],
        ev
      );
      expect(alertas.some((a) => a.tipo === "apoderado_sin_telefono")).toBe(true);
    });

    it("adulto (>= 18 años) no genera alertas de menor", () => {
      // Nacido 1995-01-01 (31 años)
      const alertas = alertasJinete({ fechaNacimiento: "1995-01-01" }, [], [], ev);
      expect(alertas.length).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // Suite 3: Detección de Parecidos (buscarParecidos)
  // -------------------------------------------------------------
  describe("Detección de Parecidos (buscarParecidos)", () => {
    it("detecta parecidos de club por similitud ortográfica", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const nombreBase = `Club San Cristóbal ${sufijo}`;
      await ejecutarCrearClub(ctxAdmin, { nombre: nombreBase, confirmarAunqueParecido: true });

      // Búsqueda con pequeña variación
      const parecidos = await buscarParecidos(ctxAdmin, "club", {
        nombre: `Club San Cristoval ${sufijo}`,
      });
      expect(parecidos.length).toBeGreaterThan(0);
      expect(parecidos.some((p) => p.nombre === nombreBase)).toBe(true);
    });

    it("detecta parecidos de apoderado por nombre o teléfono normalizado", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const tel = `+56 9 7777 ${sufijo}`;
      const ap = await ejecutarCrearApoderado(ctxAdmin, {
        nombre: `Fernando Valenzuela ${sufijo}`,
        telefono: tel,
        confirmarAunqueParecido: true,
      });
      expect(ap.exito).toBe(true);

      // Búsqueda por mismo teléfono con diferente formato
      const parecidosTel = await buscarParecidos(ctxAdmin, "apoderado", {
        telefono: `97777${sufijo}`,
      });
      expect(parecidosTel.some((p) => p.id === ap.apoderado?.id)).toBe(true);
    });

    it("detecta parecidos de caballo en cualquier club", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const cRes = await ejecutarCrearClub(ctxAdmin, {
        nombre: `Club Cab Test ${sufijo}`,
        confirmarAunqueParecido: true,
      });
      const clubId = cRes.club?.id!;

      await ejecutarCrearCaballo(ctxAdmin, {
        nombre: `Relámpago Dorado ${sufijo}`,
        clubId,
        confirmarAunqueParecido: true,
      });

      const parecidos = await buscarParecidos(ctxAdmin, "caballo", {
        nombre: `Relampago Dorado ${sufijo}`,
      });
      expect(parecidos.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------
  // Suite 4: Operaciones de Dominio y Creación Atómica
  // -------------------------------------------------------------
  describe("Operaciones de Dominio y Creación Atómica", () => {
    it("crea club con RUT y bloquea RUT repetido en otro club activo", async () => {
      const rut = generarRutValido();
      const sufijo = Date.now().toString().slice(-4);

      const r1 = await ejecutarCrearClub(ctxAyudante, {
        nombre: `Club Alfa ${sufijo}`,
        rut,
        confirmarAunqueParecido: true,
      });
      expect(r1.exito).toBe(true);

      const r2 = await ejecutarCrearClub(ctxAyudante, {
        nombre: `Club Beta ${sufijo}`,
        rut,
        confirmarAunqueParecido: true,
      });
      expect(r2.exito).toBe(false);
      expect(r2.error).toContain("El RUT ya está registrado");
    });

    it("rechaza fecha de nacimiento futura en jinete", async () => {
      const cRes = await ejecutarCrearClub(ctxAdmin, {
        nombre: `Club Futuro ${Date.now().toString().slice(-4)}`,
        confirmarAunqueParecido: true,
      });
      const clubId = cRes.club!.id;

      const res = await ejecutarCrearJinete(ctxAdmin, {
        nombre: "Jinete Viajero del Tiempo",
        clubId,
        fechaNacimiento: "2099-01-01",
        confirmarAunqueParecido: true,
      });
      expect(res.exito).toBe(false);
      expect(res.error).toContain("futura");
    });

    it("crea jinete con apoderado nuevo y autorización de forma atómica", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const cRes = await ejecutarCrearClub(ctxAdmin, {
        nombre: `Club Atómico ${sufijo}`,
        confirmarAunqueParecido: true,
      });
      const clubId = cRes.club!.id;

      const res = await ejecutarCrearJinete(ctxAyudante, {
        nombre: `Jinete Menor ${sufijo}`,
        clubId,
        fechaNacimiento: "2014-05-10", // 12 años
        autorizacionFecha: "2026-10-01",
        confirmarAunqueParecido: true,
        apoderados: [
          {
            nuevoApoderado: {
              nombre: `Mamá de Jinete ${sufijo}`,
              telefono: "+56 9 9911 2233",
            },
            relacion: "madre",
          },
        ],
      });

      expect(res.exito).toBe(true);
      expect(res.jinete).toBeDefined();

      const ficha = await ejecutarObtenerFichaJinete(ctxAdmin, res.jinete!.id);
      expect(ficha?.apoderados.length).toBe(1);
      expect(ficha?.apoderados[0].nombre).toContain("Mamá de Jinete");
      expect(ficha?.autorizacionApoderadoFecha).toBeDefined();
    });

    it("ayudante puede vincular apoderado y registrar autorización", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const cRes = await ejecutarCrearClub(ctxAdmin, { nombre: `Club Ayudante ${sufijo}` });
      const jineteRes = await ejecutarCrearJinete(ctxAyudante, {
        nombre: `Jinete Sin Aut ${sufijo}`,
        clubId: cRes.club!.id,
        fechaNacimiento: "2013-03-01",
      });

      // Vincular apoderado
      const vinculoRes = await ejecutarVincularApoderado(ctxAyudante, jineteRes.jinete!.id, {
        nuevoApoderado: {
          nombre: `Papá Ayudante ${sufijo}`,
          telefono: "+56 9 7766 5544",
        },
        relacion: "padre",
      });
      expect(vinculoRes.exito).toBe(true);

      // Registrar autorización
      const autRes = await ejecutarRegistrarAutorizacion(
        ctxAyudante,
        jineteRes.jinete!.id,
        "2026-10-04"
      );
      expect(autRes.exito).toBe(true);

      // Intentar sobreescribir la autorización falla
      const autDoble = await ejecutarRegistrarAutorizacion(
        ctxAyudante,
        jineteRes.jinete!.id,
        "2026-10-05"
      );
      expect(autDoble.exito).toBe(false);
      expect(autDoble.error).toContain("ya tiene una fecha");
    });

    it("control de concurrencia optimista por version en editarClub", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const cRes = await ejecutarCrearClub(ctxAdmin, { nombre: `Club Version ${sufijo}` });
      const clubId = cRes.club!.id;

      // Edición 1 exitosa (pasa de versión 1 a 2)
      const edit1 = await ejecutarEditarClub(ctxAdmin, clubId, 1, {
        nombre: `Club Version Modificado ${sufijo}`,
      });
      expect(edit1.exito).toBe(true);
      expect(edit1.club?.version).toBe(2);

      // Edición con versión obsoleta (1) es rechazada
      const editObsoleta = await ejecutarEditarClub(ctxAdmin, clubId, 1, {
        nombre: `Intento Obsoleto ${sufijo}`,
      });
      expect(editObsoleta.exito).toBe(false);
      expect(editObsoleta.error).toContain("modificado por otro usuario");
    });
  });

  // -------------------------------------------------------------
  // Suite 5: Fusiones Transaccionales y Reasignación
  // -------------------------------------------------------------
  describe("Fusiones Transaccionales y Reasignación", () => {
    it("fusiona dos clubes reasignando jinetes y caballos al conservado", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const c1 = await ejecutarCrearClub(ctxAdmin, {
        nombre: `Club Conservado ${sufijo}`,
        confirmarAunqueParecido: true,
      });
      const c2 = await ejecutarCrearClub(ctxAdmin, {
        nombre: `Club Duplicado ${sufijo}`,
        contacto: "contacto@duplicado.cl",
        confirmarAunqueParecido: true,
      });

      const conservadoId = c1.club!.id;
      const duplicadoId = c2.club!.id;

      // Crear jinete en duplicado
      await ejecutarCrearJinete(ctxAdmin, {
        nombre: `Jinete de Duplicado ${sufijo}`,
        clubId: duplicadoId,
        confirmarAunqueParecido: true,
      });

      // Crear caballo en duplicado
      await ejecutarCrearCaballo(ctxAdmin, {
        nombre: `Caballo de Duplicado ${sufijo}`,
        clubId: duplicadoId,
        confirmarAunqueParecido: true,
      });

      // Fusionar
      const resFusion = await ejecutarFusionarClubes(ctxAdmin, conservadoId, duplicadoId);
      expect(resFusion.exito).toBe(true);
      expect(resFusion.detalle?.jinetes).toBe(1);
      expect(resFusion.detalle?.caballos).toBe(1);

      // Verificar que el conservado absorbió el contacto
      const fichaConservado = await ejecutarObtenerFichaClub(ctxAdmin, conservadoId);
      expect(fichaConservado?.contacto).toBe("contacto@duplicado.cl");
      expect(fichaConservado?.jinetes.length).toBe(1);
      expect(fichaConservado?.caballos.length).toBe(1);

      // Duplicado debe quedar inactivo
      const fichaDuplicado = await ejecutarObtenerFichaClub(ctxAdmin, duplicadoId);
      expect(fichaDuplicado?.activo).toBe(false);
    });

    it("fusiona dos jinetes reasignando apoderados sin duplicar", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const cRes = await ejecutarCrearClub(ctxAdmin, {
        nombre: `Club Fusion Jinete ${sufijo}`,
        confirmarAunqueParecido: true,
      });
      const clubId = cRes.club!.id;

      const apRes = await ejecutarCrearApoderado(ctxAdmin, {
        nombre: `Apoderado Común ${sufijo}`,
        telefono: "+56 9 8811 2233",
        confirmarAunqueParecido: true,
      });
      const apId = apRes.apoderado!.id;

      const j1 = await ejecutarCrearJinete(ctxAdmin, {
        nombre: `Jinete Conservado ${sufijo}`,
        clubId,
        fechaNacimiento: "2010-01-01",
        confirmarAunqueParecido: true,
      });
      const j2 = await ejecutarCrearJinete(ctxAdmin, {
        nombre: `Jinete Duplicado ${sufijo}`,
        clubId,
        contacto: "contacto@duplicado.cl",
        confirmarAunqueParecido: true,
      });

      // Vincular apId a j2
      await ejecutarVincularApoderado(ctxAdmin, j2.jinete!.id, {
        apoderadoId: apId,
        relacion: "madre",
      });

      const resFusion = await ejecutarFusionarJinetes(ctxAdmin, j1.jinete!.id, j2.jinete!.id);
      expect(resFusion.exito).toBe(true);
      expect(resFusion.detalle?.vinculosReasignados).toBe(1);

      const fichaFinal = await ejecutarObtenerFichaJinete(ctxAdmin, j1.jinete!.id);
      expect(fichaFinal?.apoderados.length).toBe(1);
      expect(fichaFinal?.contacto).toBe("contacto@duplicado.cl");
    });

    it("fusiona dos caballos y desactiva el duplicado", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const cRes = await ejecutarCrearClub(ctxAdmin, {
        nombre: `Club Fus Cab ${sufijo}`,
        confirmarAunqueParecido: true,
      });
      const clubId = cRes.club!.id;

      const c1 = await ejecutarCrearCaballo(ctxAdmin, {
        nombre: `Caballo Uno ${sufijo}`,
        clubId,
        confirmarAunqueParecido: true,
      });
      const c2 = await ejecutarCrearCaballo(ctxAdmin, {
        nombre: `Caballo Dos ${sufijo}`,
        clubId,
        confirmarAunqueParecido: true,
      });

      const res = await ejecutarFusionarCaballos(ctxAdmin, c1.caballo!.id, c2.caballo!.id);
      expect(res.exito).toBe(true);

      const ficha2 = await prisma.caballo.findUnique({ where: { id: c2.caballo!.id } });
      expect(ficha2?.activo).toBe(false);
      expect(ficha2?.fusionadoEnId).toBe(c1.caballo!.id);
    });
  });

  // -------------------------------------------------------------
  // Suite 6: Privacidad (Ley 19.628 / 21.719) y Permisos
  // -------------------------------------------------------------
  describe("Privacidad Normada y Permisos por Rol", () => {
    it("observador nunca recibe fechas de nacimiento, edad, contacto, RUT ni alertas", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const cRes = await ejecutarCrearClub(ctxAdmin, {
        nombre: `Club Privacidad ${sufijo}`,
        contacto: "privado@club.cl",
        rut: generarRutValido(),
        confirmarAunqueParecido: true,
      });

      const jRes = await ejecutarCrearJinete(ctxAdmin, {
        nombre: `Jinete Con Datos Privados ${sufijo}`,
        clubId: cRes.club!.id,
        fechaNacimiento: "2012-08-15",
        contacto: "+56 9 1122 3344",
        rut: generarRutValido(),
        confirmarAunqueParecido: true,
      });

      // 1. En Listado
      const listaObs = await ejecutarListarParticipantes(ctxObservador, { pestana: "jinetes" });
      const jineteEnLista = listaObs.jinetes.find((j) => j.id === jRes.jinete!.id);
      expect(jineteEnLista).toBeDefined();
      expect(jineteEnLista?.fechaNacimiento).toBeNull();
      expect(jineteEnLista?.edad).toBeNull();
      expect(jineteEnLista?.contacto).toBeNull();
      expect(jineteEnLista?.rut).toBeNull();
      expect(jineteEnLista?.alertas.length).toBe(0);

      // 2. En Ficha de Jinete
      const fichaObs = await ejecutarObtenerFichaJinete(ctxObservador, jRes.jinete!.id);
      expect(fichaObs?.fechaNacimiento).toBeNull();
      expect(fichaObs?.edad).toBeNull();
      expect(fichaObs?.contacto).toBeNull();
      expect(fichaObs?.rut).toBeNull();
      expect(fichaObs?.apoderados.length).toBe(0);
      expect(fichaObs?.alertas.length).toBe(0);

      // 3. En Ficha de Club
      const clubFichaObs = await ejecutarObtenerFichaClub(ctxObservador, cRes.club!.id);
      expect(clubFichaObs?.contacto).toBeNull();
      expect(clubFichaObs?.rut).toBeNull();
    });

    it("observador recibe 403 al intentar acceder a apoderados", async () => {
      await expect(
        ejecutarListarParticipantes(ctxObservador, { pestana: "apoderados" })
      ).rejects.toThrowError(ErrorPermiso);

      const apRes = await ejecutarCrearApoderado(ctxAdmin, {
        nombre: `Apoderado Secreto ${Date.now().toString().slice(-4)}`,
        telefono: "+56 9 9988 7766",
        confirmarAunqueParecido: true,
      });

      await expect(
        ejecutarObtenerFichaApoderado(ctxObservador, apRes.apoderado!.id)
      ).rejects.toThrowError(ErrorPermiso);
    });

    it("suprime datos de contacto y RUT conforme al derecho de supresión", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const cRes = await ejecutarCrearClub(ctxAdmin, {
        nombre: `Club Supr ${sufijo}`,
        confirmarAunqueParecido: true,
      });
      const jRes = await ejecutarCrearJinete(ctxAdmin, {
        nombre: `Jinete Suprimir ${sufijo}`,
        clubId: cRes.club!.id,
        contacto: "+56 9 5555 4444",
        rut: generarRutValido(),
        confirmarAunqueParecido: true,
      });

      const res = await ejecutarSuprimirDatosJinete(ctxAdmin, jRes.jinete!.id);
      expect(res.exito).toBe(true);

      const ficha = await ejecutarObtenerFichaJinete(ctxAdmin, jRes.jinete!.id);
      expect(ficha?.contacto).toBeNull();
      expect(ficha?.rut).toBeNull();
      // Nombre y club se conservan
      expect(ficha?.nombre).toBe(`Jinete Suprimir ${sufijo}`);
    });

    it("genera archivo CSV de portabilidad de datos", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const cRes = await ejecutarCrearClub(ctxAdmin, {
        nombre: `Club CSV ${sufijo}`,
        confirmarAunqueParecido: true,
      });
      const jRes = await ejecutarCrearJinete(ctxAdmin, {
        nombre: `Jinete Portabilidad ${sufijo}`,
        clubId: cRes.club!.id,
        contacto: "portabilidad@test.cl",
        confirmarAunqueParecido: true,
      });

      const csvRes = await ejecutarDescargarDatosParticipante(
        ctxAdmin,
        "jinete",
        jRes.jinete!.id
      );
      expect(csvRes.exito).toBe(true);
      expect(csvRes.contenidoCsv).toContain("Jinete Portabilidad");
      expect(csvRes.contenidoCsv).toContain("portabilidad@test.cl");
    });
  });

  // -------------------------------------------------------------
  // Suite 7: Aislamiento Multi-Tenant (db(ctx))
  // -------------------------------------------------------------
  describe("Aislamiento Multi-Tenant", () => {
    let orgBId: string;
    let ctxB: Contexto;

    beforeAll(async () => {
      const timestamp = Date.now();
      const orgB = await prisma.organizacion.create({
        data: {
          nombre: `Org B ${timestamp}`,
          nombreNormalizado: `org b ${timestamp}`,
        },
      });
      orgBId = orgB.id;
      ctxB = {
        usuario: ctxAdmin.usuario,
        organizacionId: orgBId,
        rol: "administrador",
        evento: null,
      };
    });

    afterAll(async () => {
      if (orgBId) {
        await prisma.$executeRawUnsafe(`DELETE FROM registro_auditoria WHERE organizacion_id = '${orgBId}';`);
        await prisma.$executeRawUnsafe(`DELETE FROM jinete WHERE organizacion_id = '${orgBId}';`);
        await prisma.$executeRawUnsafe(`DELETE FROM caballo WHERE organizacion_id = '${orgBId}';`);
        await prisma.$executeRawUnsafe(`DELETE FROM club WHERE organizacion_id = '${orgBId}';`);
        await prisma.$executeRawUnsafe(`DELETE FROM organizacion WHERE id = '${orgBId}';`);
      }
    });

    it("rechaza crear jinete referenciando un club de otra organización", async () => {
      const cRes = await ejecutarCrearClub(ctxAdmin, {
        nombre: `Club Org Principal ${Date.now().toString().slice(-4)}`,
        confirmarAunqueParecido: true,
      });
      const clubIdPrincipal = cRes.club!.id;

      // Intentar crear jinete en otra organización usando el club de la primera
      await expect(
        ejecutarCrearJinete(ctxB, {
          nombre: "Jinete Infiltrado",
          clubId: clubIdPrincipal,
          confirmarAunqueParecido: true,
        })
      ).rejects.toThrow("no pertenece a tu organización");
    });

    it("los participantes de una organización no aparecen en las listas de otra", async () => {
      const sufijo = Date.now().toString().slice(-4);
      const cRes = await ejecutarCrearClub(ctxB, {
        nombre: `Club Otra Org ${sufijo}`,
        confirmarAunqueParecido: true,
      });

      const listaPrincipal = await ejecutarListarParticipantes(ctxAdmin, { pestana: "clubes" });
      const encontrado = listaPrincipal.clubes.some((c) => c.id === cRes.club!.id);
      expect(encontrado).toBe(false);
    });
  });
});
