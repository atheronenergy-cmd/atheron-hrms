import { prisma } from "@/infrastructure/database/prisma-client";
import { passwordPolicyService } from "@/modules/security/application/password-policy.service";
import { AUTH_CONFIG } from "@/shared/constants/auth";

export class SessionSecurityService {
  async enforceConcurrentSessionLimit(userId: string, companyId: string | null, maxSessions: number) {
    const active = await prisma.session.findMany({
      where: { userId, expires: { gt: new Date() } },
      orderBy: { lastActivityAt: "asc" },
    });

    if (active.length < maxSessions) return;

    const toRemove = active.slice(0, active.length - maxSessions + 1);
    await prisma.session.deleteMany({
      where: { id: { in: toRemove.map((s) => s.id) } },
    });
  }

  async getSessionMaxAgeSeconds(companyId: string | null, rememberMe: boolean): Promise<number> {
    if (rememberMe) return AUTH_CONFIG.sessionRememberMaxAgeSeconds;
    const policy = await passwordPolicyService.getPolicy(companyId);
    return policy.sessionTimeoutMinutes * 60;
  }

  async validateSessionSecurity(sessionToken: string): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: { select: { companyId: true, status: true } } },
    });

    if (!session) return { valid: false, reason: "session_not_found" };
    if (session.expires < new Date()) return { valid: false, reason: "session_expired" };
    if (session.user.status !== "active") return { valid: false, reason: "user_inactive" };

    const policy = await passwordPolicyService.getPolicy(session.user.companyId);
    const idleLimitMs = policy.sessionTimeoutMinutes * 60 * 1000;
    const idleMs = Date.now() - session.lastActivityAt.getTime();
    if (idleMs > idleLimitMs) {
      await prisma.session.delete({ where: { id: session.id } });
      return { valid: false, reason: "session_idle_timeout" };
    }

    return { valid: true };
  }

  async forceLogoutUser(userId: string): Promise<number> {
    const result = await prisma.session.deleteMany({ where: { userId } });
    return result.count;
  }

  async forceLogoutSession(sessionToken: string): Promise<boolean> {
    const result = await prisma.session.deleteMany({ where: { sessionToken } });
    return result.count > 0;
  }
}

export const sessionSecurityService = new SessionSecurityService();
