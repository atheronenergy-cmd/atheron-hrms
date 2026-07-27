import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { employerContributionService } from "@/modules/statutory/application/employer-contribution.service";
import { esiService } from "@/modules/statutory/application/esi.service";
import { incomeTaxService } from "@/modules/statutory/application/income-tax.service";
import { pfService } from "@/modules/statutory/application/pf.service";
import { professionalTaxService } from "@/modules/statutory/application/professional-tax.service";
import { createStatutoryConfigurationService } from "@/modules/statutory/application/statutory-configuration.service";
import type {
  EmployeeStatutoryFlags,
  InvestmentDeductions,
  StatutoryCalculationResult,
} from "@/modules/statutory/domain/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export class StatutoryOrchestratorService extends BaseRepository {
  async calculateForEmployee(params: {
    employeeId: string;
    periodStart: Date;
    periodEnd: Date;
    basic: number;
    gross: number;
    ctc?: number;
  }): Promise<StatutoryCalculationResult> {
    const companyId = this.requireCompanyId();
    const warnings: string[] = [];

    const employee = await prisma.employee.findFirst({
      where: { id: params.employeeId, companyId, deletedAt: null },
      include: {
        statutoryProfile: true,
        statutoryDetail: true,
        taxProfile: true,
        branch: { select: { address: true } },
        company: { select: { state: true } },
      },
    });
    if (!employee) {
      return this.emptyResult(warnings, "Employee not found for statutory calculation");
    }

    const fy = await createStatutoryConfigurationService(companyId).getFinancialYearForDate(params.periodEnd);
    if (!fy) {
      return this.emptyResult(warnings, "No financial year configured for payroll period");
    }

    const stateCode =
      (employee.branch?.address as { stateCode?: string } | null)?.stateCode ??
      employee.company.state?.slice(0, 2).toUpperCase() ??
      "MH";

    const configs = await createStatutoryConfigurationService(companyId).getActiveConfigs(fy.id, stateCode);
    const profile = this.buildProfile(employee);

    const deductions = { pf: 0, vpf: 0, esi: 0, pt: 0, tds: 0 };
    let pfResult = { employeePf: 0, vpf: 0, employerPf: 0, eps: 0, adminCharges: 0, edli: 0, pfWage: 0, warnings: [] as string[] };
    let esiResult = { employeeEsi: 0, employerEsi: 0, eligible: false, warnings: [] as string[] };

    if (configs.pf && profile.pfEnabled) {
      pfResult = pfService.calculate({ basic: params.basic, config: configs.pf, profile });
      deductions.pf = pfResult.employeePf;
      deductions.vpf = pfResult.vpf;
      warnings.push(...pfResult.warnings);
    } else if (profile.pfEnabled) {
      warnings.push("PF configuration missing for financial year");
    }

    if (configs.esi) {
      esiResult = esiService.calculate({ gross: params.gross, config: configs.esi, profile });
      deductions.esi = esiResult.employeeEsi;
      warnings.push(...esiResult.warnings);
    } else if (profile.esiEnabled || profile.esiEligible) {
      warnings.push("ESI configuration missing for financial year");
    }

    const employer = employerContributionService.aggregate(pfResult, esiResult);

    if (configs.pt) {
      const pt = professionalTaxService.calculate({ gross: params.gross, config: configs.pt, profile });
      deductions.pt = pt.amount;
      warnings.push(...pt.warnings);
    } else if (profile.ptEnabled || profile.professionalTaxApplicable) {
      warnings.push("Professional tax configuration missing for financial year");
    }

    let taxComputation: StatutoryCalculationResult["taxComputation"] = null;
    if (profile.tdsEnabled) {
      const regime = profile.taxRegime === "old" ? "old" : "new";
      const taxConfig = regime === "old" ? configs.incomeTaxOld : configs.incomeTaxNew;
      if (taxConfig) {
        const investments = await this.loadInvestments(params.employeeId, fy.id);
        const tax = incomeTaxService.calculate({
          monthlyGross: params.gross,
          config: taxConfig,
          investments,
        });
        deductions.tds = tax.monthlyTds;
        warnings.push(...tax.warnings);
        taxComputation = {
          projectedAnnualIncome: tax.projectedAnnualIncome,
          taxableIncome: tax.taxableIncome,
          annualTax: tax.annualTax,
          monthlyTds: tax.monthlyTds,
          standardDeduction: tax.standardDeduction,
          rebateApplied: tax.rebateApplied,
          surcharge: tax.surcharge,
          cess: tax.cess,
          regime: tax.regime,
          breakdown: tax.breakdown,
        };
      } else {
        warnings.push(`Income tax configuration missing for ${regime} regime`);
      }
    }

    const context: Record<string, number> = {
      PF: deductions.pf,
      VPF: deductions.vpf,
      ESI: deductions.esi,
      PT: deductions.pt,
      PROFESSIONAL_TAX: deductions.pt,
      TAX: deductions.tds,
      INCOME_TAX: deductions.tds,
      TDS: deductions.tds,
      EMPLOYER_PF: employer.pfEmployer,
      EMPLOYER_ESI: employer.esiEmployer,
      EPS: employer.eps,
    };

    return {
      deductions,
      employer,
      taxComputation,
      context,
      warnings,
      financialYearId: fy.id,
      financialYearCode: fy.code,
    };
  }

  private buildProfile(employee: {
    statutoryProfile: {
      pfEnabled: boolean;
      esiEnabled: boolean;
      ptEnabled: boolean;
      tdsEnabled: boolean;
      taxRegime: string | null;
      vpfPercentage: unknown;
      pfEmployeeRateOverride: unknown;
      pfEmployerRateOverride: unknown;
      esiEmployeeRateOverride: unknown;
      esiEmployerRateOverride: unknown;
      ptExempt: boolean;
    } | null;
    statutoryDetail: { esiEligible: boolean; professionalTaxApplicable: boolean } | null;
    taxProfile: { taxRegime: string | null } | null;
  }): EmployeeStatutoryFlags {
    const sp = employee.statutoryProfile;
    const sd = employee.statutoryDetail;
    const tp = employee.taxProfile;
    return {
      pfEnabled: sp?.pfEnabled ?? true,
      esiEnabled: sp?.esiEnabled ?? sd?.esiEligible ?? false,
      ptEnabled: sp?.ptEnabled ?? sd?.professionalTaxApplicable ?? false,
      tdsEnabled: sp?.tdsEnabled ?? true,
      taxRegime: sp?.taxRegime ?? tp?.taxRegime ?? "new",
      vpfPercentage: Number(sp?.vpfPercentage ?? 0),
      pfEmployeeRateOverride: sp?.pfEmployeeRateOverride ? Number(sp.pfEmployeeRateOverride) : undefined,
      pfEmployerRateOverride: sp?.pfEmployerRateOverride ? Number(sp.pfEmployerRateOverride) : undefined,
      esiEmployeeRateOverride: sp?.esiEmployeeRateOverride ? Number(sp.esiEmployeeRateOverride) : undefined,
      esiEmployerRateOverride: sp?.esiEmployerRateOverride ? Number(sp.esiEmployerRateOverride) : undefined,
      ptExempt: sp?.ptExempt ?? false,
      esiEligible: sd?.esiEligible ?? false,
      professionalTaxApplicable: sd?.professionalTaxApplicable ?? false,
    };
  }

  private async loadInvestments(employeeId: string, financialYearId: string): Promise<InvestmentDeductions> {
    const decl = await prisma.investmentDeclaration.findFirst({
      where: {
        employeeId,
        financialYearId,
        declarationStatus: { in: ["submitted", "approved"] },
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!decl) {
      return { section80C: 0, section80D: 0, homeLoanInterest: 0, nps: 0, educationLoan: 0, other: 0 };
    }
    const other = Object.values((decl.otherDeductions as Record<string, number>) ?? {}).reduce((s, v) => s + Number(v), 0);
    return {
      section80C: Number(decl.section80C),
      section80D: Number(decl.section80D),
      homeLoanInterest: Number(decl.homeLoanInterest),
      nps: Number(decl.nps),
      educationLoan: Number(decl.educationLoan),
      other: round2(other),
    };
  }

  private emptyResult(warnings: string[], message: string): StatutoryCalculationResult {
    warnings.push(message);
    return {
      deductions: { pf: 0, vpf: 0, esi: 0, pt: 0, tds: 0 },
      employer: {
        pfEmployer: 0,
        eps: 0,
        pfAdminCharges: 0,
        edli: 0,
        esiEmployer: 0,
        bonusPlaceholder: 0,
        gratuityPlaceholder: 0,
        total: 0,
      },
      taxComputation: null,
      context: {},
      warnings,
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createStatutoryOrchestratorService(companyId: string) {
  return new StatutoryOrchestratorService(companyId);
}
