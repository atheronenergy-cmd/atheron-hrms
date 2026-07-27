import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createEMIScheduleService } from "@/modules/loan-recovery/application/emi-schedule.service";
import { createLoanAuditService } from "@/modules/loan-recovery/application/loan-audit.service";
import { calculateLoanSummary } from "@/modules/loan-recovery/application/loan-calculation.service";
import { recalculateAfterPrepayment } from "@/modules/loan-recovery/application/loan-calculation.service";
import { calculateForeclosureAmount } from "@/modules/loan-recovery/application/interest-calculation.service";
import type { LoanPolicyEligibility } from "@/modules/loan-recovery/domain/types";
import type { employeeLoanSchema, foreclosureSchema, loanTypeSchema } from "@/modules/loan-recovery/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import type { z } from "zod";

function loanNumber() {
  return `LOAN-${Date.now().toString().slice(-8)}`;
}

export class EmployeeLoanService extends BaseRepository {
  async listLoanTypes() {
    return prisma.loanType.findMany({
      where: { companyId: this.requireCompanyId(), deletedAt: null, status: "active" },
      orderBy: { name: "asc" },
    });
  }

  async createLoanType(input: z.infer<typeof loanTypeSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const row = await prisma.loanType.create({
      data: { companyId, ...input, createdBy: actorUserId, updatedBy: actorUserId },
    });
    await createLoanAuditService(companyId).record({
      entityType: "loan_type",
      entityId: row.id,
      action: "loan_type_created",
      actorUserId,
    });
    return row;
  }

  async list(params?: { employeeId?: string; status?: string }) {
    const companyId = this.requireCompanyId();
    return prisma.employeeLoan.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(params?.employeeId ? { employeeId: params.employeeId } : {}),
        ...(params?.status ? { status: params.status as never } : {}),
      },
      include: {
        loanType: { select: { name: true, code: true, category: true } },
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string) {
    const row = await prisma.employeeLoan.findFirst({
      where: { id, companyId: this.requireCompanyId(), deletedAt: null },
      include: {
        loanType: true,
        emiSchedules: { orderBy: { emiNumber: "asc" } },
        approvals: { orderBy: { createdAt: "asc" } },
        recoveries: { orderBy: { recoveredAt: "desc" }, take: 20 },
      },
    });
    if (!row) throw new NotFoundError("Employee loan", id);
    return row;
  }

  async create(input: z.infer<typeof employeeLoanSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    await this.validatePolicy(input);

    const loanType = await prisma.loanType.findFirst({
      where: { id: input.loanTypeId, companyId, deletedAt: null },
    });
    if (!loanType) throw new NotFoundError("Loan type", input.loanTypeId);

    const interestType = input.interestType ?? loanType.interestType;
    const interestRate = input.interestRate ?? Number(loanType.defaultRate);
    const summary = calculateLoanSummary({
      principal: input.principalAmount,
      interestType,
      interestRate,
      tenure: input.tenureMonths,
      recoveryMode: input.recoveryMode,
      startRecoveryDate: new Date(input.startRecoveryDate),
    });

    const row = await prisma.employeeLoan.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        loanTypeId: input.loanTypeId,
        loanNumber: loanNumber(),
        principalAmount: input.principalAmount,
        interestType,
        interestRate,
        tenureMonths: input.tenureMonths,
        installmentAmount: summary.installmentAmount,
        recoveryMode: input.recoveryMode,
        disbursementDate: input.disbursementDate ? new Date(input.disbursementDate) : null,
        startRecoveryDate: new Date(input.startRecoveryDate),
        outstandingBalance: summary.outstandingBalance,
        status: "draft",
        remarks: input.remarks ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await createLoanAuditService(companyId).record({
      entityType: "employee_loan",
      entityId: row.id,
      action: "loan_created",
      actorUserId,
      metadata: { loanNumber: row.loanNumber, amount: input.principalAmount },
    });

    return row;
  }

