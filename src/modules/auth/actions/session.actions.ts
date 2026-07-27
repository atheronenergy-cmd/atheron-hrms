"use server";

import { redirect } from "next/navigation";

import { auth, signOut } from "@/infrastructure/auth/auth";
import { recordAuthAudit } from "@/infrastructure/auth/auth-audit.service";
import { revokeAllSessions, revokeSession } from "@/infrastructure/auth/session.service";
import { AUTH_ROUTES } from "@/shared/constants/auth";

export type SessionActionResult = {
  success: boolean;
  message: string;
};

export async function logoutAction() {
  const session = await auth();
  if (session?.user?.id) {
    await recordAuthAudit("logout", {
      userId: session.user.id,
      companyId: session.user.companyId,
    });
  }
  await signOut({ redirectTo: AUTH_ROUTES.login });
}

export async function logoutAllSessionsAction(): Promise<SessionActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Not authenticated." };
  }

  const count = await revokeAllSessions(session.user.id, session.sessionToken);
  await recordAuthAudit("logout_all", {
    userId: session.user.id,
    companyId: session.user.companyId,
    metadata: { revokedCount: count },
  });

  await signOut({ redirectTo: AUTH_ROUTES.login });
  return { success: true, message: "Signed out from all devices." };
}

export async function revokeSessionAction(sessionId: string): Promise<SessionActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Not authenticated." };
  }

  const { prisma } = await import("@/infrastructure/database/prisma-client");
  const targetSession = await prisma.session.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });

  if (!targetSession) {
    return { success: false, message: "Session not found." };
  }

  const isCurrentSession = targetSession.sessionToken === session.sessionToken;
  await revokeSession(sessionId, session.user.id);

  if (isCurrentSession) {
    await signOut({ redirectTo: AUTH_ROUTES.login });
  }

  return { success: true, message: "Session revoked." };
}

export async function redirectToSessions() {
  redirect(AUTH_ROUTES.sessions);
}
