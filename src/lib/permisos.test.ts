import { describe, it, expect } from "vitest";
import {
  puede,
  exigir,
  exigirRol,
  esPropio,
  exigirNoPropio,
  ErrorPermiso,
  Contexto,
} from "./permisos";

describe("src/lib/permisos.ts", () => {
  const ctxAdmin: Contexto = {
    usuario: { id: "u-admin", correo: "admin@club.cl", nombre: "Admin", imagen: null },
    organizacionId: "org-1",
    rol: "administrador",
    evento: {
      id: "ev-1",
      nombre: "Concurso 2026",
      fechaInicio: new Date("2026-11-21"),
      fechaTermino: new Date("2026-11-21"),
      fechaReferenciaEdad: null,
      lugar: "Club",
      estado: "abierto",
    },
  };

  const ctxAyudante: Contexto = {
    usuario: { id: "u-ayudante", correo: "ayudante@club.cl", nombre: "Ayudante", imagen: null },
    organizacionId: "org-1",
    rol: "ayudante",
    evento: ctxAdmin.evento,
  };

  const ctxObservador: Contexto = {
    usuario: { id: "u-obs", correo: "obs@club.cl", nombre: "Observador", imagen: null },
    organizacionId: "org-1",
    rol: "observador",
    evento: ctxAdmin.evento,
  };

  it("administrador puede realizar todas las acciones del sistema", () => {
    expect(puede(ctxAdmin, "ver_dashboard")).toBe(true);
    expect(puede(ctxAdmin, "validar")).toBe(true);
    expect(puede(ctxAdmin, "configurar")).toBe(true);
    expect(puede(ctxAdmin, "gestionar_accesos")).toBe(true);
    expect(puede(ctxAdmin, "registrar_traspaso")).toBe(true);
    expect(puede(ctxAdmin, "participantes.administrar")).toBe(true);
    expect(puede(ctxAdmin, "inscripciones.administrar")).toBe(true);
  });

  it("ayudante puede registrar pero NO validar, configurar ni gestionar accesos", () => {
    expect(puede(ctxAyudante, "registrar")).toBe(true);
    expect(puede(ctxAyudante, "ver_respaldos")).toBe(true);
    expect(puede(ctxAyudante, "ver_datos_personales")).toBe(true);
    expect(puede(ctxAyudante, "validar")).toBe(false);
    expect(puede(ctxAyudante, "configurar")).toBe(false);
    expect(puede(ctxAyudante, "gestionar_accesos")).toBe(false);
    expect(puede(ctxAyudante, "registrar_traspaso")).toBe(false);
    expect(puede(ctxAyudante, "participantes.administrar")).toBe(false);
  });

  it("observador NO puede ver respaldos ni datos personales ni registrar", () => {
    expect(puede(ctxObservador, "ver_dashboard")).toBe(true);
    expect(puede(ctxObservador, "ver_comision")).toBe(true);
    expect(puede(ctxObservador, "ver_respaldos")).toBe(false);
    expect(puede(ctxObservador, "ver_datos_personales")).toBe(false);
    expect(puede(ctxObservador, "registrar")).toBe(false);
    expect(puede(ctxObservador, "validar")).toBe(false);
  });

  it("exigir lanza ErrorPermiso (status 403) si no tiene permiso", () => {
    expect(() => exigir(ctxAyudante, "validar")).toThrow(ErrorPermiso);
    expect(() => exigir(ctxAdmin, "validar")).not.toThrow();
  });

  it("exigirRol lanza ErrorPermiso si el rol no coincide", () => {
    expect(() => exigirRol(ctxAyudante, "administrador")).toThrow(ErrorPermiso);
    expect(() => exigirRol(ctxAdmin, "administrador", "ayudante")).not.toThrow();
  });

  it("esPropio reconoce registros creados o enviados por el usuario actual", () => {
    expect(esPropio(ctxAyudante, { registradoPorId: "u-ayudante" })).toBe(true);
    expect(esPropio(ctxAyudante, { enviadoAValidarPorId: "u-ayudante" })).toBe(true);
    expect(esPropio(ctxAyudante, { registradoPorId: "u-otro" })).toBe(false);
  });

  it("exigirNoPropio impide que un usuario valide lo suyo propio", () => {
    expect(() => exigirNoPropio(ctxAyudante, { enviadoAValidarPorId: "u-ayudante" })).toThrow(ErrorPermiso);
    expect(() => exigirNoPropio(ctxAyudante, { enviadoAValidarPorId: "u-otro" })).not.toThrow();
  });
});
