/**
 * Payroll Calculation Engine verification.
 * Run: npx tsx scripts/verify-payroll-calculation-engine.ts
 */
import { salaryFormulaEngine } from "../src/modules/payroll/application/salary-formula.service";
import { LOAN_RECOVERY_COMPONENT_CODES } from "../src/modules/loan-recovery/domain/types";
import { PLACEHOLDER_COMPONENT_CODES, PAYROLL_ROUTES } from "../src/modules/payroll/domain/types";
import { EARNINGS_COMPONENT_CODES } from "../src/modules/earnings/domain/types";
import { STATUTORY_COMPONENT_CODES } from "../src/modules/statutory/domain/types";
import {
  payrollApproveSchema,
  payrollCalculateSchema,
  payrollGenerateSchema,
  payrollPeriodSchema,
} from "../src/modules/payroll/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Payroll Calculation Engine Verification ===\n");

assert(PERMISSIONS.PAYROLL.VIEW === "payroll.view.read", "payroll.view permission");
assert(PERMISSIONS.PAYROLL.GENERATE === "payroll.generate.create", "payroll.generate permission");
assert(PERMISSIONS.PAYROLL.CALCULATE === "payroll.calculate.create", "payroll.calculate permission");
assert(PERMISSIONS.PAYROLL.APPROVE === "payroll.approve.approve", "payroll.approve permission");
assert(PERMISSIONS.PAYROLL.LOCK === "payroll.lock.manage", "payroll.lock permission");
assert(PERMISSIONS.PAYROLL.UNLOCK === "payroll.unlock.override", "payroll.unlock permission");
assert(PERMISSIONS.PAYROLL.DELETE === "payroll.delete.delete", "payroll.delete permission");

assert(PAYROLL_ROUTES.generate === "/dashboard/payroll/generate", "Generate route");
assert(PAYROLL_ROUTES.preview === "/dashboard/payroll/preview", "Preview route");
assert(PAYROLL_ROUTES.history === "/dashboard/payroll/history", "History route");

const period = payrollPeriodSchema.safeParse({
  name: "July 2026",
  periodType: "monthly",
  payrollYear: 2026,
  payrollMonth: 7,
  startDate: "2026-07-01",
  endDate: "2026-07-31",
});
assert(period.success, "PayrollPeriodSchema valid");

const generate = payrollGenerateSchema.safeParse({
  payrollPeriodId: "00000000-0000-4000-8000-000000000001",
  scope: "company",
  previewOnly: true,
});
assert(generate.success, "PayrollGenerateSchema valid");

const calculate = payrollCalculateSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000002", version: 1 });
assert(calculate.success, "PayrollCalculateSchema valid");

const approve = payrollApproveSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000002", version: 1 });
assert(approve.success, "PayrollApproveSchema valid");

assert(PLACEHOLDER_COMPONENT_CODES.size === 0, "No payroll deduction placeholders remain");
assert(LOAN_RECOVERY_COMPONENT_CODES.has("LOAN_RECOVERY"), "LOAN_RECOVERY handled by loan recovery engine");
assert(EARNINGS_COMPONENT_CODES.has("BONUS"), "BONUS handled by earnings engine");
assert(EARNINGS_COMPONENT_CODES.has("OVERTIME"), "OVERTIME handled by earnings engine");
assert(STATUTORY_COMPONENT_CODES.has("PF"), "PF handled by statutory engine");
assert(STATUTORY_COMPONENT_CODES.has("ESI"), "ESI handled by statutory engine");

const grossFormula = salaryFormulaEngine.preview("BASIC + HRA + DA", { BASIC: 30000, HRA: 12000, DA: 6000 });
assert(grossFormula.valid && grossFormula.preview === 48000, "Payroll formula: BASIC + HRA + DA");

const netFormula = salaryFormulaEngine.preview("GROSS - LWP", { GROSS: 48000, LWP: 2000 });
assert(netFormula.valid && netFormula.preview === 46000, "Payroll formula: GROSS - LWP");

console.log("\n=== All payroll calculation engine checks passed ===\n");
console.log("Payroll Calculation Engine Version 1.0 Completed");
