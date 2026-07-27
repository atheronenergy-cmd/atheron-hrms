import type { EmployeeStatutoryFlags, PTConfigInput, PtSlab } from "@/modules/statutory/domain/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type PTCalculationInput = {
  gross: number;
  config: PTConfigInput;
  profile: EmployeeStatutoryFlags;
};

export type PTCalculationResult = {
  amount: number;
  slab: PtSlab | null;
  warnings: string[];
};

export class ProfessionalTaxService {
  calculate(input: PTCalculationInput): PTCalculationResult {
    const warnings: string[] = [];
    if (!input.profile.ptEnabled && !input.profile.professionalTaxApplicable) {
      return { amount: 0, slab: null, warnings };
    }
    if (input.profile.ptExempt) {
      warnings.push("Professional tax exempt for employee");
      return { amount: 0, slab: null, warnings };
    }

    const slabs = input.config.slabs as PtSlab[];
    const slab = slabs.find((s) => input.gross >= s.from && (s.to === null || input.gross <= s.to));
    if (!slab) {
      warnings.push(`No PT slab matched for gross ${input.gross} in ${input.config.stateName}`);
      return { amount: 0, slab: null, warnings };
    }

    let amount = slab.amount;
    if (input.config.maxAmount > 0) amount = Math.min(amount, input.config.maxAmount);
    return { amount: round2(amount), slab, warnings };
  }
}

export const professionalTaxService = new ProfessionalTaxService();
