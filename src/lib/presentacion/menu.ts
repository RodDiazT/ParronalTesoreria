import { Contexto, puede } from "@/lib/permisos";

export interface SubItemMenu {
  id: string;
  etiqueta: string;
  href: string;
  icono?: string;
  contador?: number;
}

export interface ItemMenu {
  id: string;
  etiqueta: string;
  href: string;
  contador?: number;
  subItems?: SubItemMenu[];
}

export interface GrupoMenu {
  titulo?: string;
  items: ItemMenu[];
}

export interface ContadoresUsuario {
  porValidar: number;
  usuariosSolicitudes: number;
  misObservados: number;
  total: number;
}

export interface CategoriaServicioMenu {
  id: string;
  nombre: string;
  sujetoAsociado: string | null;
  cargosPendientes?: number;
}

/**
 * Genera los ítems y grupos de menú según el rol del contexto y la matriz de permisos.
 * (docs/interfaz/ux-ui.md §3.3 y §5.5)
 */
export function itemsMenu(
  ctx: Contexto,
  contadores: ContadoresUsuario = { porValidar: 0, usuariosSolicitudes: 0, misObservados: 0, total: 0 },
  categoriasServicio: CategoriaServicioMenu[] = []
): GrupoMenu[] {
  const grupos: GrupoMenu[] = [];

  const subItemsDirectorio: SubItemMenu[] = [
    {
      id: "servicio-inscripciones",
      etiqueta: "Inscripciones",
      href: "/inscripciones",
      icono: "📋",
    },
    ...categoriasServicio.map((cat) => {
      let icono = "🏷️";
      if (cat.sujetoAsociado === "caballo") icono = "🐎";
      else if (cat.sujetoAsociado === "jinete") icono = "👤";
      else if (cat.sujetoAsociado === "club") icono = "🏛️";
      else if (cat.sujetoAsociado === "binomio") icono = "👥";

      return {
        id: `servicio-${cat.id}`,
        etiqueta: cat.nombre,
        href: `/servicios/${cat.id}`,
        icono,
        contador: cat.cargosPendientes && cat.cargosPendientes > 0 ? cat.cargosPendientes : undefined,
      };
    }),
  ];

  // 1. Grupo Principal
  const principal: ItemMenu[] = [
    { id: "inicio", etiqueta: "Inicio", href: "/" },
    { id: "movimientos", etiqueta: "Movimientos", href: "/movimientos" },
    {
      id: "participantes",
      etiqueta: "Directorio",
      href: "/participantes",
      subItems: subItemsDirectorio,
    },
  ];
  grupos.push({ items: principal });

  // 2. Grupo Por revisar
  const porRevisar: ItemMenu[] = [];
  if (puede(ctx, "validar")) {
    porRevisar.push({
      id: "validar",
      etiqueta: "Validar",
      href: "/movimientos/validar",
      contador: contadores.porValidar > 0 ? contadores.porValidar : undefined,
    });
  } else if (ctx.rol === "ayudante") {
    if (contadores.misObservados > 0) {
      porRevisar.push({
        id: "mis_observados",
        etiqueta: "Mis observados",
        href: "/movimientos?pestana=observados&mios=1",
        contador: contadores.misObservados,
      });
    }
  }

  if (porRevisar.length > 0) {
    grupos.push({ titulo: "Por revisar", items: porRevisar });
  }

  // 3. Grupo Administración
  const admin: ItemMenu[] = [
    { id: "traspasos", etiqueta: "Traspasos", href: "/traspasos" },
    { id: "contrapartes", etiqueta: "Contrapartes", href: "/contrapartes" },
  ];

  if (puede(ctx, "gestionar_accesos")) {
    admin.push({
      id: "usuarios",
      etiqueta: "Usuarios",
      href: "/usuarios",
      contador: contadores.usuariosSolicitudes > 0 ? contadores.usuariosSolicitudes : undefined,
    });
  }

  if (puede(ctx, "configurar")) {
    admin.push({ id: "configuracion", etiqueta: "Configuración", href: "/configuracion" });
  }

  if (puede(ctx, "ver_auditoria")) {
    admin.push({ id: "auditoria", etiqueta: "Auditoría", href: "/auditoria" });
  }

  if (admin.length > 0) {
    grupos.push({ titulo: "Administración", items: admin });
  }

  // 4. Grupo Pie
  const pie: ItemMenu[] = [
    { id: "comision", etiqueta: "Comisión", href: "/comision" },
    { id: "mi_cuenta", etiqueta: "Mi cuenta", href: "/mi-cuenta" },
  ];
  grupos.push({ items: pie });

  return grupos;
}
