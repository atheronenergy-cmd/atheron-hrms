import type { IncomeTaxConfigInput, InvestmentDeductions, TaxSlab } from "@/modules/statutory/domain/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type IncomeTaxCalculationInput = {
  monthlyGross: number;
  config: IncomeTaxConfigInput;
  investments: InvestmentDeductions;
  monthsRemaining?: number;
};

export type IncomeTaxCalculationResult = {
  projectedAnnualIncome: number;
  taxableIncome: number;
  annualTax: number;
  monthlyTds: number;
  standardDeduction: number;
  rebateApplied: number;
  surcharge: number;
  cess: number;
  regime: string;
  breakdown: Record<string, number>;
  warnings: string[];
};

function applySlabs(income: number, slabs: TaxSlab[]) {
  let tax = 0;
  for (const slab of slabs) {
    const upper = slab.to ?? Number.POSITIVE_INFINITY;
    if (income <= slab.from) continue;
    const taxable = Math.min(income, upper) - slab.from;
    if (taxable > 0) tax += (taxable * slab.rate) / 100;
  }
  return round2(tax);
}

export class IncomeTaxService {
  calculate(input: IncomeTaxCalculationInput): IncomeTaxCalculationResult {
    const warnings: string[] = [];
    const projectedAnnualIncome = round2(input.monthlyGross * 12);
    const investmentTotal = round2(
      input.investments.section80C +
        input.investments.section80D +
        input.investments.homeLoanInterest +
        input.investments.nps +
        input.investments.educationLoan +
        input.investments.other,
    );

    let taxableIncome = projectedAnnualIncome;
    if (input.config.regime === "old") {
      taxableIncome = round2(Math.max(0, taxableIncome - investmentTotal));
    }
    taxableIncome = round2(Math.max(0, taxableIncome - input.config.standardDeduction));

    let annualTax = applySlabs(taxableIncome, input.config.slabs as TaxSlab[]);
    let rebateApplied = 0;
    if (taxableIncome <= input.config.rebateLimit && input.config.rebateAmount > 0) {
      rebateApplied = Math.min(annualTax, input.config.rebateAmount);
      annualTax = round2(Math.max(0, annualTax - rebateApplied));
    }

    let surcharge = 0;
    for (const slab of input.config.surchargeSlabs as TaxSlab[]) {
      const upper = slab.to ?? Number.POSITIVE_INFINITY;
      if (taxableIncome >= slab.from && taxableIncome <= upper) {
        surcharge = round2((annualTax * slab.rate) / 100);
        break;
      }
    }

    const cess = round2(((annualTax + surcharge) * input.config.cessRate) / 100);
    annualTax = round2(annualTax + surcharge + cess);
    const monthlyTds = round2(annualTax / 12);

    if (investmentTotal === 0 && input.config.regime === "old") {
      warnings.push("No investment declaration found for old tax regime");
    }

    return {
      projectedAnnualIncome,
      taxableIncome,
      annualTax,
      monthlyTds,
      standardDeduction: input.config.standardDeduction,
      rebateApplied,
      surcharge,
      cess,
      regime: input.config.regime,
      breakdown: {
        baseTax: round2(annualTax - surcharge - cess + rebateApplied),
        surcharge,
        cess,
        investments: investmentTotal,
      },
      warnings,
    };
  }
}

export const incomeTaxService = new IncomeTaxService();
