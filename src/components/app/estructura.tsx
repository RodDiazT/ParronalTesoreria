"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Encabezado } from "./encabezado";
import { MenuPrincipal } from "./menu-principal";
import { BotonRegistrar } from "./boton-registrar";
import { FranjaSinConexion } from "./franja-sin-conexion";
import { GrupoMenu } from "@/lib/presentacion/menu";

interface ConfigEstructura {
  modo?: "seccion" | "detalle";
  titulo?: string;
  volverHref?: string;
  ocultarBotonRegistrar?: boolean;
}

interface EstructuraContextType {
  config: ConfigEstructura;
  setConfig: React.Dispatch<React.SetStateAction<ConfigEstructura>>;
}

const EstructuraContext = createContext<EstructuraContextType | null>(null);

/**
 * Hook para que páginas hijas configuren dinámicamente el encabezado
 * (por ejemplo para cambiar a modo="detalle", fijar título o botón volver).
 */
export function useEstructura() {
  const context = useContext(EstructuraContext);
  if (!context) {
    throw new Error("useEstructura debe usarse dentro de <Estructura>");
  }
  return context;
}

/**
 * Componente declarativo para configurar el encabezado desde páginas hijas de detalle.
 */
export function ConfigurarEstructura({
  modo = "detalle",
  titulo,
  volverHref = "/",
  ocultarBotonRegistrar = true,
}: ConfigEstructura) {
  const { setConfig } = useEstructura();

  useEffect(() => {
    setConfig({ modo, titulo, volverHref, ocultarBotonRegistrar });
    return () => {
      // Restablece a modo sección al desmontar
      setConfig({ modo: "seccion", titulo: undefined, volverHref: "/", ocultarBotonRegistrar: false });
    };
  }, [modo, titulo, volverHref, ocultarBotonRegistrar, setConfig]);

  return null;
}

interface EstructuraProps {
  nombreEvento?: string;
  nombreOrganizacion?: string;
  fechaEvento?: string;
  tieneLogo?: boolean;
  usuarioNombre?: string;
  usuarioRol?: string;
  totalPendientes?: number;
  gruposMenu?: GrupoMenu[];
  children: React.ReactNode;
}

/**
 * Shell unificado de interfaz con encabezado, menú responsive, franja sin conexión
 * y botón flotante de registro.
 * (docs/interfaz/ux-ui.md §3.1 y §5.4)
 */
export function Estructura({
  nombreEvento = "Concurso Ecuestre",
  nombreOrganizacion = "Club",
  fechaEvento = "",
  tieneLogo = false,
  usuarioNombre = "",
  usuarioRol = "ayudante",
  totalPendientes = 0,
  gruposMenu = [],
  children,
}: EstructuraProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [config, setConfig] = useState<ConfigEstructura>({
    modo: "seccion",
    ocultarBotonRegistrar: false,
  });

  return (
    <EstructuraContext.Provider value={{ config, setConfig }}>
      <div className="min-h-screen bg-fondo text-texto antialiased">
        {/* Menú Principal (Móvil Deslizable y Barra Fija en Escritorio) */}
        <MenuPrincipal
          abierto={menuAbierto}
          alCerrar={() => setMenuAbierto(false)}
          nombreOrganizacion={nombreOrganizacion}
          nombreEvento={nombreEvento}
          fechaEvento={fechaEvento}
          usuarioNombre={usuarioNombre}
          usuarioRol={usuarioRol}
          tieneLogo={tieneLogo}
          grupos={gruposMenu}
        />

        {/* Contenedor Principal (con margen izquierdo en escritorio para dar espacio al menú fijo) */}
        <div className="flex flex-col min-h-screen lg:pl-64">
          {/* Encabezado fijo */}
          <Encabezado
            modo={config.modo}
            titulo={config.titulo}
            volverHref={config.volverHref}
            nombreEvento={nombreEvento}
            nombreOrganizacion={nombreOrganizacion}
            tieneLogo={tieneLogo}
            totalPendientes={totalPendientes}
            alAbrirMenu={() => setMenuAbierto(true)}
          />

          {/* Franja de detección de desconexión */}
          <FranjaSinConexion />

          {/* Contenido centrado a máx 720px con espacio inferior para el botón '+' */}
          <main className="flex-1 w-full max-w-[720px] mx-auto px-4 py-5 sm:py-6 pb-28 lg:pb-12">
            {children}
          </main>
        </div>

        {/* Botón flotante '+' (solo en móvil para roles autorizados) */}
        <BotonRegistrar
          rol={usuarioRol}
          ocultar={config.ocultarBotonRegistrar || config.modo === "detalle"}
        />
      </div>
    </EstructuraContext.Provider>
  );
}
