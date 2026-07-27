import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { ConfirmationRecordItem } from "@/modules/employee-lifecycle/domain/types";
import { recordJourneyAndTimeline } from "@/modules/employee-lifecycle/application/lifecycle-audit.service";
import { createWorkflowService } from "@/modules/employee-lifecycle/application/workflow.service";
import type { ConfirmationInput } from "@/modules/employee-lifecycle/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class ConfirmationService extends BaseRepository {
  async listByEmployee(employeeId: string): Promise<ConfirmationRecordItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.confirmationRecord.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { confirmationDate: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      confirmationDate: r.confirmationDate.toISOString().slice(0, 10),
      rating: r.rating ? Number(r.rating) : null,
      comments: r.comments,
      version: r.version,
    }));
  }

  async confirm(input: ConfirmationInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await this.assertEmployee(input.employeeId, companyId);

    const row = await prisma.confirmationRecord.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        confirmationDate: input.confirmationDate,
        approvedBy: actorUserId,
        rating: input.rating ?? null,
        comments: input.comments ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await createWorkflowService(companyId).create({
      employeeId: input.employeeId,
      entityType: "confirmation_record",
      entityId: row.id,
      title: "Employee Confirmation",
      steps: [{ approverRole: "manager" }, { approverRole: "hr" }],
      actorUserId,
    });

    await prisma.employee.update({
      where: { id: input.employeeId },
      data: {
        confirmationDate: input.confirmationDate,
        employmentStatus: "active",
        probationStatus: "completed",
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await prisma.lifecycleNotification.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        type: "confirmation_pending",
        title: "Confirmation pending approval",
        message: "Manager and HR approval required for confirmation.",
        metadata: { confirmationId: row.id } as object,
      },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId: input.employeeId,
      stage: "confirmation",
      eventType: "confirmed",
      title: "Employee confirmed",
      description: input.comments ?? undefined,
      entityType: "confirmation_record",
      entityId: row.id,
      actorUserId,
      metadata: { rating: input.rating },
    });

    await prisma.probationRecord.updateMany({
      where: { companyId, employeeId: input.employeeId, status: "running", deletedAt: null },
      data: { status: "completed", updatedBy: actorUserId },
    });

    return row;
  }

  private async assertEmployee(employeeId: string, companyId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
      include: { department: { select: { name: true } }, designation: { select: { name: true } } },
    });
    if (!employee) throw new NotFoundError("Employee", employeeId);
    return employee;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createConfirmationService(companyId: string) {
  return new ConfirmationService(companyId);
}
