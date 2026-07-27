import { prisma } from "@/infrastructure/database/prisma-client";
import { createStatutoryOrchestratorService } from "@/modules/statutory/application/statutory-orchestrator.service";
import type { StatutoryCalculationResult } from "@/modules/statutory/domain/types";

export function createPayrollStatutoryIntegrationService(companyId: string) {
  const orchestrator = createStatutoryOrchestratorService(companyId);

  return {
    async calculate(params: {
      employeeId: string;
      periodStart: Date;
      periodEnd: Date;
      basic: number;
      gross: number;
      ctc?: number;
    }): Promise<StatutoryCalculationResult> {
      return orchestrator.calculateForEmployee(params);
    },
  };
}

export async function persistStatutoryResults(params: {
  companyId: string;
  employeeId: string;
  payrollCalculationId: string;
  periodStart: Date;
  periodEnd: Date;
  statutory: StatutoryCalculationResult;
}) {
  const { statutory, payrollCalculationId, employeeId, companyId, periodStart, periodEnd } = params;
  const periodMonth = periodEnd.getMonth() + 1;
  const periodYear = periodEnd.getFullYear();

  if (statutory.financialYearId && statutory.taxComputation) {
    await prisma.taxComputation.upsert({
      where: { payrollCalculationId },
      create: {
        companyId,
        employeeId,
        payrollCalculationId,
        financialYearId: statutory.financialYearId,
        periodMonth,
        periodYear,
        taxRegime: statutory.taxComputation.regime,
        projectedAnnualIncome: statutory.taxComputation.projectedAnnualIncome,
        taxableIncome: statutory.taxComputation.taxableIncome,
        annualTax: statutory.taxComputation.annualTax,
        monthlyTds: statutory.taxComputation.monthlyTds,
        standardDeduction: statutory.taxComputation.standardDeduction,
        rebateApplied: statutory.taxComputation.rebateApplied,
        surcharge: statutory.taxComputation.surcharge,
        cess: statutory.taxComputation.cess,
        investmentDeductions: statutory.taxComputation.breakdown,
        breakdown: statutory.taxComputation.breakdown,
      },
      update: {
        taxRegime: statutory.taxComputation.regime,
        projectedAnnualIncome: statutory.taxComputation.projectedAnnualIncome,
        taxableIncome: statutory.taxComputation.taxableIncome,
        annualTax: statutory.taxComputation.annualTax,
        monthlyTds: statutory.taxComputation.monthlyTds,
        standardDeduction: statutory.taxComputation.standardDeduction,
        rebateApplied: statutory.taxComputation.rebateApplied,
        surcharge: statutory.taxComputation.surcharge,
        cess: statutory.taxComputation.cess,
        breakdown: statutory.taxComputation.breakdown,
      },
    });
  }

  await prisma.employerContribution.upsert({
    where: { payrollCalculationId },
    create: {
      companyId,
      employeeId,
      payrollCalculationId,
      pfEmployer: statutory.employer.pfEmployer,
      eps: statutory.employer.eps,
      pfAdminCharges: statutory.employer.pfAdminCharges,
      edli: statutory.employer.edli,
      esiEmployer: statutory.employer.esiEmployer,
      bonusPlaceholder: statutory.employer.bonusPlaceholder,
      gratuityPlaceholder: statutory.employer.gratuityPlaceholder,
      periodStart,
      periodEnd,
      metadata: { financialYearCode: statutory.financialYearCode },
    },
    update: {
      pfEmployer: statutory.employer.pfEmployer,
      eps: statutory.employer.eps,
      pfAdminCharges: statutory.employer.pfAdminCharges,
      edli: statutory.employer.edli,
      esiEmployer: statutory.employer.esiEmployer,
      metadata: { financialYearCode: statutory.financialYearCode },
    },
  });
}
