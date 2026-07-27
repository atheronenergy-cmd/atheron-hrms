import NextAuth from "next-auth";

import { authConfig } from "@/infrastructure/auth/auth.config";
import { recordAuthAudit } from "@/infrastructure/auth/auth-audit.service";
import { credentialsProvider } from "@/infrastructure/auth/credentials.provider";
import { twoFactorProvider } from "@/infrastructure/auth/two-factor.provider";
import { prisma } from "@/infrastructure/database/prisma-client";
import { sessionSecurityService } from "@/modules/security/application/session-security.service";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [credentialsProvider, twoFactorProvider],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.companyId = (user as { companyId?: string | null }).companyId ?? null;
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null;
        token.sessionToken = (user as { sessionToken?: string }).sessionToken;
      }

      if (token.sessionToken && typeof token.sessionToken === "string") {
        const validation = await sessionSecurityService.validateSessionSecurity(
          token.sessionToken,
        );

        if (!validation.valid) {
          await prisma.session.deleteMany({ where: { sessionToken: token.sessionToken } });
          return null as unknown as typeof token;
        }

        const dbSession = await prisma.session.findUnique({
          where: { sessionToken: token.sessionToken },
        });

        if (!dbSession) {
          return null as unknown as typeof token;
        }

        if (trigger === "update") {
          await prisma.session.update({
            where: { sessionToken: token.sessionToken },
            data: { lastActivityAt: new Date() },
          });
        }
      }

      return token;
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.sessionToken) {
        await prisma.session.deleteMany({
          where: { sessionToken: message.token.sessionToken as string },
        });
        await recordAuthAudit("logout", {
          userId: message.token.id as string,
        });
      }
    },
  },
});
