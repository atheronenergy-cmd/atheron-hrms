import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { EmployeeTimelineItem } from "@/modules/employee/domain/types";

export class EmployeeTimelineService extends BaseRepository {
  async record(params: {
    employeeId: string;
    eventType: string;
    title: string;
    description?: string;
    actorUserId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const companyId = this.requireCompanyId();
    await prisma.employeeTimelineEvent.create({
      data: {
        companyId,
        employeeId: params.employeeId,
        eventType: params.eventType,
        title: params.title,
        description: params.description ?? null,
        metadata: (params.metadata ?? {}) as object,
        createdBy: params.actorUserId ?? null,
      },
    });
  }

  async list(employeeId: string): Promise<EmployeeTimelineItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.employeeTimelineEvent.findMany({
      where: { companyId, employeeId },
      orderBy: { occurredAt: "desc" },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      title: r.title,
      description: r.description,
      occurredAt: r.occurredAt.toISOString(),
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
    }));
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createEmployeeTimelineService(companyId?: string) {
  return new EmployeeTimelineService(companyId);
}
