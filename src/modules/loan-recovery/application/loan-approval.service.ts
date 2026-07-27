import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createEMIScheduleService } from "@/modules/loan-recovery/application/emi-schedule.service";
import { createLoanAuditService } from "@/modules/loan-recovery/application/loan-audit.service";
import { APPROVAL_TRANSITIONS } from "@/modules/loan-recovery/domain/types";
import type { loanApprovalActionSchema } from "@/modules/loan-recovery/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class LoanApprovalService extends BaseRepository {
  async processAction(input: z.infer<typeof loanApprovalActionSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const loan = await prisma.employeeLoan.findFirst({
      where: { id: input.loanId, companyId, deletedAt: null },
    });
    if (!loan) throw new NotFoundError("Employee loan", input.loanId);

    switch (input.action) {
      case "submit":
        if (loan.status !== "draft") throw new BusinessRuleError("Only draft loans can be submitted");
        await prisma.employeeLoan.update({
          where: { id: loan.id },
          data: { status: "submitted", updatedBy: actorUserId, version: { increment: 1 } },
        });
        await prisma.loanApproval.create({
          data: {
            companyId,
            employeeLoanId: loan.id,
            approvalLevel: "manager",
            status: "submitted",
            approverUserId: actorUserId,
          },
        });
        break;
      case "approve": {
        const level = input.approvalLevel ?? "manager";
        const nextStatus = APPROVAL_TRANSITIONS[level];
        if (!nextStatus) throw new BusinessRuleError("Invalid approval level");
        const finalStatus = level === "finance" ? "approved" : nextStatus;
        await prisma.employeeLoan.update({
          where: { id: loan.id },
          data: { status: finalStatus, updatedBy: actorUserId, version: { increment: 1 } },
        });
        await prisma.loanApproval.create({
          data: {
            companyId,
            employeeLoanId: loan.id,
            approvalLevel: level,
            status: finalStatus as never,
            approverUserId: actorUserId,
            approvedAt: new Date(),
            remarks: input.remarks ?? null,
          },
        });
        if (finalStatus === "approved") {
          await createLoanAuditService(companyId).record({
            entityType: "employee_loan",
            entityId: loan.id,
            action: "loan_approved",
            actorUserId,
          });
        }
        break;
      }
      case "reject":
        await prisma.employeeLoan.update({
          where: { id: loan.id },
          data: { status: "rejected", remarks: input.remarks ?? loan.remarks, updatedBy: actorUserId, version: { increment: 1 } },
        });
        await createLoanAuditService(companyId).record({
          entityType: "employee_loan",
          entityId: loan.id,
          action: "loan_rejected",
          actorUserId,
        });
        break;
      case "cancel":
        await prisma.employeeLoan.update({
          where: { id: loan.id },
          data: { status: "cancelled", updatedBy: actorUserId, version: { increment: 1 } },
        });
        break;
    }

    return prisma.employeeLoan.findFirst({ where: { id: loan.id }, include: { approvals: true } });
  }

  async activateApprovedLoan(loanId: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const loan = await prisma.employeeLoan.findFirst({ where: { id: loanId, companyId } });
    if (!loan || loan.status !== "approved") throw new BusinessRuleError("Loan must be approved");
    const updated = await prisma.employeeLoan.update({
      where: { id: loanId },
      data: {
        status: "active",
        disbursementDate: loan.disbursementDate ?? new Date(),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
    await createEMIScheduleService(companyId).generateForLoan(loanId, actorUserId);
    return updated;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLoanApprovalService(companyId: string) {
  return new LoanApprovalService(companyId);
}
