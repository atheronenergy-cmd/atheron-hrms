import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createEmployeeLoanService } from "@/modules/loan-recovery/application/employee-loan.service";
import { createEMIScheduleService } from "@/modules/loan-recovery/application/emi-schedule.service";
import { createFinalSettlementRecoveryService } from "@/modules/loan-recovery/application/final-settlement-recovery.service";
import { createLoanApprovalService } from "@/modules/loan-recovery/application/loan-approval.service";
import { createLoanAuditService } from "@/modules/loan-recovery/application/loan-audit.service";
import {
  createLoanRecoveryOrchestratorService,
  createLoanReportService,
} from "@/modules/loan-recovery/application/loan-recovery-orchestrator.service";
import { createRecoveryService } from "@/modules/loan-recovery/application/recovery.service";
import { createSalaryAdvanceService } from "@/modules/loan-recovery/application/salary-advance.service";

export class LoanRecoveryModuleService extends BaseRepository {
  async listPolicies() {
    return prisma.loanPolicy.findMany({
      where: { companyId: this.requireCompanyId(), deletedAt: null },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  async createPolicy(input: {
    name: string;
    code: string;
    loanTypeId?: string;
    maxLoanAmount?: number;
    maxAdvanceAmount?: number;
    maxTenureMonths?: number;
    minServiceMonths?: number;
    interestRules?: Record<string, unknown>;
    eligibilityRules?: Record<string, unknown>;
    effectiveFrom: string;
    effectiveTo?: string;
  }, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const { interestRules, eligibilityRules, ...policyInput } = input;
    return prisma.loanPolicy.create({
      data: {
        companyId,
        ...policyInput,
        loanTypeId: input.loanTypeId ?? null,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        interestRules: interestRules as object | undefined,
        eligibilityRules: eligibilityRules as object | undefined,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function getLoanRecoveryServices(companyId: string) {
  return {
    module: new LoanRecoveryModuleService(companyId),
    loan: createEmployeeLoanService(companyId),
    advance: createSalaryAdvanceService(companyId),
    emi: createEMIScheduleService(companyId),
    recovery: createRecoveryService(companyId),
    approval: createLoanApprovalService(companyId),
    settlement: createFinalSettlementRecoveryService(companyId),
    orchestrator: createLoanRecoveryOrchestratorService(companyId),
    report: createLoanReportService(companyId),
    audit: createLoanAuditService(companyId),
  };
}
