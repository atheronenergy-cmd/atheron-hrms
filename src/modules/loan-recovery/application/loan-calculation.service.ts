import type { LoanRecoveryMode } from "@prisma/client";

import type { EmiScheduleItem, LoanCalculationInput } from "@/modules/loan-recovery/domain/types";
import {
  buildEmiComponents,
  calculateInstallmentAmount,
} from "@/modules/loan-recovery/application/interest-calculation.service";

function addPeriod(date: Date, mode: LoanRecoveryMode, index: number): Date {
  const d = new Date(date);
  if (mode === "weekly") {
    d.setUTCDate(d.getUTCDate() + 7 * index);
  } else if (mode === "biweekly") {
    d.setUTCDate(d.getUTCDate() + 14 * index);
  } else {
    d.setUTCMonth(d.getUTCMonth() + index);
  }
  return d;
}

export function calculateLoanSummary(input: LoanCalculationInput) {
  const installmentAmount = calculateInstallmentAmount({
    principal: input.principal,
    annualRate: input.interestRate,
    tenure: input.tenure,
    interestType: input.interestType,
  });
  return { installmentAmount, outstandingBalance: input.principal };
}

export function generateEmiSchedule(input: LoanCalculationInput): EmiScheduleItem[] {
  const installmentAmount = calculateInstallmentAmount({
    principal: input.principal,
    annualRate: input.interestRate,
    tenure: input.tenure,
    interestType: input.interestType,
  });
  const components = buildEmiComponents({
    principal: input.principal,
    annualRate: input.interestRate,
    tenure: input.tenure,
    interestType: input.interestType,
    installmentAmount,
  });

  return components.map((c, idx) => ({
    emiNumber: idx + 1,
    dueDate: addPeriod(input.startRecoveryDate, input.recoveryMode, idx),
    ...c,
  }));
}

export function recalculateAfterPrepayment(params: {
  outstandingBalance: number;
  interestType: LoanCalculationInput["interestType"];
  interestRate: number;
  remainingTenure: number;
  recoveryMode: LoanRecoveryMode;
  startRecoveryDate: Date;
}): EmiScheduleItem[] {
  return generateEmiSchedule({
    principal: params.outstandingBalance,
    interestType: params.interestType,
    interestRate: params.interestRate,
    tenure: params.remainingTenure,
    recoveryMode: params.recoveryMode,
    startRecoveryDate: params.startRecoveryDate,
  });
}

export function createLoanCalculationService() {
  return { calculateLoanSummary, generateEmiSchedule, recalculateAfterPrepayment };
}
