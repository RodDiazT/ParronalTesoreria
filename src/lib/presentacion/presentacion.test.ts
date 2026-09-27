import { describe, it, expect } from "vitest";
import { estadoVisual } from "./estado";
import { formatearMonto, formatearFecha } from "./formato";

describe("src/lib/presentacion", () => {
  describe("estadoVisual", () => {
    it("mapea estados de membresía correctamente", () => {
      expect(estadoVisual("membresia", "activa")).toEqual({ tono: "listo", texto: "Activo" });
      expect(estadoVisual("membresia", "solicitada")).toEqual({ tono: "falta", texto: "Solicitud" });
      expect(estadoVisual("membresia", "revocada")).toEqual({ tono: "fuera", texto: "Revocado" });
      expect(estadoVisual("membresia", "rechazada")).toEqual({ tono: "fuera", texto: "Rechazada" });
    });

    it("mapea tonos normados generales con palabra obligatoria", () => {
      expect(estadoVisual("general", "validado")).toEqual({ tono: "listo", texto: "Validado" });
      expect(estadoVisual("general", "por_validar")).toEqual({ tono: "falta", texto: "Por validar" });
      expect(estadoVisual("general", "observado")).toEqual({ tono: "problema", texto: "Observado" });
      expect(estadoVisual("general", "anulado")).toEqual({ tono: "fuera", texto: "Anulado" });
    });

    it("siempre devuelve palabra y nunca falla con null", () => {
      expect(estadoVisual("general", null)).toEqual({ tono: "fuera", texto: "Sin estado" });
    });
  });

  describe("formatearMonto", () => {
    it("formatea enteros sin decimales con separador de miles", () => {
      expect(formatearMonto(1250000)).toBe("$1.250.000");
      expect(formatearMonto(0)).toBe("$0");
    });

    it("aplica signo menos tipográfico a negativos", () => {
      expect(formatearMonto(-45000)).toBe("−$45.000");
    });

    it("aplica signo positivo si se solicita", () => {
      expect(formatearMonto(200000, { signo: true })).toBe("+$200.000");
    });

    it("abrevia millones si se solicita", () => {
      expect(formatearMonto(2300000, { abreviar: true })).toBe("$2,3 M");
      expect(formatearMonto(2300000, { abreviar: true, signo: true })).toBe("+$2,3 M");
      expect(formatearMonto(-1500000, { abreviar: true })).toBe("−$1,5 M");
    });
  });

  describe("formatearFecha", () => {
    it("formatea en formato largo DD-MM-AAAA", () => {
      const fecha = new Date(2026, 9, 12, 15, 30); // 12-10-2026
      expect(formatearFecha(fecha, "larga")).toBe("12-10-2026");
    });

    it("formatea en formato larga-hora", () => {
      const fecha = new Date(2026, 9, 12, 15, 42);
      expect(formatearFecha(fecha, "larga-hora")).toBe("12-10-2026 15:42");
    });

    it("formatea en formato corta distinguiendo Hoy", () => {
      const hoy = new Date();
      expect(formatearFecha(hoy, "corta")).toBe("Hoy");
    });
  });
});
