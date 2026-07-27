export const STATUTORY_ROUTES = {
  dashboard: "/dashboard/statutory",
  pf: "/dashboard/statutory/pf",
  esi: "/dashboard/statutory/esi",
  pt: "/dashboard/statutory/pt",
  incomeTax: "/dashboard/statutory/income-tax",
  investmentDeclarations: "/dashboard/statutory/investment-declarations",
  financialYear: "/dashboard/statutory/financial-year",
  reports: "/dashboard/statutory/reports",
} as const;

export type TaxSlab = { from: number; to: number | null; rate: number };
export type PtSlab = { from: number; to: number | null; amount: number };
export type SurchargeSlab = { from: number; to: number | null; rate: number };

export type PFConfigInput = {
  employeeContributionRate: number;
  employerContributionRate: number;
  epsRate: number;
  adminChargeRate: number;
  edliRate: number;
  edliAdminRate: number;
  wageCeiling: number;
  vpfAllowed: boolean;
};

export type ESIConfigInput = {
  employeeRate: number;
  employerRate: number;
  eligibilityCeiling: number;
};

export type PTConfigInput = {
  stateCode: string;
  stateName: string;
  slabs: PtSlab[];
  maxAmount: number;
};

export type IncomeTaxConfigInput = {
  regime: string;
  slabs: TaxSlab[];
  standardDeduction: number;
  rebateLimit: number;
  rebateAmount: number;
  surchargeSlabs: SurchargeSlab[];
  cessRate: number;
};

export type EmployeeStatutoryFlags = {
  pfEnabled: boolean;
  esiEnabled: boolean;
  ptEnabled: boolean;
  tdsEnabled: boolean;
  taxRegime: string;
  vpfPercentage: number;
  pfEmployeeRateOverride?: number;
  pfEmployerRateOverride?: number;
  esiEmployeeRateOverride?: number;
  esiEmployerRateOverride?: number;
  ptExempt: boolean;
  esiEligible: boolean;
  professionalTaxApplicable: boolean;
};

export type InvestmentDeductions = {
  section80C: number;
  section80D: number;
  homeLoanInterest: number;
  nps: number;
  educationLoan: number;
  other: number;
};

export type StatutoryDeductionResult = {
  pf: number;
  vpf: number;
  esi: number;
  pt: number;
  tds: number;
};

export type EmployerContributionResult = {
  pfEmployer: number;
  eps: number;
  pfAdminCharges: number;
  edli: number;
  esiEmployer: number;
  bonusPlaceholder: number;
  gratuityPlaceholder: number;
  total: number;
};

export type StatutoryCalculationResult = {
  deductions: StatutoryDeductionResult;
  employer: EmployerContributionResult;
  taxComputation: {
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
  } | null;
  context: Record<string, number>;
  warnings: string[];
  financialYearId?: string;
  financialYearCode?: string;
};

export type StatutoryDashboardStats = {
  activeFinancialYear: string | null;
  pfConfigured: boolean;
  esiConfigured: boolean;
  ptConfigured: boolean;
  tdsConfigured: boolean;
  pendingDeclarations: number;
  employeesWithProfile: number;
};

export const STATUTORY_COMPONENT_CODES = new Set([
  "PF",
  "ESI",
  "PT",
  "PROFESSIONAL_TAX",
  "TAX",
  "INCOME_TAX",
  "TDS",
  "VPF",
]);

export const STATUTORY_CODE_ALIASES: Record<string, keyof StatutoryDeductionResult> = {
  PF: "pf",
  ESI: "esi",
  PT: "pt",
  PROFESSIONAL_TAX: "pt",
  TAX: "tds",
  INCOME_TAX: "tds",
  TDS: "tds",
  VPF: "vpf",
};

export type StatutoryReportType = "pf" | "esi" | "pt" | "tds" | "employer";

export type StatutoryReportRow = Record<string, string | number | boolean | null>;

export type StatutoryExportPayload = {
  reportType: StatutoryReportType;
  financialYearCode: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  rows: StatutoryReportRow[];
  metadata: Record<string, unknown>;
};
