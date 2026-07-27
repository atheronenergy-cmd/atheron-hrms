import { prisma } from "@/infrastructure/database/prisma-client";
import { createEarningsOrchestratorService } from "@/modules/earnings/application/earnings-orchestrator.service";
import type { EarningsCalculationResult } from "@/modules/earnings/domain/types";

export function createPayrollEarningsIntegrationService(companyId: string) {
  const orchestrator = createEarningsOrchestratorService(companyId);
  return {
    async calculate(params: {
      employeeId: string;
      periodStart: Date;
      periodEnd: Date;
      basic: number;
      gross: number;
      workingDays: number;
      overtimeHours: number;
    }): Promise<EarningsCalculationResult> {
      return orchestrator.calculateForEmployee(params);
    },
  };
}

export async function persistEarningsResults(params: {
  companyId: string;
  employeeId: string;
  payrollCalculationId: string;
  periodStart: Date;
  periodEnd: Date;
  earnings: EarningsCalculationResult;
}) {
  const { companyId, employeeId, payrollCalculationId, periodStart, periodEnd, earnings } = params;
  if (earnings.breakdown.overtime > 0) {
    await prisma.overtimeRecord.upsert({
      where: { payrollCalculationId },
      create: {
        companyId,
        employeeId,
        payrollCalculationId,
        periodStart,
        periodEnd,
        otHours: earnings.metadata.overtimeHours ?? 0,
        holidayOtHours: earnings.metadata.holidayOtHours ?? 0,
        nightOtHours: earnings.metadata.nightOtHours ?? 0,
        amount: earnings.breakdown.overtime,
        status: "paid",
      },
      update: { amount: earnings.breakdown.overtime, status: "paid" },
    });
  }

  await prisma.employeeBonus.updateMany({
    where: { companyId, employeeId, status: "approved", payrollCalculationId: null, bonusDate: { gte: periodStart, lte: periodEnd } },
    data: { payrollCalculationId },
  });
  await prisma.employeeIncentive.updateMany({
    where: { companyId, employeeId, status: "approved", payrollCalculationId: null, periodStart: { lte: periodEnd }, periodEnd: { gte: periodStart } },
    data: { payrollCalculationId },
  });
  await prisma.employeeCommission.updateMany({
    where: { companyId, employeeId, status: "approved", payrollCalculationId: null, periodStart: { lte: periodEnd }, periodEnd: { gte: periodStart } },
    data: { payrollCalculationId },
  });
  await prisma.employeeAllowance.updateMany({
    where: { companyId, employeeId, status: { in: ["approved", "finance_approved"] }, payrollCalculationId: null, periodStart: { lte: periodEnd }, periodEnd: { gte: periodStart } },
    data: { payrollCalculationId },
  });
}
