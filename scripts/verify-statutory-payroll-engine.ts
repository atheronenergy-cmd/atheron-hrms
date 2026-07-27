/**
 * Indian Statutory Payroll Engine verification.
 * Run: npx tsx scripts/verify-statutory-payroll-engine.ts
 */
import { pfService } from "../src/modules/statutory/application/pf.service";
import { esiService } from "../src/modules/statutory/application/esi.service";
import { professionalTaxService } from "../src/modules/statutory/application/professional-tax.service";
import { incomeTaxService } from "../src/modules/statutory/application/income-tax.service";
import { employerContributionService } from "../src/modules/statutory/application/employer-contribution.service";
import { STATUTORY_ROUTES, STATUTORY_COMPONENT_CODES } from "../src/modules/statutory/domain/types";
import { PLACEHOLDER_COMPONENT_CODES } from "../src/modules/payroll/domain/types";
import {
  esiConfigurationSchema,
  financialYearSchema,
  incomeTaxConfigurationSchema,
  pfConfigurationSchema,
  professionalTaxConfigurationSchema,
  statutoryCalculateSchema,
} from "../src/modules/statutory/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Indian Statutory Payroll Engine Verification ===\n");

assert(PERMISSIONS.STATUTORY.VIEW === "statutory.module.read", "statutory.view permission");
assert(PERMISSIONS.STATUTORY.MANAGE === "statutory.module.manage", "statutory.manage permission");
assert(PERMISSIONS.STATUTORY.PF.MANAGE === "statutory.pf.manage", "pf.manage permission");
assert(PERMISSIONS.STATUTORY.ESI.MANAGE === "statutory.esi.manage", "esi.manage permission");
assert(PERMISSIONS.STATUTORY.PT.MANAGE === "statutory.pt.manage", "pt.manage permission");
assert(PERMISSIONS.STATUTORY.TDS.MANAGE === "statutory.tds.manage", "tds.manage permission");

assert(STATUTORY_ROUTES.dashboard === "/dashboard/statutory", "Statutory dashboard route");
assert(!PLACEHOLDER_COMPONENT_CODES.has("PF"), "PF removed from payroll placeholders");
assert(!PLACEHOLDER_COMPONENT_CODES.has("ESI"), "ESI removed from payroll placeholders");
assert(STATUTORY_COMPONENT_CODES.has("PF"), "PF in statutory component codes");

const fy = financialYearSchema.safeParse({
  code: "FY2026-27",
  label: "FY 2026-27",
  startDate: "2026-04-01",
  endDate: "2027-03-31",
});
assert(fy.success, "Financial year schema valid");

const pfCfg = pfConfigurationSchema.safeParse({
  financialYearId: "00000000-0000-4000-8000-000000000001",
  employeeContributionRate: 12,
  employerContributionRate: 12,
  epsRate: 8.33,
  adminChargeRate: 0.5,
  wageCeiling: 15000,
});
assert(pfCfg.success, "PF configuration schema valid");

const esiCfg = esiConfigurationSchema.safeParse({
  financialYearId: "00000000-0000-4000-8000-000000000001",
  employeeRate: 0.75,
  employerRate: 3.25,
  eligibilityCeiling: 21000,
});
assert(esiCfg.success, "ESI configuration schema valid");

const ptCfg = professionalTaxConfigurationSchema.safeParse({
  financialYearId: "00000000-0000-4000-8000-000000000001",
  stateCode: "MH",
  stateName: "Maharashtra",
  slabs: [{ from: 0, to: 7500, amount: 0 }, { from: 7501, to: null, amount: 200 }],
});
assert(ptCfg.success, "PT configuration schema valid");

const itCfg = incomeTaxConfigurationSchema.safeParse({
  financialYearId: "00000000-0000-4000-8000-000000000001",
  regime: "new",
  slabs: [{ from: 0, to: 300000, rate: 0 }, { from: 300001, to: null, rate: 30 }],
  standardDeduction: 75000,
  cessRate: 4,
});
assert(itCfg.success, "Income tax configuration schema valid");

