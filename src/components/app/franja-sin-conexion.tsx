"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Franja fija bajo el encabezado que se muestra cuando el dispositivo no tiene red.
 * (docs/interfaz/ux-ui.md §3.10)
 */
export function FranjaSinConexion() {
  const [sinConexion, setSinConexion] = useState(false);

  useEffect(() => {
    // Solo en cliente
    setSinConexion(!navigator.onLine);

    const alEstarOffline = () => setSinConexion(true);
    const alEstarOnline = () => setSinConexion(false);

    window.addEventListener("offline", alEstarOffline);
    window.addEventListener("online", alEstarOnline);

    return () => {
      window.removeEventListener("offline", alEstarOffline);
      window.removeEventListener("online", alEstarOnline);
    };
  }, []);

  if (!sinConexion) return null;

  return (
    <div
      role="status"
      className="sticky top-14 z-30 flex items-center justify-center gap-2 bg-falta-fondo px-4 py-2 text-xs font-semibold text-falta-texto border-b border-falta-texto/20 shadow-xs animate-in slide-in-from-top-2"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Sin conexión. Lo que ves puede no estar al día.</span>
    </div>
  );
}
