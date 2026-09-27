import type {
  Adapter,
  AdapterUser,
  AdapterAccount,
  AdapterSession,
} from "@auth/core/adapters";
import { prisma } from "../db";

/**
 * Adaptador personalizado de Auth.js para el modelo de dominio en español
 * (Usuario, Account, Session) según docs/acceso/acceso-roles.md §5.1 y §5.2.
 */
export function AdaptadorPrisma(): Adapter {
  return {
    async createUser(data: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const emailNormalizado = data.email.toLowerCase().trim();
      const usuario = await prisma.usuario.create({
        data: {
          correo: emailNormalizado,
          nombre: data.name ?? null,
          imagen: data.image ?? null,
          correoVerificadoEn: data.emailVerified ?? null,
        },
      });

      return {
        id: usuario.id,
        email: usuario.correo,
        emailVerified: usuario.correoVerificadoEn,
        name: usuario.nombre,
        image: usuario.imagen,
      };
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const usuario = await prisma.usuario.findUnique({
        where: { id },
      });
      if (!usuario) return null;

      return {
        id: usuario.id,
        email: usuario.correo,
        emailVerified: usuario.correoVerificadoEn,
        name: usuario.nombre,
        image: usuario.imagen,
      };
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const emailNormalizado = email.toLowerCase().trim();
      const usuario = await prisma.usuario.findUnique({
        where: { correo: emailNormalizado },
      });
      if (!usuario) return null;

      return {
        id: usuario.id,
        email: usuario.correo,
        emailVerified: usuario.correoVerificadoEn,
        name: usuario.nombre,
        image: usuario.imagen,
      };
    },

    async getUserByAccount({
      provider,
      providerAccountId,
    }: {
      provider: string;
      providerAccountId: string;
    }): Promise<AdapterUser | null> {
      const cuenta = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
        include: {
          usuario: true,
        },
      });

      if (!cuenta || !cuenta.usuario) return null;

      return {
        id: cuenta.usuario.id,
        email: cuenta.usuario.correo,
        emailVerified: cuenta.usuario.correoVerificadoEn,
        name: cuenta.usuario.nombre,
        image: cuenta.usuario.imagen,
      };
    },

    async updateUser(data: Partial<AdapterUser> & { id: string }): Promise<AdapterUser> {
      const usuario = await prisma.usuario.update({
        where: { id: data.id },
        data: {
          nombre: data.name ?? undefined,
          imagen: data.image ?? undefined,
          correo: data.email ? data.email.toLowerCase().trim() : undefined,
          correoVerificadoEn: data.emailVerified ?? undefined,
        },
      });

      return {
        id: usuario.id,
        email: usuario.correo,
        emailVerified: usuario.correoVerificadoEn,
        name: usuario.nombre,
        image: usuario.imagen,
      };
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      // Descartamos access_token, refresh_token e id_token según docs/acceso/acceso-roles.md §5.1
      await prisma.account.create({
        data: {
          usuarioId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      });

      return account;
    },

    async createSession(data: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }): Promise<AdapterSession> {
      const sesion = await prisma.session.create({
        data: {
          sessionToken: data.sessionToken,
          usuarioId: data.userId,
          expires: data.expires,
        },
      });

      return {
        sessionToken: sesion.sessionToken,
        userId: sesion.usuarioId,
        expires: sesion.expires,
      };
    },

    async getSessionAndUser(
      sessionToken: string
    ): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const sesion = await prisma.session.findUnique({
        where: { sessionToken },
        include: {
          usuario: true,
        },
      });

      if (!sesion || !sesion.usuario) return null;

      return {
        session: {
          sessionToken: sesion.sessionToken,
          userId: sesion.usuarioId,
          expires: sesion.expires,
        },
        user: {
          id: sesion.usuario.id,
          email: sesion.usuario.correo,
          emailVerified: sesion.usuario.correoVerificadoEn,
          name: sesion.usuario.nombre,
          image: sesion.usuario.imagen,
        },
      };
    },

    async updateSession(
      data: Partial<AdapterSession> & { sessionToken: string }
    ): Promise<AdapterSession | null> {
      const sesion = await prisma.session.update({
        where: { sessionToken: data.sessionToken },
        data: {
          expires: data.expires,
          usuarioId: data.userId,
        },
      });

      return {
        sessionToken: sesion.sessionToken,
        userId: sesion.usuarioId,
        expires: sesion.expires,
      };
    },

    async deleteSession(sessionToken: string): Promise<AdapterSession | null> {
      try {
        const sesion = await prisma.session.delete({
          where: { sessionToken },
        });

        return {
          sessionToken: sesion.sessionToken,
          userId: sesion.usuarioId,
          expires: sesion.expires,
        };
      } catch {
        return null;
      }
    },
  };
}
