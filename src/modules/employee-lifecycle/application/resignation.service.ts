import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { ResignationRecordItem } from "@/modules/employee-lifecycle/domain/types";
import { recordJourneyAndTimeline } from "@/modules/employee-lifecycle/application/lifecycle-audit.service";
import { createExitService } from "@/modules/employee-lifecycle/application/exit.service";
import { createWorkflowService } from "@/modules/employee-lifecycle/application/workflow.service";
import type { ResignationInput } from "@/modules/employee-lifecycle/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class ResignationService extends BaseRepository {
  async listByEmployee(employeeId: string): Promise<ResignationRecordItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.resignationRecord.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { resignationDate: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      resignationDate: r.resignationDate.toISOString().slice(0, 10),
      lastWorkingDate: r.lastWorkingDate.toISOString().slice(0, 10),
      reason: r.reason,
      noticePeriodDays: r.noticePeriodDays,
      approvalStatus: r.approvalStatus,
      version: r.version,
    }));
  }

  async submit(input: ResignationInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await this.assertEmployee(input.employeeId, companyId);

    const row = await prisma.resignationRecord.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        resignationDate: input.resignationDate,
        lastWorkingDate: input.lastWorkingDate,
        reason: input.reason,
        reasonDetails: input.reasonDetails ?? null,
        noticePeriodDays: input.noticePeriodDays ?? emp.noticePeriodDays,
        approvalStatus: "submitted",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    const workflow = await createWorkflowService(companyId).create({
      employeeId: input.employeeId,
      entityType: "resignation_record",
      entityId: row.id,
      title: "Resignation approval",
      steps: [{ approverRole: "manager" }, { approverRole: "hr" }],
      actorUserId,
    });
    await createWorkflowService(companyId).submit(workflow.id, workflow.version, actorUserId);

    await prisma.employee.update({
      where: { id: input.employeeId, version: emp.version },
      data: { employmentStatus: "on_notice", updatedBy: actorUserId, version: { increment: 1 } },
    });

    await prisma.lifecycleNotification.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        type: "approval_pending",
        title: "Resignation pending approval",
        message: "Manager approval required for resignation.",
        metadata: { resignationId: row.id } as object,
      },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId: input.employeeId,
      stage: "resignation",
      eventType: "resignation_submitted",
      title: "Resignation submitted",
      description: input.reasonDetails ?? input.reason,
      entityType: "resignation_record",
      entityId: row.id,
      actorUserId,
    });

    return row;
  }

  async processAction(id: string, version: number, action: "manager_approve" | "hr_process" | "start_clearance" | "final_release" | "reject", actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.resignationRecord.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!existing) throw new NotFoundError("Resignation record", id);

    const statusMap = {
      manager_approve: "manager_approved",
      hr_process: "hr_processing",
      start_clearance: "exit_clearance",
      final_release: "final_release",
      reject: "rejected",
    } as const;

    const updated = await prisma.resignationRecord.update({
      where: { id, version },
      data: {
        approvalStatus: statusMap[action],
        managerApprovedBy: action === "manager_approve" ? actorUserId : existing.managerApprovedBy,
        hrProcessedBy: action === "hr_process" ? actorUserId : existing.hrProcessedBy,
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    if (action === "start_clearance") {
      await createExitService(companyId).initClearance(existing.employeeId, actorUserId, { resignationRecordId: updated.id });
    }

    if (action === "final_release") {
      await createExitService(companyId).finalizeExit(existing.employeeId, existing.lastWorkingDate, actorUserId);
    }

    if (action === "reject") {
      return updated;
    }

    return updated;
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

export function createResignationService(companyId: string) {
  return new ResignationService(companyId);
}
