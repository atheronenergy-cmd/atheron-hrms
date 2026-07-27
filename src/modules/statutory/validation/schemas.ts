import { z } from "zod";

const taxSlabSchema = z.object({
  from: z.number().min(0),
  to: z.number().nullable(),
  rate: z.number().min(0).max(100),
});

const ptSlabSchema = z.object({
  from: z.number().min(0),
  to: z.number().nullable(),
  amount: z.number().min(0),
});

export const financialYearSchema = z.object({
  code: z.string().min(4).max(20),
  label: z.string().min(2).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
  remarks: z.string().optional(),
});

export const pfConfigurationSchema = z.object({
  statutoryVersionId: z.string().uuid().optional(),
  financialYearId: z.string().uuid(),
  employeeContributionRate: z.number().min(0).max(100),
  employerContributionRate: z.number().min(0).max(100),
  epsRate: z.number().min(0).max(100),
  adminChargeRate: z.number().min(0).max(100),
  edliRate: z.number().min(0).max(100).optional(),
  edliAdminRate: z.number().min(0).max(100).optional(),
  wageCeiling: z.number().min(0),
  vpfAllowed: z.boolean().optional(),
  exemptions: z.array(z.record(z.unknown())).optional(),
});

export const esiConfigurationSchema = z.object({
  statutoryVersionId: z.string().uuid().optional(),
  financialYearId: z.string().uuid(),
  employeeRate: z.number().min(0).max(100),
  employerRate: z.number().min(0).max(100),
  eligibilityCeiling: z.number().min(0),
  exemptions: z.array(z.record(z.unknown())).optional(),
});

export const professionalTaxConfigurationSchema = z.object({
  statutoryVersionId: z.string().uuid().optional(),
  financialYearId: z.string().uuid(),
  stateCode: z.string().min(2).max(10),
  stateName: z.string().min(2).max(100),
  slabs: z.array(ptSlabSchema).min(1),
  maxAmount: z.number().min(0).optional(),
  exemptions: z.array(z.record(z.unknown())).optional(),
});

export const incomeTaxConfigurationSchema = z.object({
  statutoryVersionId: z.string().uuid().optional(),
  financialYearId: z.string().uuid(),
  regime: z.enum(["old", "new"]),
  slabs: z.array(taxSlabSchema).min(1),
  standardDeduction: z.number().min(0),
  rebateLimit: z.number().min(0).optional(),
  rebateAmount: z.number().min(0).optional(),
  surchargeSlabs: z.array(taxSlabSchema).optional(),
  cessRate: z.number().min(0).max(100),
});

export const employeeStatutoryProfileSchema = z.object({
  employeeId: z.string().uuid(),
  pfEnabled: z.boolean().optional(),
  esiEnabled: z.boolean().optional(),
  ptEnabled: z.boolean().optional(),
  tdsEnabled: z.boolean().optional(),
  taxRegime: z.enum(["old", "new"]).optional(),
  financialYearCode: z.string().optional(),
  vpfPercentage: z.number().min(0).max(100).optional(),
  pfEmployeeRateOverride: z.number().min(0).max(100).optional(),
  pfEmployerRateOverride: z.number().min(0).max(100).optional(),
  esiEmployeeRateOverride: z.number().min(0).max(100).optional(),
  esiEmployerRateOverride: z.number().min(0).max(100).optional(),
  ptExempt: z.boolean().optional(),
  exemptions: z.array(z.record(z.unknown())).optional(),
});

export const investmentDeclarationSchema = z.object({
  employeeId: z.string().uuid(),
  financialYearId: z.string().uuid(),
  section80C: z.number().min(0).optional(),
  section80D: z.number().min(0).optional(),
  homeLoanInterest: z.number().min(0).optional(),
  nps: z.number().min(0).optional(),
  educationLoan: z.number().min(0).optional(),
  otherDeductions: z.record(z.number()).optional(),
  proofDocuments: z.array(z.object({ fileId: z.string().uuid().optional(), section: z.string(), status: z.string().optional() })).optional(),
  remarks: z.string().optional(),
});

export const statutoryCalculateSchema = z.object({
  employeeId: z.string().uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  basic: z.number().min(0),
  gross: z.number().min(0),
  ctc: z.number().min(0).optional(),
});

export const statutoryReportQuerySchema = z.object({
  reportType: z.enum(["pf", "esi", "pt", "tds", "employer"]),
  financialYearId: z.string().uuid().optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
});

export type FinancialYearInput = z.infer<typeof financialYearSchema>;
export type PFConfigurationInput = z.infer<typeof pfConfigurationSchema>;
export type ESIConfigurationInput = z.infer<typeof esiConfigurationSchema>;
export type ProfessionalTaxConfigurationInput = z.infer<typeof professionalTaxConfigurationSchema>;
export type IncomeTaxConfigurationInput = z.infer<typeof incomeTaxConfigurationSchema>;
export type EmployeeStatutoryProfileInput = z.infer<typeof employeeStatutoryProfileSchema>;
export type InvestmentDeclarationInput = z.infer<typeof investmentDeclarationSchema>;
export type StatutoryCalculateInput = z.infer<typeof statutoryCalculateSchema>;
