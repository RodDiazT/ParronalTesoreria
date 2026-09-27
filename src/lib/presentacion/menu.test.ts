import { describe, it, expect } from "vitest";
import { itemsMenu } from "./menu";
import { Contexto } from "@/lib/permisos";

describe("itemsMenu", () => {
  const ctxBase: Contexto = {
    usuario: { id: "u1", correo: "test@example.com", nombre: "Usuario", imagen: null },
    organizacionId: "org-1",
    rol: "administrador",
    evento: {
      id: "ev-1",
      nombre: "Concurso Parronal",
      fechaInicio: new Date("2026-11-21"),
      fechaTermino: new Date("2026-11-21"),
      fechaReferenciaEdad: null,
      lugar: "Cancha Principal",
      estado: "abierto",
    },
  };

  it("administrador recibe todos los grupos e ítems administrativos", () => {
    const ctxAdmin = { ...ctxBase, rol: "administrador" as const };
    const contadores = { porValidar: 3, usuariosSolicitudes: 2, misObservados: 0, total: 5 };
    const grupos = itemsMenu(ctxAdmin, contadores);

    const titulos = grupos.map((g) => g.titulo).filter(Boolean);
    expect(titulos).toContain("Por revisar");
    expect(titulos).toContain("Administración");

    // Ítems de Por revisar
    const porRevisar = grupos.find((g) => g.titulo === "Por revisar")?.items;
    expect(porRevisar?.some((i) => i.id === "validar" && i.contador === 3)).toBe(true);

    // Ítems de Administración
    const admin = grupos.find((g) => g.titulo === "Administración")?.items;
    expect(admin?.some((i) => i.id === "usuarios" && i.contador === 2)).toBe(true);
    expect(admin?.some((i) => i.id === "configuracion")).toBe(true);
    expect(admin?.some((i) => i.id === "auditoria")).toBe(true);
    expect(admin?.some((i) => i.id === "contrapartes")).toBe(true);
  });

  it("ayudante NO recibe Configuración, Usuarios ni Auditoría", () => {
    const ctxAyudante = { ...ctxBase, rol: "ayudante" as const };
    const contadores = { porValidar: 0, usuariosSolicitudes: 0, misObservados: 1, total: 1 };
    const grupos = itemsMenu(ctxAyudante, contadores);

    const admin = grupos.find((g) => g.titulo === "Administración")?.items;
    expect(admin?.some((i) => i.id === "configuracion")).toBe(false);
    expect(admin?.some((i) => i.id === "usuarios")).toBe(false);
    expect(admin?.some((i) => i.id === "auditoria")).toBe(false);
    // Pero sí ve contrapartes y traspasos
    expect(admin?.some((i) => i.id === "contrapartes")).toBe(true);
    expect(admin?.some((i) => i.id === "traspasos")).toBe(true);

    // En Por revisar, ve 'mis_observados'
    const porRevisar = grupos.find((g) => g.titulo === "Por revisar")?.items;
    expect(porRevisar?.some((i) => i.id === "mis_observados" && i.contador === 1)).toBe(true);
    expect(porRevisar?.some((i) => i.id === "validar")).toBe(false);
  });

  it("observador NO recibe Por revisar ni ítems de gestión", () => {
    const ctxObservador = { ...ctxBase, rol: "observador" as const };
    const grupos = itemsMenu(ctxObservador);

    const porRevisar = grupos.find((g) => g.titulo === "Por revisar");
    expect(porRevisar).toBeUndefined();

    const admin = grupos.find((g) => g.titulo === "Administración")?.items;
    expect(admin?.some((i) => i.id === "configuracion")).toBe(false);
    expect(admin?.some((i) => i.id === "usuarios")).toBe(false);
    expect(admin?.some((i) => i.id === "auditoria")).toBe(false);
    expect(admin?.some((i) => i.id === "contrapartes")).toBe(true);
  });
});
