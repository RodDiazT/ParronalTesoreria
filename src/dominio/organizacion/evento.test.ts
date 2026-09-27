import { describe, it, expect, beforeAll } from "vitest";
import {
  ejecutarActualizarEvento,
  validarMagicBytesImagen,
} from "./acciones";
import { prisma } from "@/lib/db";
import { db } from "@/lib/contexto";
import { Contexto } from "@/lib/permisos";

describe("Configuración de Evento y Organización", () => {
  let ctxAdmin: Contexto;

  beforeAll(async () => {
    const org = await prisma.organizacion.findFirst();
    const ev = await prisma.evento.findFirst();
    const user = await prisma.usuario.findFirst();

    ctxAdmin = {
      usuario: { id: user?.id || "u-admin", correo: "admin@test.cl", nombre: "Admin", imagen: null },
      organizacionId: org?.id || "org-1",
      rol: "administrador",
      evento: ev
        ? {
            id: ev.id,
            nombre: ev.nombre,
            fechaInicio: ev.fechaInicio,
            fechaTermino: ev.fechaTermino,
            fechaReferenciaEdad: ev.fechaReferenciaEdad,
            lugar: ev.lugar,
            estado: ev.estado,
          }
        : null,
    };
  });

  describe("validarMagicBytesImagen", () => {
    it("valida cabeceras reales de PNG, JPEG y WebP", () => {
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      expect(validarMagicBytesImagen(pngBuffer).valido).toBe(true);
      expect(validarMagicBytesImagen(pngBuffer).tipoMime).toBe("image/png");

      // JPEG: FF D8 FF
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      expect(validarMagicBytesImagen(jpegBuffer).valido).toBe(true);
      expect(validarMagicBytesImagen(jpegBuffer).tipoMime).toBe("image/jpeg");

      // WebP: RIFF .... WEBP
      const webpBuffer = Buffer.concat([
        Buffer.from("RIFF", "ascii"),
        Buffer.alloc(4),
        Buffer.from("WEBP", "ascii"),
      ]);
      expect(validarMagicBytesImagen(webpBuffer).valido).toBe(true);
      expect(validarMagicBytesImagen(webpBuffer).tipoMime).toBe("image/webp");
    });

    it("rechaza archivos SVG y texto plano por seguridad", () => {
      const svgBuffer = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>", "utf-8");
      const res = validarMagicBytesImagen(svgBuffer);
      expect(res.valido).toBe(false);
      expect(res.error).toContain("no se permite SVG");
    });
  });

  describe("actualizarEvento", () => {
    it("rechaza fecha de término anterior a la de inicio", async () => {
      if (!ctxAdmin.evento) return;

      const res = await ejecutarActualizarEvento(ctxAdmin, {
        id: ctxAdmin.evento.id,
        nombre: ctxAdmin.evento.nombre,
        fechaInicio: "2026-11-25",
        fechaTermino: "2026-11-20", // Anterior
        fechaReferenciaEdad: "",
        lugar: "Cancha",
        version: 1,
      });

      expect(res.exito).toBe(false);
      expect(res.error).toContain("anterior");
    });

    it("rechaza si la versión concurrente no coincide", async () => {
      if (!ctxAdmin.evento) return;

      const eventoActual = await db(ctxAdmin).evento.findUnique({
        where: { id: ctxAdmin.evento.id },
      });

      const res = await ejecutarActualizarEvento(ctxAdmin, {
        id: ctxAdmin.evento.id,
        nombre: "Concurso Modificado",
        fechaInicio: "2026-11-21",
        fechaTermino: "2026-11-22",
        fechaReferenciaEdad: "",
        lugar: "Cancha",
        version: eventoActual!.version + 999, // Versión obsoleta
      });

      expect(res.exito).toBe(false);
      expect(res.error).toContain("recarga");
    });
  });
});
