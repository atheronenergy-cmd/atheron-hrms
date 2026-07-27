import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { SalaryRevisionItem } from "@/modules/employee-lifecycle/domain/types";
import { recordJourneyAndTimeline } from "@/modules/employee-lifecycle/application/lifecycle-audit.service";
import type { SalaryRevisionInput } from "@/modules/employee-lifecycle/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class SalaryRevisionService extends BaseRepository {
  async listByEmployee(employeeId: string): Promise<SalaryRevisionItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.salaryRevisionHistory.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { effectiveDate: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      previousSalary: Number(r.previousSalary),
      newSalary: Number(r.newSalary),
      effectiveDate: r.effectiveDate.toISOString().slice(0, 10),
      reason: r.reason,
      revisionType: r.revisionType,
      version: r.version,
    }));
  }

  async recordRevision(input: SalaryRevisionInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    const latestSalary = await prisma.employeeSalary.findFirst({
      where: { employeeId: input.employeeId, status: "active" },
      orderBy: { effectiveFrom: "desc" },
    });
    const previousSalary = latestSalary ? Number(latestSalary.baseSalary) : 0;

    const row = await prisma.salaryRevisionHistory.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        previousSalary,
        newSalary: input.newSalary,
        effectiveDate: input.effectiveDate,
        reason: input.reason ?? null,
        revisionType: input.revisionType ?? null,
        approvedBy: actorUserId,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId: input.employeeId,
      stage: "increment",
      eventType: "salary_updated",
      title: "Salary revised",
      description: input.reason ?? undefined,
      entityType: "salary_revision_history",
      entityId: row.id,
      actorUserId,
      metadata: { previousSalary, newSalary: input.newSalary, revisionType: input.revisionType },
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

export function createSalaryRevisionService(companyId: string) {
  return new SalaryRevisionService(companyId);
}
