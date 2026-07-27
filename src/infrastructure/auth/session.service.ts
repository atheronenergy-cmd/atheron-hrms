import { parseUserAgent } from "@/infrastructure/auth/client-info";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { SessionInfo } from "@/shared/constants/auth";

export async function getUserSessions(userId: string, currentSessionToken?: string): Promise<SessionInfo[]> {
  const sessions = await prisma.session.findMany({
    where: { userId, expires: { gt: new Date() } },
    orderBy: { lastActivityAt: "desc" },
  });

  return sessions.map((session) => ({
    id: session.id,
    sessionToken: session.sessionToken,
    deviceLabel: session.deviceLabel,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    location: session.location,
    isTrusted: session.isTrusted,
    lastActivityAt: session.lastActivityAt,
    createdAt: session.createdAt,
    expires: session.expires,
    isCurrent: currentSessionToken ? session.sessionToken === currentSessionToken : false,
  }));
}

export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  const result = await prisma.session.deleteMany({
    where: { id: sessionId, userId },
  });
  return result.count > 0;
}

export async function revokeAllSessions(userId: string, exceptSessionToken?: string): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      userId,
      ...(exceptSessionToken ? { sessionToken: { not: exceptSessionToken } } : {}),
    },
  });
  return result.count;
}

export async function touchSession(sessionToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { sessionToken, expires: { gt: new Date() } },
    data: { lastActivityAt: new Date() },
  });
}

export async function enrichSessionMetadata(
  sessionToken: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  const { deviceLabel } = parseUserAgent(userAgent);
  await prisma.session.updateMany({
    where: { sessionToken },
    data: {
      ipAddress,
      userAgent,
      deviceLabel,
      lastActivityAt: new Date(),
    },
  });
}
