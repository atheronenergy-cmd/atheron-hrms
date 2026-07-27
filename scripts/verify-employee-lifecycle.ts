/**
 * Employee Lifecycle module verification.
 * Run: npx tsx scripts/verify-employee-lifecycle.ts
 */
import { DEFAULT_EXIT_CLEARANCE_ITEMS, DEFAULT_JOINING_CHECKLIST, LIFECYCLE_EVENT_LABELS } from "../src/modules/employee-lifecycle/domain/types";
import {
  confirmationSchema,
  joiningInitSchema,
  probationSchema,
  promotionSchema,
  resignationSchema,
  salaryRevisionSchema,
  transferSchema,
  workflowActionSchema,
} from "../src/modules/employee-lifecycle/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Employee Lifecycle Module Verification ===\n");

assert(PERMISSIONS.EMPLOYEE.LIFECYCLE.READ === "employee.lifecycle.read", "Lifecycle read permission");
assert(PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE === "employee.lifecycle.manage", "Lifecycle manage permission");
assert(PERMISSIONS.EMPLOYEE.PROBATION.MANAGE === "employee.probation.manage", "Probation manage permission");
assert(PERMISSIONS.EMPLOYEE.CONFIRMATION.MANAGE === "employee.confirmation.manage", "Confirmation manage permission");
assert(PERMISSIONS.EMPLOYEE.TRANSFER.MANAGE === "employee.transfer.manage", "Transfer manage permission");
assert(PERMISSIONS.EMPLOYEE.PROMOTION.MANAGE === "employee.promotion.manage", "Promotion manage permission");
assert(PERMISSIONS.EMPLOYEE.RESIGNATION.MANAGE === "employee.resignation.manage", "Resignation manage permission");
assert(PERMISSIONS.EMPLOYEE.TERMINATION.MANAGE === "employee.termination.manage", "Termination manage permission");

assert(DEFAULT_JOINING_CHECKLIST.length === 6, "Six default joining checklist items");
assert(DEFAULT_EXIT_CLEARANCE_ITEMS.length === 6, "Six default exit clearance items");
assert(LIFECYCLE_EVENT_LABELS.employee_joined === "Employee Joined", "Lifecycle event labels");

const joining = joiningInitSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  joiningDate: "2026-01-01",
});
assert(joining.success, "JoiningInitSchema accepts valid input");

const probation = probationSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  startDate: "2026-01-01",
  endDate: "2026-04-01",
});
assert(probation.success, "ProbationSchema accepts valid input");

const confirmation = confirmationSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  confirmationDate: "2026-04-01",
  rating: 4.5,
});
assert(confirmation.success, "ConfirmationSchema accepts valid input");

const transfer = transferSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  transferType: "department",
  newValue: "Quality Department",
  effectiveDate: "2026-05-01",
});
assert(transfer.success, "TransferSchema accepts valid input");

const promotion = promotionSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  newDesignationId: "00000000-0000-4000-8000-000000000002",
  promotionDate: "2026-06-01",
});
assert(promotion.success, "PromotionSchema accepts valid input");

const salary = salaryRevisionSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  newSalary: 75000,
  effectiveDate: "2026-07-01",
  revisionType: "annual_increment",
});
assert(salary.success, "SalaryRevisionSchema accepts valid input");

const resignation = resignationSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  resignationDate: "2026-08-01",
  lastWorkingDate: "2026-09-01",
  reason: "career_growth",
});
assert(resignation.success, "ResignationSchema accepts valid input");

const workflow = workflowActionSchema.safeParse({
  workflowId: "00000000-0000-4000-8000-000000000003",
  version: 1,
  action: "approve",
});
assert(workflow.success, "WorkflowActionSchema accepts valid input");

console.log("\n=== All employee lifecycle checks passed ===\n");
