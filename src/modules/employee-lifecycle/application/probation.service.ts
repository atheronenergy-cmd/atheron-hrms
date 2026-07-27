import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { ProbationRecordItem } from "@/modules/employee-lifecycle/domain/types";
import { recordJourneyAndTimeline } from "@/modules/employee-lifecycle/application/lifecycle-audit.service";
import type { ProbationInput } from "@/modules/employee-lifecycle/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class ProbationService extends BaseRepository {
  async listByEmployee(employeeId: string): Promise<ProbationRecordItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.probationRecord.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { startDate: "desc" },
    });
    return rows.map((r) => this.toItem(r));
  }

  async create(input: ProbationInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    const durationDays = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const row = await prisma.probationRecord.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        startDate: input.startDate,
        endDate: input.endDate,
        durationDays,
        reviewerId: input.reviewerId ?? null,
        reviewNotes: input.reviewNotes ?? null,
        status: "running",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await prisma.employee.update({
      where: { id: input.employeeId },
      data: {
        employmentStatus: "probation",
        probationStatus: "running",
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await prisma.lifecycleNotification.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        type: "probation_ending_soon",
        title: "Probation ending soon",
        message: `Probation ends on ${input.endDate.toISOString().slice(0, 10)}`,
        dueDate: input.endDate,
        metadata: { probationId: row.id } as object,
      },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId: input.employeeId,
      stage: "probation",
      eventType: "probation_started",
      title: "Probation started",
      description: `${input.startDate.toISOString().slice(0, 10)} to ${input.endDate.toISOString().slice(0, 10)}`,
      entityType: "probation_record",
      entityId: row.id,
      actorUserId,
    });

    return row;
  }

  async extend(id: string, version: number, extendedTo: Date, actorUserId: string, reviewNotes?: string, recommendation?: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.probationRecord.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!existing) throw new NotFoundError("Probation record", id);

    const row = await prisma.probationRecord.update({
      where: { id, version },
      data: {
        status: "extended",
        extendedTo,
        endDate: extendedTo,
        reviewNotes: reviewNotes ?? existing.reviewNotes,
        recommendation: recommendation ?? null,
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId: existing.employeeId,
      stage: "probation",
      eventType: "probation_extended",
      title: "Probation extended",
      description: `Extended to ${extendedTo.toISOString().slice(0, 10)}`,
      entityType: "probation_record",
      entityId: row.id,
      actorUserId,
    });

    return row;
  }

  async complete(id: string, version: number, status: "completed" | "failed", actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.probationRecord.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!existing) throw new NotFoundError("Probation record", id);

    return prisma.probationRecord.update({
      where: { id, version },
      data: { status, updatedBy: actorUserId, version: { increment: 1 } },
    });
  }

  private toItem(r: { id: string; employeeId: string; startDate: Date; endDate: Date; durationDays: number; status: string; reviewNotes: string | null; extendedTo: Date | null; recommendation: string | null; version: number }): ProbationRecordItem {
    return {
      id: r.id,
      employeeId: r.employeeId,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      durationDays: r.durationDays,
      status: r.status,
      reviewNotes: r.reviewNotes,
      extendedTo: r.extendedTo?.toISOString().slice(0, 10) ?? null,
      recommendation: r.recommendation,
      version: r.version,
    };
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

export function createProbationService(companyId: string) {
  return new ProbationService(companyId);
}
