import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { WarningRecordItem } from "@/modules/employee-lifecycle/domain/types";
import { recordJourneyAndTimeline } from "@/modules/employee-lifecycle/application/lifecycle-audit.service";
import type { WarningInput } from "@/modules/employee-lifecycle/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class WarningService extends BaseRepository {
  async listByEmployee(employeeId: string): Promise<WarningRecordItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.warningRecord.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { issuedDate: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      warningType: r.warningType,
      reason: r.reason,
      issuedDate: r.issuedDate.toISOString().slice(0, 10),
      status: r.status,
      version: r.version,
    }));
  }

  async issue(input: WarningInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    const row = await prisma.warningRecord.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        warningType: input.warningType,
        reason: input.reason,
        description: input.description ?? null,
        issuedDate: input.issuedDate,
        issuedBy: actorUserId,
        createdBy: actorUserId,
      },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId: input.employeeId,
      stage: "warning",
      eventType: "warning_issued",
      title: "Warning issued",
      description: input.reason,
      entityType: "warning_record",
      entityId: row.id,
      actorUserId,
      metadata: { warningType: input.warningType },
    });

    return row;
  }

  private async assertEmployee(employeeId: string, companyId: string) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
    if (!employee) throw new NotFoundError("Employee", employeeId);
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createWarningService(companyId: string) {
  return new WarningService(companyId);
}
