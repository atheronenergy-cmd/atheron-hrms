import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { SuspensionRecordItem } from "@/modules/employee-lifecycle/domain/types";
import { recordJourneyAndTimeline } from "@/modules/employee-lifecycle/application/lifecycle-audit.service";
import type { SuspensionInput } from "@/modules/employee-lifecycle/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class SuspensionService extends BaseRepository {
  async listByEmployee(employeeId: string): Promise<SuspensionRecordItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.suspensionRecord.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { startDate: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate?.toISOString().slice(0, 10) ?? null,
      reason: r.reason,
      status: r.status,
      version: r.version,
    }));
  }

  async suspend(input: SuspensionInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await this.assertEmployee(input.employeeId, companyId);

    const row = await prisma.suspensionRecord.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        reason: input.reason,
        approvedBy: actorUserId,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await prisma.employee.update({
      where: { id: input.employeeId, version: emp.version },
      data: { employmentStatus: "suspended", updatedBy: actorUserId, version: { increment: 1 } },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId: input.employeeId,
      stage: "suspension",
      eventType: "suspended",
      title: "Employee suspended",
      description: input.reason,
      entityType: "suspension_record",
      entityId: row.id,
      actorUserId,
    });

    return row;
  }

  private async assertEmployee(employeeId: string, companyId: string) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
    if (!employee) throw new NotFoundError("Employee", employeeId);
    return employee;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createSuspensionService(companyId: string) {
  return new SuspensionService(companyId);
}
