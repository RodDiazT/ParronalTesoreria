import Link from "next/link";

export const metadata = {
  title: "Sin Permiso · Tesorería",
  description: "Acceso no autorizado",
};

export default function SinPermisoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-fondo text-center">
      <div className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-6 sm:p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-problema-fondo text-problema-texto font-bold text-lg">
          ⚠️
        </div>
        <h1 className="text-lg font-bold text-texto mb-2">
          Sin permiso para esta sección
        </h1>
        <p className="text-xs text-texto-suave mb-6 leading-relaxed">
          Tu rol actual no tiene autorización para acceder a esta pantalla o realizar esta acción.
        </p>

        <Link
          href="/"
          className="inline-flex w-full items-center justify-center rounded-xl bg-acento px-4 py-2.5 text-xs font-semibold text-sobre-acento hover:opacity-95 transition-opacity"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
