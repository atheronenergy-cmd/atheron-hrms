import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { PromotionRecordItem } from "@/modules/employee-lifecycle/domain/types";
import { recordJourneyAndTimeline } from "@/modules/employee-lifecycle/application/lifecycle-audit.service";
import { createWorkflowService } from "@/modules/employee-lifecycle/application/workflow.service";
import type { PromotionInput } from "@/modules/employee-lifecycle/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class PromotionService extends BaseRepository {
  async listByEmployee(employeeId: string): Promise<PromotionRecordItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.promotionRecord.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { promotionDate: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      previousDesignation: r.previousDesignation,
      newDesignation: r.newDesignation,
      promotionDate: r.promotionDate.toISOString().slice(0, 10),
      reason: r.reason,
      comments: r.comments,
      version: r.version,
    }));
  }

  async promote(input: PromotionInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await this.assertEmployee(input.employeeId, companyId);
    const newDesignation = await prisma.designation.findFirst({
      where: { id: input.newDesignationId, companyId },
    });
    if (!newDesignation) throw new NotFoundError("Designation", input.newDesignationId);

    const row = await prisma.promotionRecord.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        previousDesignation: emp.designation.name,
        newDesignation: newDesignation.name,
        previousDesignationId: emp.designationId,
        newDesignationId: newDesignation.id,
        promotionDate: input.promotionDate,
        reason: input.reason ?? null,
        approvedBy: actorUserId,
        comments: input.comments ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await createWorkflowService(companyId).create({
      employeeId: input.employeeId,
      entityType: "promotion_record",
      entityId: row.id,
      title: "Promotion approval",
      steps: [{ approverRole: "manager" }, { approverRole: "hr" }],
      actorUserId,
    });

    await prisma.employee.update({
      where: { id: input.employeeId, version: emp.version },
      data: {
        designationId: newDesignation.id,
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId: input.employeeId,
      stage: "promotion",
      eventType: "promoted",
      title: "Employee promoted",
      description: `${emp.designation.name} → ${newDesignation.name}`,
      entityType: "promotion_record",
      entityId: row.id,
      actorUserId,
    });

    return row;
  }

  private async assertEmployee(employeeId: string, companyId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
      include: { designation: { select: { id: true, name: true } } },
    });
    if (!employee) throw new NotFoundError("Employee", employeeId);
    return employee;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPromotionService(companyId: string) {
  return new PromotionService(companyId);
}
