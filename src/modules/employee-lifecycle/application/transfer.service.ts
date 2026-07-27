import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { TransferRecordItem } from "@/modules/employee-lifecycle/domain/types";
import { recordJourneyAndTimeline } from "@/modules/employee-lifecycle/application/lifecycle-audit.service";
import { createWorkflowService } from "@/modules/employee-lifecycle/application/workflow.service";
import type { TransferInput } from "@/modules/employee-lifecycle/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class TransferService extends BaseRepository {
  async listByEmployee(employeeId: string): Promise<TransferRecordItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.transferRecord.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { effectiveDate: "desc" },
    });
    return rows.map((r) => this.toItem(r));
  }

  async transfer(input: TransferInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await this.assertEmployee(input.employeeId, companyId);

    const previous = await this.resolvePrevious(emp, input.transferType);
    const row = await prisma.transferRecord.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        transferType: input.transferType,
        previousValue: previous.value,
        newValue: input.newValue,
        previousId: previous.id,
        newId: input.newId ?? null,
        effectiveDate: input.effectiveDate,
        reason: input.reason ?? null,
        approvedBy: actorUserId,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    const workflow = await createWorkflowService(companyId).create({
      employeeId: input.employeeId,
      entityType: "transfer_record",
      entityId: row.id,
      title: `${input.transferType} transfer`,
      steps: [{ approverRole: "manager" }, { approverRole: "hr" }],
      actorUserId,
    });
    await createWorkflowService(companyId).submit(workflow.id, workflow.version, actorUserId);

    await this.applyTransfer(emp, input, actorUserId);

    await recordJourneyAndTimeline(companyId, {
      employeeId: input.employeeId,
      stage: "transfer",
      eventType: "transferred",
      title: `${input.transferType} transfer`,
      description: `${previous.value} → ${input.newValue}`,
      entityType: "transfer_record",
      entityId: row.id,
      actorUserId,
      metadata: { transferType: input.transferType },
    });

    return row;
  }

  private async applyTransfer(
    emp: { id: string; branchId: string; departmentId: string; designationId: string; reportingManagerId: string | null; workLocation: string | null; version: number },
    input: TransferInput,
    actorUserId: string,
  ) {
    const data: Record<string, unknown> = { updatedBy: actorUserId, version: { increment: 1 } };
    if (input.transferType === "branch" && input.newId) data.branchId = input.newId;
    if (input.transferType === "department" && input.newId) data.departmentId = input.newId;
    if (input.transferType === "manager") data.reportingManagerId = input.newId ?? null;
    if (input.transferType === "location") data.workLocation = input.newValue;

    await prisma.employee.update({ where: { id: emp.id, version: emp.version }, data });
  }

  private async resolvePrevious(
    emp: { branch: { name: string }; department: { name: string }; reportingManager: { firstName: string; lastName: string } | null; workLocation: string | null; branchId: string; departmentId: string; reportingManagerId: string | null },
    transferType: TransferInput["transferType"],
  ) {
    switch (transferType) {
      case "branch":
        return { value: emp.branch.name, id: emp.branchId };
      case "department":
        return { value: emp.department.name, id: emp.departmentId };
      case "manager":
        return {
          value: emp.reportingManager ? `${emp.reportingManager.firstName} ${emp.reportingManager.lastName}` : "None",
          id: emp.reportingManagerId,
        };
      case "location":
        return { value: emp.workLocation ?? "—", id: null };
    }
  }

  private toItem(r: { id: string; employeeId: string; transferType: string; previousValue: string; newValue: string; effectiveDate: Date; reason: string | null; version: number }): TransferRecordItem {
    return {
      id: r.id,
      employeeId: r.employeeId,
      transferType: r.transferType,
      previousValue: r.previousValue,
      newValue: r.newValue,
      effectiveDate: r.effectiveDate.toISOString().slice(0, 10),
      reason: r.reason,
      version: r.version,
    };
  }

  private async assertEmployee(employeeId: string, companyId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
      include: {
        branch: { select: { name: true } },
        department: { select: { name: true } },
        reportingManager: { select: { firstName: true, lastName: true } },
      },
    });
    if (!employee) throw new NotFoundError("Employee", employeeId);
    return employee;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createTransferService(companyId: string) {
  return new TransferService(companyId);
}
