import { NextResponse, type NextRequest } from "next/server";

// Rutas públicas que no requieren autenticación
const RUTAS_PUBLICAS = ["/ingresar", "/privacidad", "/api/auth", "/api/health"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir archivos estáticos y API interna
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/iconos") ||
    pathname === "/favicon.ico" ||
    RUTAS_PUBLICAS.some((ruta) => pathname.startsWith(ruta))
  ) {
    return NextResponse.next();
  }

  // Comprobar cookies de sesión de Auth.js
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    const url = new URL("/ingresar", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
