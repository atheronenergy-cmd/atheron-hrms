import { createLoanRecoveryOrchestratorService } from "@/modules/loan-recovery/application/loan-recovery-orchestrator.service";
import { createRecoveryService } from "@/modules/loan-recovery/application/recovery.service";
import type { RecoveryCalculationResult } from "@/modules/loan-recovery/domain/types";

export function createPayrollLoanRecoveryIntegrationService(companyId: string) {
  const orchestrator = createLoanRecoveryOrchestratorService(companyId);
  return {
    async calculate(params: {
      employeeId: string;
      periodStart: Date;
      periodEnd: Date;
    }): Promise<RecoveryCalculationResult> {
      return orchestrator.calculateForEmployee(params);
    },
  };
}

export async function persistRecoveryResults(params: {
  companyId: string;
  employeeId: string;
  payrollCalculationId: string;
  periodEnd: Date;
  recovery: RecoveryCalculationResult;
  actorUserId?: string;
}) {
  await createRecoveryService(params.companyId).persistPayrollRecovery({
    employeeId: params.employeeId,
    payrollCalculationId: params.payrollCalculationId,
    recovery: params.recovery,
    periodEnd: params.periodEnd,
    actorUserId: params.actorUserId,
  });
}
