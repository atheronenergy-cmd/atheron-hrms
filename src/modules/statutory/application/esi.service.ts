import type { EmployeeStatutoryFlags, ESIConfigInput } from "@/modules/statutory/domain/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type ESICalculationInput = {
  gross: number;
  config: ESIConfigInput;
  profile: EmployeeStatutoryFlags;
};

export type ESICalculationResult = {
  employeeEsi: number;
  employerEsi: number;
  eligible: boolean;
  warnings: string[];
};

export class ESIService {
  calculate(input: ESICalculationInput): ESICalculationResult {
    const warnings: string[] = [];
    const autoEligible = input.gross <= input.config.eligibilityCeiling;
    const eligible = input.profile.esiEnabled || input.profile.esiEligible || autoEligible;

    if (!eligible) {
      if (autoEligible === false && input.profile.esiEligible) {
        warnings.push("ESI gross exceeds eligibility ceiling — contribution skipped");
      }
      return { employeeEsi: 0, employerEsi: 0, eligible: false, warnings };
    }

    if (!input.profile.esiEnabled && autoEligible) {
      warnings.push("ESI auto-eligible based on gross within ceiling");
    }

    const employeeRate = input.profile.esiEmployeeRateOverride ?? input.config.employeeRate;
    const employerRate = input.profile.esiEmployerRateOverride ?? input.config.employerRate;

    return {
      employeeEsi: round2((input.gross * employeeRate) / 100),
      employerEsi: round2((input.gross * employerRate) / 100),
      eligible: true,
      warnings,
    };
  }
}

export const esiService = new ESIService();
