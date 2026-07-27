import type { LoanInterestType } from "@prisma/client";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function calculateInstallmentAmount(params: {
  principal: number;
  annualRate: number;
  tenure: number;
  interestType: LoanInterestType;
}): number {
  const { principal, annualRate, tenure, interestType } = params;
  if (tenure <= 0) return 0;
  if (interestType === "none") return round2(principal / tenure);

  const monthlyRate = annualRate / 100 / 12;

  if (interestType === "flat") {
    const totalInterest = round2(principal * (annualRate / 100) * (tenure / 12));
    return round2((principal + totalInterest) / tenure);
  }

  if (interestType === "simple") {
    const monthlyInterest = round2(principal * (annualRate / 100) / 12);
    return round2(principal / tenure + monthlyInterest);
  }

  if (interestType === "reducing_balance" || interestType === "compound") {
    if (monthlyRate === 0) return round2(principal / tenure);
    const factor = Math.pow(1 + monthlyRate, tenure);
    return round2((principal * monthlyRate * factor) / (factor - 1));
  }

  return round2(principal / tenure);
}

export function buildEmiComponents(params: {
  principal: number;
  annualRate: number;
  tenure: number;
  interestType: LoanInterestType;
  installmentAmount: number;
}): Array<{ principalComponent: number; interestComponent: number; installmentAmount: number; outstandingBalance: number }> {
  const { principal, tenure, interestType, installmentAmount } = params;
  const monthlyRate = params.annualRate / 100 / 12;
  const schedule: Array<{ principalComponent: number; interestComponent: number; installmentAmount: number; outstandingBalance: number }> = [];
  let outstanding = principal;

  for (let i = 0; i < tenure; i++) {
    let interestComponent = 0;
    let principalComponent = 0;

    switch (interestType) {
      case "none":
        principalComponent = round2(outstanding / (tenure - i));
        interestComponent = 0;
        break;
      case "flat": {
        const totalInterest = round2(principal * (params.annualRate / 100) * (tenure / 12));
        interestComponent = round2(totalInterest / tenure);
        principalComponent = round2(installmentAmount - interestComponent);
        break;
      }
      case "simple":
        interestComponent = round2(principal * (params.annualRate / 100) / 12);
        principalComponent = round2(installmentAmount - interestComponent);
        break;
      case "reducing_balance":
      case "compound":
        interestComponent = round2(outstanding * monthlyRate);
        principalComponent = round2(installmentAmount - interestComponent);
        break;
    }

    if (i === tenure - 1) {
      principalComponent = round2(outstanding);
      interestComponent = round2(installmentAmount - principalComponent);
      if (interestComponent < 0) {
        interestComponent = 0;
      }
    }

    outstanding = round2(Math.max(0, outstanding - principalComponent));
    schedule.push({
      principalComponent,
      interestComponent,
      installmentAmount: round2(principalComponent + interestComponent),
      outstandingBalance: outstanding,
    });
  }

  return schedule;
}

export function calculateForeclosureAmount(outstandingBalance: number, waivedAmount = 0) {
  return round2(Math.max(0, outstandingBalance - waivedAmount));
}

export function createInterestCalculationService() {
  return {
    calculateInstallmentAmount,
    buildEmiComponents,
    calculateForeclosureAmount,
  };
}
