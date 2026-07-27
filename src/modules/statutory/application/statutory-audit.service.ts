import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";

export class StatutoryAuditService extends BaseRepository {
  async log(entityType: string, entityId: string | null, action: string, actorUserId?: string, metadata?: Record<string, unknown>) {
    return prisma.statutoryAuditLog.create({
      data: {
        companyId: this.requireCompanyId(),
        entityType,
        entityId: entityId ?? undefined,
        action,
        actorUserId,
        metadata: metadata ?? {},
      },
    });
  }

  async listRecent(limit = 20) {
    return prisma.statutoryAuditLog.findMany({
      where: { companyId: this.requireCompanyId() },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createStatutoryAuditService(companyId: string) {
  return new StatutoryAuditService(companyId);
}
