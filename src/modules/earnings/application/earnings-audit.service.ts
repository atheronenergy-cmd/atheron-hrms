import { prisma } from "@/infrastructure/database/prisma-client";

export class EarningsAuditService {
  constructor(private readonly companyId: string) {}

  async log(entityType: string, entityId: string | null, action: string, actorUserId?: string, metadata?: Record<string, unknown>) {
    return prisma.earningsAuditLog.create({
      data: {
        companyId: this.companyId,
        entityType,
        entityId: entityId ?? undefined,
        action,
        actorUserId,
        metadata: (metadata ?? {}) as object,
      },
    });
  }

  async listRecent(limit = 20) {
    return prisma.earningsAuditLog.findMany({
      where: { companyId: this.companyId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export function createEarningsAuditService(companyId: string) {
  return new EarningsAuditService(companyId);
}
