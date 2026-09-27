import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { AdaptadorPrisma } from "./auth/adaptador";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: AdaptadorPrisma(),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "select_account",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 días
    updateAge: 24 * 60 * 60,    // 24 horas
  },
  pages: {
    signIn: "/ingresar",
    error: "/ingresar",
  },
  callbacks: {
    async signIn({ profile }) {
      // Rechazar si la cuenta de Google no tiene el correo verificado
      // (docs/acceso/acceso-roles.md §3.1 paso 2 y §5.2)
      if (profile && "email_verified" in profile) {
        return profile.email_verified === true;
      }
      return false;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;

      try {
        const ahora = new Date();
        const usuarioActualizado = await prisma.usuario.update({
          where: { id: user.id },
          data: {
            ultimoIngresoEn: ahora,
            nombre: user.name ?? undefined,
            imagen: user.image ?? undefined,
          },
          include: {
            membresias: {
              where: { estado: "activa" },
              select: { organizacionId: true },
            },
          },
        });

        // Registrar auditoría de ingreso si tiene membresía
        const orgId = usuarioActualizado.membresias[0]?.organizacionId;
        if (orgId) {
          await prisma.registroAuditoria.create({
            data: {
              organizacionId: orgId,
              usuarioId: user.id,
              entidad: "Usuario",
              entidadId: user.id,
              accion: "ingresar",
              despues: { correo: user.email, fecha: ahora.toISOString() },
            },
          });
        }
      } catch (error) {
        console.error("Error en evento signIn:", error);
      }
    },
  },
});
