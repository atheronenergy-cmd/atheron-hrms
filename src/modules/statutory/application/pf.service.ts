import type { EmployeeStatutoryFlags, PFConfigInput } from "@/modules/statutory/domain/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type PFCalculationInput = {
  basic: number;
  config: PFConfigInput;
  profile: EmployeeStatutoryFlags;
};

export type PFCalculationResult = {
  employeePf: number;
  vpf: number;
  employerPf: number;
  eps: number;
  adminCharges: number;
  edli: number;
  pfWage: number;
  warnings: string[];
};

export class PFService {
  calculate(input: PFCalculationInput): PFCalculationResult {
    const warnings: string[] = [];
    if (!input.profile.pfEnabled) {
      return { employeePf: 0, vpf: 0, employerPf: 0, eps: 0, adminCharges: 0, edli: 0, pfWage: 0, warnings };
    }

    const cfg = input.config;
    const pfWage = round2(Math.min(input.basic, cfg.wageCeiling));
    const employeeRate = input.profile.pfEmployeeRateOverride ?? cfg.employeeContributionRate;
    const employerRate = input.profile.pfEmployerRateOverride ?? cfg.employerContributionRate;

    const employeePf = round2((pfWage * employeeRate) / 100);
    let vpf = 0;
    if (cfg.vpfAllowed && input.profile.vpfPercentage > 0) {
      vpf = round2((input.basic * input.profile.vpfPercentage) / 100);
    }

    const employerPf = round2((pfWage * employerRate) / 100);
    const eps = round2(Math.min((pfWage * cfg.epsRate) / 100, employerPf));
    const pfEmployerEpf = round2(Math.max(0, employerPf - eps));
    const adminCharges = round2((pfWage * cfg.adminChargeRate) / 100);
    const edli = round2((pfWage * cfg.edliRate) / 100 + (pfWage * cfg.edliAdminRate) / 100);

    if (pfEmployerEpf > 0 && pfEmployerEpf !== employerPf - eps) {
      warnings.push("PF employer split adjusted for EPS cap");
    }

    return {
      employeePf: round2(employeePf + vpf),
      vpf,
      employerPf: round2(pfEmployerEpf + eps),
      eps,
      adminCharges,
      edli,
      pfWage,
      warnings,
    };
  }
}

export const pfService = new PFService();
