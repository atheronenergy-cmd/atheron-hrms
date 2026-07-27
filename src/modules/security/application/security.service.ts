import { prisma } from "@/infrastructure/database/prisma-client";

export type SecurityDashboardStats = {
  activeSessions: number;
  failedLoginAttempts24h: number;
  lockedAccounts: number;
  twoFactorEnabledUsers: number;
  totalUsers: number;
  recentSecurityEvents: Awaited<ReturnType<SecurityService["getRecentEvents"]>>;
  loginActivity: { date: string; success: number; failure: number }[];
  deviceDistribution: { label: string; count: number }[];
};

export class SecurityService {
  async getDashboardStats(companyId?: string | null): Promise<SecurityDashboardStats> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const userWhere = companyId ? { companyId, deletedAt: null } : { deletedAt: null };

    const [
      activeSessions,
      failedLoginAttempts24h,
      lockedAccounts,
      twoFactorEnabledUsers,
      totalUsers,
      recentSecurityEvents,
      loginHistories,
      devices,
    ] = await Promise.all([
      prisma.session.count({
        where: {
          expires: { gt: new Date() },
          user: userWhere,
        },
      }),
      prisma.loginHistory.count({
        where: {
          success: false,
          createdAt: { gte: since24h },
          ...(companyId
            ? { user: { companyId } }
            : {}),
        },
      }),
      prisma.user.count({
        where: {
          ...userWhere,
          OR: [{ status: "locked" }, { lockedUntil: { gt: new Date() } }],
        },
      }),
      prisma.user.count({
        where: { ...userWhere, twoFactorEnabled: true },
      }),
      prisma.user.count({ where: userWhere }),
      this.getRecentEvents(companyId, 10),
      prisma.loginHistory.findMany({
        where: {
          createdAt: { gte: since7d },
          ...(companyId ? { user: { companyId } } : {}),
        },
        select: { success: true, createdAt: true },
      }),
      prisma.userDevice.findMany({
        where: companyId ? { user: { companyId } } : {},
        select: { os: true, browser: true },
      }),
    ]);

    const loginActivity = this.aggregateLoginActivity(loginHistories);
    const deviceDistribution = this.aggregateDevices(devices);

    return {
      activeSessions,
      failedLoginAttempts24h,
      lockedAccounts,
      twoFactorEnabledUsers,
      totalUsers,
      recentSecurityEvents,
      loginActivity,
      deviceDistribution,
    };
  }

  async getRecentEvents(companyId?: string | null, limit = 20) {
    return prisma.securityEvent.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async upsertSecurityPolicy(
    companyId: string,
    data: {
      requireTwoFactor: boolean;
      passwordMinLength: number;
      passwordRequireUpper: boolean;
      passwordRequireLower: boolean;
      passwordRequireNumber: boolean;
      passwordRequireSpecial: boolean;
      passwordExpiryDays: number | null;
      passwordHistoryCount: number;
      maxLoginAttempts: number;
      lockoutMinutes: number;
      sessionTimeoutMinutes: number;
      maxConcurrentSessions: number;
      ipAllowlist: string[];
      deviceRestrictions: boolean;
      updatedBy?: string;
    },
  ) {
    return prisma.securityPolicy.upsert({
      where: { companyId },
      create: { companyId, ...data },
      update: { ...data, version: { increment: 1 } },
    });
  }

  async getSecurityPolicy(companyId?: string | null) {
    if (!companyId) return null;
    return prisma.securityPolicy.findUnique({ where: { companyId } });
  }

  private aggregateLoginActivity(
    histories: { success: boolean; createdAt: Date }[],
  ): { date: string; success: number; failure: number }[] {
    const map = new Map<string, { success: number; failure: number }>();
    for (const h of histories) {
      const date = h.createdAt.toISOString().slice(0, 10);
      const entry = map.get(date) ?? { success: 0, failure: 0 };
      if (h.success) entry.success += 1;
      else entry.failure += 1;
      map.set(date, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));
  }

  private aggregateDevices(
    devices: { os: string | null; browser: string | null }[],
  ): { label: string; count: number }[] {
    const map = new Map<string, number>();
    for (const d of devices) {
      const label = d.os ?? "Unknown";
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
  }
}

export const securityService = new SecurityService();
