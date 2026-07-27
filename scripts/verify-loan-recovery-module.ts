/**
 * Enterprise Loan & Recovery Module verification.
 * Run: npx tsx scripts/verify-loan-recovery-module.ts
 */
import {
  calculateInstallmentAmount,
  buildEmiComponents,
} from "../src/modules/loan-recovery/application/interest-calculation.service";
import { generateEmiSchedule } from "../src/modules/loan-recovery/application/loan-calculation.service";
import {
  LOAN_RECOVERY_COMPONENT_CODES,
  LOAN_RECOVERY_ROUTES,
} from "../src/modules/loan-recovery/domain/types";
import { PLACEHOLDER_COMPONENT_CODES } from "../src/modules/payroll/domain/types";
import {
  employeeLoanSchema,
  foreclosureSchema,
  loanPolicySchema,
  loanTypeSchema,
  salaryAdvanceSchema,
} from "../src/modules/loan-recovery/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

console.log("\n=== Enterprise Loan & Recovery Module Verification ===\n");

assert(PERMISSIONS.LOAN.VIEW === "loan.view.read", "loan.view permission");
assert(PERMISSIONS.LOAN.CREATE === "loan.create.create", "loan.create permission");
assert(PERMISSIONS.LOAN.APPROVE === "loan.approve.approve", "loan.approve permission");
assert(PERMISSIONS.LOAN.RECOVER === "loan.recover.manage", "loan.recover permission");
assert(PERMISSIONS.LOAN.FORECLOSE === "loan.foreclose.manage", "loan.foreclose permission");
assert(PERMISSIONS.ADVANCE.MANAGE === "advance.manage.manage", "advance.manage permission");

assert(LOAN_RECOVERY_ROUTES.dashboard === "/dashboard/loans", "Loan dashboard route");
assert(!PLACEHOLDER_COMPONENT_CODES.has("LOAN_RECOVERY"), "LOAN_RECOVERY removed from payroll placeholders");
assert(LOAN_RECOVERY_COMPONENT_CODES.has("LOAN_RECOVERY"), "LOAN_RECOVERY in recovery codes");

assert(loanTypeSchema.safeParse({ name: "Emergency Loan", code: "EMERGENCY", category: "emergency", interestType: "flat", defaultRate: 8 }).success, "Loan type schema");
assert(loanPolicySchema.safeParse({ name: "Default Policy", code: "DEFAULT", effectiveFrom: "2026-01-01", maxLoanAmount: 500000 }).success, "Loan policy schema");
assert(employeeLoanSchema.safeParse({ employeeId: "00000000-0000-4000-8000-000000000001", loanTypeId: "00000000-0000-4000-8000-000000000002", principalAmount: 100000, tenureMonths: 12, startRecoveryDate: "2026-08-01" }).success, "Employee loan schema");
assert(salaryAdvanceSchema.safeParse({ employeeId: "00000000-0000-4000-8000-000000000001", advanceType: "festival", amount: 15000, recoveryStartDate: "2026-08-01", installmentCount: 3 }).success, "Salary advance schema");
assert(foreclosureSchema.safeParse({ loanId: "00000000-0000-4000-8000-000000000003", foreclosureType: "full_prepayment", amountPaid: 85000 }).success, "Foreclosure schema");

const noInterestEmi = calculateInstallmentAmount({ principal: 120000, annualRate: 0, tenure: 12, interestType: "none" });
assert(noInterestEmi === 10000, "No interest EMI calculation");

const reducingEmi = calculateInstallmentAmount({ principal: 100000, annualRate: 12, tenure: 12, interestType: "reducing_balance" });
assert(reducingEmi > 8800 && reducingEmi < 9000, "Reducing balance EMI calculation");

const flatEmi = calculateInstallmentAmount({ principal: 100000, annualRate: 10, tenure: 10, interestType: "flat" });
assert(flatEmi > 10000, "Flat interest EMI calculation");

const schedule = generateEmiSchedule({
  principal: 60000,
  interestType: "none",
  interestRate: 0,
  tenure: 6,
  recoveryMode: "monthly",
  startRecoveryDate: new Date("2026-01-01"),
});
assert(schedule.length === 6, "EMI schedule length");
assert(schedule[0]!.emiNumber === 1, "EMI number generated");
assert(round2(schedule.reduce((s, e) => s + e.principalComponent, 0)) === 60000, "EMI principal totals match");

const components = buildEmiComponents({
  principal: 100000,
  annualRate: 12,
  tenure: 12,
  interestType: "reducing_balance",
  installmentAmount: reducingEmi,
});
assert(components.length === 12, "Reducing balance component schedule");
assert(components[components.length - 1]!.outstandingBalance === 0, "Final outstanding zero");

console.log("\n=== All Loan & Recovery checks passed ===\n");
console.log("Enterprise Loan & Recovery Module Version 1.0 Completed");
