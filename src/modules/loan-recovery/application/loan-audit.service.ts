import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";

export class LoanAuditService extends BaseRepository {
  async record(params: {
    entityType: string;
    entityId?: string;
    action: string;
    actorUserId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const companyId = this.requireCompanyId();
    return prisma.loanAuditLog.create({
      data: {
        companyId,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        action: params.action,
        actorUserId: params.actorUserId ?? null,
        metadata: (params.metadata ?? {}) as object,
      },
    });
  }

  async listRecent(limit = 10) {
    const companyId = this.requireCompanyId();
    return prisma.loanAuditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLoanAuditService(companyId: string) {
  return new LoanAuditService(companyId);
}
