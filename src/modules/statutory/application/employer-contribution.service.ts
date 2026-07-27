import type { EmployerContributionResult } from "@/modules/statutory/domain/types";
import type { ESICalculationResult } from "@/modules/statutory/application/esi.service";
import type { PFCalculationResult } from "@/modules/statutory/application/pf.service";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export class EmployerContributionService {
  aggregate(pf: PFCalculationResult, esi: ESICalculationResult): EmployerContributionResult {
    const pfEmployer = round2(pf.employerPf - pf.eps);
    const result: EmployerContributionResult = {
      pfEmployer,
      eps: pf.eps,
      pfAdminCharges: pf.adminCharges,
      edli: pf.edli,
      esiEmployer: esi.employerEsi,
      bonusPlaceholder: 0,
      gratuityPlaceholder: 0,
      total: 0,
    };
    result.total = round2(
      result.pfEmployer + result.eps + result.pfAdminCharges + result.edli + result.esiEmployer,
    );
    return result;
  }
}

export const employerContributionService = new EmployerContributionService();
