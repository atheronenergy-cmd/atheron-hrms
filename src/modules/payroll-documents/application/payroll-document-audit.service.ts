import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";

export class PayrollDocumentAuditService extends BaseRepository {
  async record(params: {
    entityType: string;
    entityId?: string;
    action: string;
    actorUserId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.payrollDocumentAuditLog.create({
      data: {
        companyId: this.requireCompanyId(),
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        action: params.action,
        actorUserId: params.actorUserId ?? null,
        metadata: (params.metadata ?? {}) as object,
      },
    });
  }

  async listRecent(limit = 10) {
    return prisma.payrollDocumentAuditLog.findMany({
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

export function createPayrollDocumentAuditService(companyId: string) {
  return new PayrollDocumentAuditService(companyId);
}
