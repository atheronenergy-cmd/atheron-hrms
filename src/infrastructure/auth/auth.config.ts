import type { NextAuthConfig } from "next-auth";

import { AUTH_CONFIG, AUTH_ROUTES } from "@/shared/constants/auth";

/** Edge-compatible Auth.js config used by proxy (no Node.js / Prisma imports). */
export const authConfig = {
  pages: {
    signIn: AUTH_ROUTES.login,
    error: AUTH_ROUTES.login,
  },
  session: {
    strategy: "jwt",
    maxAge: AUTH_CONFIG.sessionMaxAgeSeconds,
    updateAge: 60 * 15,
  },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.companyId = (user as { companyId?: string | null }).companyId ?? null;
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null;
        token.sessionToken = (user as { sessionToken?: string }).sessionToken;
      }
      return token;
    },
    session({ session, token }) {
      if (!token?.id || typeof token.id !== "string") return session;

      session.user.id = token.id;
      session.user.companyId =
        typeof token.companyId === "string" || token.companyId === null ? token.companyId : null;
      session.user.emailVerified =
        token.emailVerified instanceof Date || token.emailVerified === null
          ? token.emailVerified
          : null;
      if (typeof token.sessionToken === "string") {
        session.sessionToken = token.sessionToken;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      companyId: string | null;
      emailVerified: Date | null;
    };
    sessionToken?: string;
  }

  interface User {
    companyId?: string | null;
    emailVerified?: Date | null;
    sessionToken?: string;
  }
}
