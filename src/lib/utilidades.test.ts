import { describe, it, expect } from "vitest";
import {
  normalizarNombre,
  normalizarTelefono,
  validarRut,
  fechaReferenciaEdadEfectiva,
} from "./utilidades";

describe("normalizarNombre", () => {
  it("elimina tildes, convierte a minúsculas y colapsa espacios", () => {
    expect(normalizarNombre("  Club   Ecuestre  Parrónal  ")).toBe("club ecuestre parronal");
    expect(normalizarNombre("Ferretería Angol!")).toBe("ferreteria angol");
    expect(normalizarNombre("José-María O'Higgins")).toBe("jose maria o higgins");
  });

  it("maneja strings vacíos o nulos", () => {
    expect(normalizarNombre("")).toBe("");
  });
});

describe("normalizarTelefono", () => {
  it("extrae los últimos 9 dígitos de un teléfono", () => {
    expect(normalizarTelefono("+56 9 1234 5678")).toBe("912345678");
    expect(normalizarTelefono("56912345678")).toBe("912345678");
    expect(normalizarTelefono("912345678")).toBe("912345678");
  });

  it("devuelve null si es nulo o vacío", () => {
    expect(normalizarTelefono(null)).toBeNull();
    expect(normalizarTelefono("")).toBeNull();
  });
});

describe("validarRut", () => {
  it("valida RUTs chilenos correctos y los devuelve normalizados", () => {
    // 11.111.111-1 es válido
    const r1 = validarRut("11.111.111-1");
    expect(r1.valido).toBe(true);
    expect(r1.rutNormalizado).toBe("11111111-1");

    // Formato sin puntos ni guion
    const r2 = validarRut("111111111");
    expect(r2.valido).toBe(true);
    expect(r2.rutNormalizado).toBe("11111111-1");

    // RUT con K (11.111.112-K)
    const r3 = validarRut("11.111.112-k");
    expect(r3.valido).toBe(true);
    expect(r3.rutNormalizado).toBe("11111112-K");
  });

  it("rechaza RUTs con dígito verificador inválido", () => {
    const r = validarRut("11.111.111-2");
    expect(r.valido).toBe(false);
    expect(r.error).toContain("dígito verificador");
  });

  it("rechaza formatos mal formados", () => {
    expect(validarRut("").valido).toBe(false);
    expect(validarRut("123").valido).toBe(false);
    expect(validarRut("ABCDEF-1").valido).toBe(false);
  });
});

describe("fechaReferenciaEdadEfectiva", () => {
  it("devuelve fechaReferenciaEdad si existe", () => {
    const evento = {
      fechaInicio: new Date("2026-11-21"),
      fechaReferenciaEdad: new Date("2026-12-31"),
    };
    expect(fechaReferenciaEdadEfectiva(evento)).toEqual(new Date("2026-12-31"));
  });

  it("devuelve fechaInicio si fechaReferenciaEdad es null o undefined", () => {
    const evento = {
      fechaInicio: new Date("2026-11-21"),
      fechaReferenciaEdad: null,
    };
    expect(fechaReferenciaEdadEfectiva(evento)).toEqual(new Date("2026-11-21"));
  });
});
