import { createHash } from "crypto";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";

export function computeContentHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export class PayrollGovernanceAuditService extends BaseRepository {
  async record(params: {
    entityType: string;
    entityId?: string;
    action: string;
    actorUserId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.payrollGovernanceAuditLog.create({
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
    return prisma.payrollGovernanceAuditLog.findMany({
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

export function createPayrollGovernanceAuditService(companyId: string) {
  return new PayrollGovernanceAuditService(companyId);
}
