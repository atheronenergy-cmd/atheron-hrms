import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createLoanAuditService } from "@/modules/loan-recovery/application/loan-audit.service";
import type { LoanPolicyEligibility } from "@/modules/loan-recovery/domain/types";
import type { salaryAdvanceSchema } from "@/modules/loan-recovery/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import type { z } from "zod";

function advanceNumber() {
  return `ADV-${Date.now().toString().slice(-8)}`;
}

export class SalaryAdvanceService extends BaseRepository {
  async list(params?: { employeeId?: string; status?: string }) {
    const companyId = this.requireCompanyId();
    return prisma.salaryAdvance.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(params?.employeeId ? { employeeId: params.employeeId } : {}),
        ...(params?.status ? { status: params.status as never } : {}),
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string) {
    const row = await prisma.salaryAdvance.findFirst({
      where: { id, companyId: this.requireCompanyId(), deletedAt: null },
      include: { recoveries: { orderBy: { recoveredAt: "desc" }, take: 20 } },
    });
    if (!row) throw new NotFoundError("Salary advance", id);
    return row;
  }

  async create(input: z.infer<typeof salaryAdvanceSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    await this.validatePolicy(input);

    const installmentAmount = Math.round((input.amount / input.installmentCount) * 100) / 100;
    const row = await prisma.salaryAdvance.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        advanceNumber: advanceNumber(),
        advanceType: input.advanceType,
        amount: input.amount,
        outstandingBalance: input.amount,
        recoveryStartDate: new Date(input.recoveryStartDate),
        recoveryMode: input.recoveryMode,
        installmentCount: input.installmentCount,
        installmentAmount,
        status: "draft",
        remarks: input.remarks ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await createLoanAuditService(companyId).record({
      entityType: "salary_advance",
      entityId: row.id,
      action: "advance_created",
      actorUserId,
      metadata: { advanceNumber: row.advanceNumber, amount: input.amount },
    });

    return row;
  }

  async approve(advanceId: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const advance = await this.getById(advanceId);
    if (!["submitted", "manager_approved", "hr_approved"].includes(advance.status)) {
      throw new BusinessRuleError("Advance is not pending approval");
    }

    const updated = await prisma.salaryAdvance.update({
      where: { id: advanceId },
      data: { status: "active", updatedBy: actorUserId, version: { increment: 1 } },
    });

    await createLoanAuditService(companyId).record({
      entityType: "salary_advance",
      entityId: advanceId,
      action: "advance_approved",
      actorUserId,
    });

    return updated;
  }

  async submit(advanceId: string, actorUserId?: string) {
    const advance = await this.getById(advanceId);
    if (advance.status !== "draft") throw new BusinessRuleError("Only draft advances can be submitted");
    return prisma.salaryAdvance.update({
      where: { id: advanceId },
      data: { status: "submitted", updatedBy: actorUserId, version: { increment: 1 } },
    });
  }

  async reject(advanceId: string, actorUserId?: string, remarks?: string) {
    const companyId = this.requireCompanyId();
    const updated = await prisma.salaryAdvance.update({
      where: { id: advanceId },
      data: { status: "rejected", remarks: remarks ?? null, updatedBy: actorUserId, version: { increment: 1 } },
    });
    await createLoanAuditService(companyId).record({
      entityType: "salary_advance",
      entityId: advanceId,
      action: "advance_rejected",
      actorUserId,
    });
    return updated;
  }

  private async validatePolicy(input: z.infer<typeof salaryAdvanceSchema>) {
    const companyId = this.requireCompanyId();
    const policy = await prisma.loanPolicy.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: "active",
        effectiveFrom: { lte: new Date() },
      },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!policy?.maxAdvanceAmount) return;
    if (input.amount > Number(policy.maxAdvanceAmount)) {
      throw new BusinessRuleError(`Advance amount exceeds policy maximum of ${policy.maxAdvanceAmount}`);
    }

    const eligibility = policy.eligibilityRules as LoanPolicyEligibility;
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId, deletedAt: null },
      select: { departmentId: true, designationId: true, employmentType: true },
    });
    if (!employee) throw new NotFoundError("Employee", input.employeeId);
    if (eligibility.departmentIds?.length && !eligibility.departmentIds.includes(employee.departmentId)) {
      throw new BusinessRuleError("Employee department is not eligible for advance");
    }
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createSalaryAdvanceService(companyId: string) {
  return new SalaryAdvanceService(companyId);
}