const calcInput = statutoryCalculateSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000002",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
  basic: 15000,
  gross: 25000,
});
assert(calcInput.success, "Statutory calculate schema valid");

const pf = pfService.calculate({
  basic: 15000,
  config: {
    employeeContributionRate: 12,
    employerContributionRate: 12,
    epsRate: 8.33,
    adminChargeRate: 0.5,
    edliRate: 0.5,
    edliAdminRate: 0,
    wageCeiling: 15000,
    vpfAllowed: true,
  },
  profile: {
    pfEnabled: true,
    esiEnabled: false,
    ptEnabled: false,
    tdsEnabled: true,
    taxRegime: "new",
    vpfPercentage: 0,
    ptExempt: false,
    esiEligible: false,
    professionalTaxApplicable: false,
  },
});
assert(pf.employeePf === 1800, "PF employee contribution calculation");
assert(pf.eps > 0, "PF EPS calculation");

const esi = esiService.calculate({
  gross: 20000,
  config: { employeeRate: 0.75, employerRate: 3.25, eligibilityCeiling: 21000 },
  profile: {
    pfEnabled: true,
    esiEnabled: false,
    ptEnabled: false,
    tdsEnabled: true,
    taxRegime: "new",
    vpfPercentage: 0,
    ptExempt: false,
    esiEligible: false,
    professionalTaxApplicable: false,
  },
});
assert(esi.eligible && esi.employeeEsi === 150, "ESI auto eligibility and calculation");

const esiIneligible = esiService.calculate({
  gross: 25000,
  config: { employeeRate: 0.75, employerRate: 3.25, eligibilityCeiling: 21000 },
  profile: {
    pfEnabled: true,
    esiEnabled: false,
    ptEnabled: false,
    tdsEnabled: true,
    taxRegime: "new",
    vpfPercentage: 0,
    ptExempt: false,
    esiEligible: false,
    professionalTaxApplicable: false,
  },
});
assert(!esiIneligible.eligible && esiIneligible.employeeEsi === 0, "ESI ineligible above ceiling");

const pt = professionalTaxService.calculate({
  gross: 15000,
  config: {
    stateCode: "MH",
    stateName: "Maharashtra",
    slabs: [
      { from: 0, to: 7500, amount: 0 },
      { from: 7501, to: 10000, amount: 175 },
      { from: 10001, to: null, amount: 200 },
    ],
    maxAmount: 2500,
  },
  profile: {
    pfEnabled: true,
    esiEnabled: false,
    ptEnabled: true,
    tdsEnabled: true,
    taxRegime: "new",
    vpfPercentage: 0,
    ptExempt: false,
    esiEligible: false,
    professionalTaxApplicable: true,
  },
});
assert(pt.amount === 200, "Professional tax slab calculation");

const tax = incomeTaxService.calculate({
  monthlyGross: 50000,
  config: {
    regime: "new",
    standardDeduction: 75000,
    rebateLimit: 700000,
    rebateAmount: 25000,
    cessRate: 4,
    slabs: [
      { from: 0, to: 300000, rate: 0 },
      { from: 300001, to: 700000, rate: 5 },
      { from: 700001, to: null, rate: 30 },
    ],
    surchargeSlabs: [],
  },
  investments: { section80C: 0, section80D: 0, homeLoanInterest: 0, nps: 0, educationLoan: 0, other: 0 },
});
assert(tax.monthlyTds >= 0 && tax.projectedAnnualIncome === 600000, "Income tax projected annual and TDS");

const employer = employerContributionService.aggregate(pf, esi);
assert(employer.total > 0, "Employer contribution aggregation");

console.log("\n=== All statutory payroll engine checks passed ===\n");
console.log("Indian Statutory Payroll Engine Version 1.0 Completed");
