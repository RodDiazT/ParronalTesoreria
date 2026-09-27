import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signIn } from "@/lib/auth";

interface IngresarPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function IngresarPage({ searchParams }: IngresarPageProps) {
  const session = await auth();

  // Si ya tiene sesión, redirigir al portal
  if (session?.user) {
    redirect("/");
  }

  const { error } = await searchParams;

  let mensajeError: string | null = null;
  if (error) {
    switch (error) {
      case "AccessDenied":
        mensajeError = "Tu cuenta de Google no tiene el correo verificado o el acceso fue denegado.";
        break;
      case "Configuration":
        mensajeError = "Hubo un problema con la configuración de autenticación. Contacta al administrador.";
        break;
      case "Verification":
        mensajeError = "La sesión o enlace de verificación ha expirado.";
        break;
      case "OAuthAccountNotLinked":
        mensajeError = "Este correo ya está asociado a otra cuenta en el sistema.";
        break;
      default:
        mensajeError = "Ocurrió un error al intentar iniciar sesión. Por favor intenta nuevamente.";
        break;
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-fondo">
      <div className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-6 shadow-sm">
        {/* Encabezado sin datos de la organización según marco §9.4 */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-acento text-sobre-acento font-bold text-xl">
            T
          </div>
          <h1 className="text-xl font-bold tracking-tight text-texto">
            Tesorería del concurso
          </h1>
          <p className="mt-1 text-sm text-texto-suave">
            Portal privado de gestión y rendición de tesorería
          </p>
        </div>

        {/* Mensaje de error si aplica */}
        {mensajeError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-problema-fondo bg-problema-fondo/40 p-3 text-xs text-problema-texto font-medium leading-relaxed"
          >
            {mensajeError}
          </div>
        )}

        {/* Botón de inicio con Google */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-acento px-4 py-3 text-sm font-medium text-sobre-acento transition-opacity hover:opacity-95 active:scale-[0.99] cursor-pointer shadow-sm"
          >
            {/* Logo de Google SVG */}
            <svg
              className="h-5 w-5 bg-white rounded-full p-0.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>Ingresar con Google</span>
          </button>
        </form>

        {/* Aviso de privacidad */}
        <div className="mt-6 border-t border-borde pt-4 text-center">
          <Link
            href="/privacidad"
            className="text-xs text-texto-suave underline underline-offset-4 hover:text-texto transition-colors"
          >
            Aviso de privacidad
          </Link>
        </div>
      </div>
    </main>
  );
}
