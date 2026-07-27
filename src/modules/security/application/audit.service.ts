import type { Prisma } from "@prisma/client";

import { prisma } from "@/infrastructure/database/prisma-client";
import type { AuditAction, CreateAuditLogInput } from "@/shared/audit/audit-logger";

export type AuditQueryFilters = {
  companyId?: string;
  userId?: string;
  entityType?: string;
  action?: AuditAction;
  page?: number;
  pageSize?: number;
};

export class AuditService {
  async persist(entry: CreateAuditLogInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        companyId: entry.companyId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValues: (entry.oldValues ?? undefined) as Prisma.InputJsonValue | undefined,
        newValues: (entry.newValues ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        requestId: entry.requestId,
        metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async list(filters: AuditQueryFilters) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 25, 100);
    const where = {
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.action ? { action: filters.action } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async logSensitiveView(params: {
    userId: string;
    companyId?: string;
    entityType: string;
    entityId?: string;
    field?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await this.persist({
      userId: params.userId,
      companyId: params.companyId,
      action: "view",
      entityType: params.entityType,
      entityId: params.entityId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { field: params.field, sensitive: true },
    });
  }
}

export const auditService = new AuditService();