  async disburse(loanId: string, disbursementDate: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const loan = await this.getById(loanId);
    if (loan.status !== "approved") throw new BusinessRuleError("Loan must be approved before disbursement");

    const updated = await prisma.employeeLoan.update({
      where: { id: loanId },
      data: {
        status: "active",
        disbursementDate: new Date(disbursementDate),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await createEMIScheduleService(companyId).generateForLoan(loanId, actorUserId);
    await createLoanAuditService(companyId).record({
      entityType: "employee_loan",
      entityId: loanId,
      action: "loan_disbursed",
      actorUserId,
    });
    return updated;
  }

  async processForeclosure(input: z.infer<typeof foreclosureSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const loan = await this.getById(input.loanId);
    if (!["active", "approved"].includes(loan.status)) {
      throw new BusinessRuleError("Loan is not active for foreclosure");
    }

    const outstandingBefore = Number(loan.outstandingBalance);
    const payable = calculateForeclosureAmount(outstandingBefore, input.waivedAmount);
    if (input.amountPaid + 0.01 < payable && input.foreclosureType !== "partial_prepayment") {
      throw new BusinessRuleError(`Foreclosure requires at least ${payable}`);
    }

    const recovered = Math.min(input.amountPaid, outstandingBefore);
    const newOutstanding = Math.max(0, outstandingBefore - recovered - input.waivedAmount);
    const isFull = newOutstanding <= 0;

    await prisma.$transaction(async (tx) => {
      await tx.loanForeclosure.create({
        data: {
          companyId,
          employeeLoanId: loan.id,
          foreclosureType: input.foreclosureType,
          amountPaid: input.amountPaid,
          waivedAmount: input.waivedAmount,
          outstandingBefore,
          processedBy: actorUserId,
          remarks: input.remarks ?? null,
        },
      });

      await tx.loanRecovery.create({
        data: {
          companyId,
          employeeId: loan.employeeId,
          employeeLoanId: loan.id,
          recoveryType: isFull ? "foreclosure" : "prepayment",
          amount: recovered,
          createdBy: actorUserId,
        },
      });

      await tx.recoveryHistory.create({
        data: {
          companyId,
          employeeId: loan.employeeId,
          entityType: "loan",
          entityId: loan.id,
          recoveryType: isFull ? "foreclosure" : "prepayment",
          amount: recovered,
          balanceAfter: newOutstanding,
          createdBy: actorUserId,
        },
      });

      if (isFull) {
        await tx.loanEMISchedule.updateMany({
          where: { employeeLoanId: loan.id, status: { in: ["scheduled", "due", "overdue"] } },
          data: { status: "waived" },
        });
      } else {
        const pending = await tx.loanEMISchedule.count({
          where: { employeeLoanId: loan.id, status: { in: ["scheduled", "due", "overdue"] } },
        });
        const schedule = recalculateAfterPrepayment({
          outstandingBalance: newOutstanding,
          interestType: loan.interestType,
          interestRate: Number(loan.interestRate),
          remainingTenure: Math.max(1, pending),
          recoveryMode: loan.recoveryMode,
          startRecoveryDate: new Date(),
        });
        await tx.loanEMISchedule.deleteMany({
          where: { employeeLoanId: loan.id, status: { in: ["scheduled", "due", "overdue"] } },
        });
        await tx.loanEMISchedule.createMany({
          data: schedule.map((s) => ({
            companyId,
            employeeLoanId: loan.id,
            emiNumber: s.emiNumber + 1000,
            dueDate: s.dueDate,
            principalComponent: s.principalComponent,
            interestComponent: s.interestComponent,
            installmentAmount: s.installmentAmount,
            outstandingBalance: s.outstandingBalance,
            status: "scheduled" as const,
          })),
        });
      }

      await tx.employeeLoan.update({
        where: { id: loan.id },
        data: {
          outstandingBalance: newOutstanding,
          recoveredAmount: { increment: recovered },
          status: isFull ? "foreclosed" : "active",
          installmentAmount: isFull ? 0 : loan.installmentAmount,
          updatedBy: actorUserId,
          version: { increment: 1 },
        },
      });
    });

    await createLoanAuditService(companyId).record({
      entityType: "employee_loan",
      entityId: loan.id,
      action: "foreclosure_completed",
      actorUserId,
      metadata: { type: input.foreclosureType, amountPaid: input.amountPaid },
    });

    return this.getById(loan.id);
  }

  private async validatePolicy(input: z.infer<typeof employeeLoanSchema>) {
    const companyId = this.requireCompanyId();
    const policy = await prisma.loanPolicy.findFirst({
      where: {
        companyId,
        deletedAt: null,
        status: "active",
        effectiveFrom: { lte: new Date() },
        AND: [
          { OR: [{ loanTypeId: input.loanTypeId }, { loanTypeId: null }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }] },
        ],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    if (!policy) return;

    if (policy.maxLoanAmount && input.principalAmount > Number(policy.maxLoanAmount)) {
      throw new BusinessRuleError(`Loan amount exceeds policy maximum of ${policy.maxLoanAmount}`);
    }
    if (policy.maxTenureMonths && input.tenureMonths > policy.maxTenureMonths) {
      throw new BusinessRuleError(`Tenure exceeds policy maximum of ${policy.maxTenureMonths} months`);
    }

    const eligibility = policy.eligibilityRules as LoanPolicyEligibility;
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId, deletedAt: null },
      select: { departmentId: true, designationId: true, employmentType: true, dateOfJoining: true },
    });
    if (!employee) throw new NotFoundError("Employee", input.employeeId);

    if (eligibility.departmentIds?.length && !eligibility.departmentIds.includes(employee.departmentId)) {
      throw new BusinessRuleError("Employee department is not eligible for this loan policy");
    }
    if (eligibility.designationIds?.length && !eligibility.designationIds.includes(employee.designationId)) {
      throw new BusinessRuleError("Employee designation is not eligible for this loan policy");
    }
    if (eligibility.employmentTypes?.length && employee.employmentType && !eligibility.employmentTypes.includes(employee.employmentType)) {
      throw new BusinessRuleError("Employment type is not eligible for this loan policy");
    }
    const minMonths = eligibility.minServiceMonths ?? policy.minServiceMonths;
    if (minMonths) {
      const months =
        (new Date().getFullYear() - employee.dateOfJoining.getFullYear()) * 12 +
        (new Date().getMonth() - employee.dateOfJoining.getMonth());
      if (months < minMonths) throw new BusinessRuleError(`Minimum service period of ${minMonths} months required`);
    }
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createEmployeeLoanService(companyId: string) {
  return new EmployeeLoanService(companyId);
}
