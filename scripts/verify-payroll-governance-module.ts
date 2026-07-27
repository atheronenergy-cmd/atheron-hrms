/**
 * Enterprise Payroll Governance Module verification.
 * Run: npx tsx scripts/verify-payroll-governance-module.ts
 */
import { computeContentHash } from "../src/modules/payroll-governance/application/payroll-governance-audit.service";
import {
  DEFAULT_APPROVAL_WORKFLOW,
  GOVERNANCE_REPORT_TYPES,
  PAYROLL_GOVERNANCE_ROUTES,
} from "../src/modules/payroll-governance/domain/types";
import {
  approvalActionSchema,
  arrearSchema,
  backupSchema,
  complianceSnapshotSchema,
  financialYearSchema,
  governanceReportSchema,
  payrollLockSchema,
  payrollUnlockSchema,
  retroPayrollSchema,
  rollbackSchema,
  snapshotSchema,
} from "../src/modules/payroll-governance/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Enterprise Payroll Governance Module Verification ===\n");

assert(PERMISSIONS.PAYROLL.APPROVE === "payroll.approve.approve", "payroll.approve permission");
assert(PERMISSIONS.PAYROLL.LOCK === "payroll.lock.manage", "payroll.lock permission");
assert(PERMISSIONS.PAYROLL.UNLOCK === "payroll.unlock.override", "payroll.unlock permission");
assert(PERMISSIONS.PAYROLL.ROLLBACK === "payroll.rollback.manage", "payroll.rollback permission");
assert(PERMISSIONS.PAYROLL.RETRO.MANAGE === "payroll.retro.manage", "payroll.retro.manage permission");
assert(PERMISSIONS.PAYROLL.ARREAR.MANAGE === "payroll.arrear.manage", "payroll.arrear.manage permission");
assert(PERMISSIONS.PAYROLL.YEAR.CLOSE === "payroll.year.close", "payroll.year.close permission");
assert(PERMISSIONS.PAYROLL.BACKUP.MANAGE === "payroll.backup.manage", "payroll.backup.manage permission");

assert(PAYROLL_GOVERNANCE_ROUTES.dashboard === "/dashboard/payroll/governance", "Governance dashboard route");
assert(DEFAULT_APPROVAL_WORKFLOW.length === 4, "Default 4-step approval workflow");
assert(GOVERNANCE_REPORT_TYPES.length === 7, "Seven governance reports");

assert(approvalActionSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001", action: "submit" }).success, "Approval schema");
assert(payrollLockSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001", version: 1 }).success, "Payroll lock schema");
assert(payrollUnlockSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001", version: 1, reason: "Correction required for statutory update" }).success, "Payroll unlock schema");
assert(retroPayrollSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000002",
  retroType: "late_increment",
  originalPeriodStart: "2025-04-01",
  originalPeriodEnd: "2025-04-30",
  originalAmount: 50000,
  revisedAmount: 55000,
}).success, "Retro payroll schema");
assert(arrearSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000002",
  arrearType: "salary",
  amount: 5000,
  periodStart: "2025-04-01",
  periodEnd: "2025-04-30",
}).success, "Arrear schema");
assert(financialYearSchema.safeParse({
  code: "FY2025-26",
  label: "Financial Year 2025-26",
  startDate: "2025-04-01",
  endDate: "2026-03-31",
}).success, "Financial year schema");
assert(snapshotSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001" }).success, "Snapshot schema");
assert(backupSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001" }).success, "Backup schema");
assert(complianceSnapshotSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001" }).success, "Compliance snapshot schema");
assert(rollbackSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001", versionNumber: 1, reason: "Rollback to previous approved state" }).success, "Rollback schema");
assert(governanceReportSchema.safeParse({ reportType: "approval_history" }).success, "Governance report schema");

const hash = computeContentHash({ test: "payload" });
assert(hash.length === 64, "Content hash SHA-256 generation");

console.log("\n=== All Payroll Governance checks passed ===\n");
console.log("Enterprise Payroll Governance Version 1.0 Completed");
