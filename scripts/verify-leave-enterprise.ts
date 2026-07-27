/**
 * Enterprise Leave Management module verification.
 * Run: npx tsx scripts/verify-leave-enterprise.ts
 */
import { leaveDayCalculator } from "../src/modules/leave/application/leave-day-calculator";
import { DEFAULT_LEAVE_TYPES, LEAVE_ROUTES } from "../src/modules/leave/domain/types";
import {
  leaveApplicationSchema,
  leaveApprovalSchema,
  leaveBalanceAdjustSchema,
  leavePolicySchema,
  leaveTypeSchema,
} from "../src/modules/leave/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Enterprise Leave Management Verification ===\n");

assert(PERMISSIONS.LEAVE.VIEW === "leave.view.read", "leave.view permission");
assert(PERMISSIONS.LEAVE.APPLY === "leave.apply.create", "leave.apply permission");
assert(PERMISSIONS.LEAVE.APPROVE === "leave.approve.approve", "leave.approve permission");
assert(PERMISSIONS.LEAVE.REJECT === "leave.reject.reject", "leave.reject permission");
assert(PERMISSIONS.LEAVE.CANCEL === "leave.cancel.delete", "leave.cancel permission");
assert(PERMISSIONS.LEAVE.MANAGE === "leave.module.manage", "leave.manage permission");
assert(PERMISSIONS.LEAVE.POLICY.MANAGE === "leave.policy.manage", "leave.policy.manage permission");
assert(PERMISSIONS.LEAVE.BALANCE.MANAGE === "leave.balance.manage", "leave.balance.manage permission");

assert(LEAVE_ROUTES.dashboard === "/dashboard/leave", "Leave dashboard route");
assert(LEAVE_ROUTES.apply === "/dashboard/leave/apply", "Leave apply route");
assert(LEAVE_ROUTES.calendar === "/dashboard/leave/calendar", "Leave calendar route");

assert(DEFAULT_LEAVE_TYPES.length >= 12, "Default leave types seeded in domain");

const application = leaveApplicationSchema.safeParse({
  leaveTypeId: "00000000-0000-4000-8000-000000000001",
  startDate: "2026-07-28",
  endDate: "2026-07-30",
  reason: "Family function",
  halfDayType: "none",
});
assert(application.success, "LeaveApplicationSchema accepts valid input");

const halfDay = leaveApplicationSchema.safeParse({
  leaveTypeId: "00000000-0000-4000-8000-000000000001",
  startDate: "2026-07-28",
  endDate: "2026-07-28",
  reason: "Doctor visit",
  halfDayType: "first_half",
});
assert(halfDay.success, "Half-day leave schema");

const hourly = leaveApplicationSchema.safeParse({
  leaveTypeId: "00000000-0000-4000-8000-000000000001",
  startDate: "2026-07-28",
  endDate: "2026-07-28",
  leaveUnit: "hours",
  startTime: "10:00",
  endTime: "13:00",
  reason: "Short errand",
});
assert(hourly.success, "Hourly leave schema");

const approval = leaveApprovalSchema.safeParse({
  leaveId: "00000000-0000-4000-8000-000000000002",
  version: 1,
  action: "approve",
});
assert(approval.success, "LeaveApprovalSchema accepts valid input");

const leaveType = leaveTypeSchema.safeParse({ name: "Casual Leave", code: "CL", isPaid: true });
assert(leaveType.success, "LeaveTypeSchema accepts valid input");

const policy = leavePolicySchema.safeParse({ name: "Default CL Policy", creditAmount: 12 });
assert(policy.success, "LeavePolicySchema accepts valid input");

const balance = leaveBalanceAdjustSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000003",
  leaveTypeId: "00000000-0000-4000-8000-000000000001",
  year: 2026,
  credited: 12,
});
assert(balance.success, "LeaveBalanceSchema accepts valid input");

const hours = leaveDayCalculator.calculateHours("09:00", "13:30");
assert(hours === 4.5, "Hourly leave calculation");

console.log("\n=== All enterprise leave checks passed ===\n");
console.log("Enterprise Leave Management Version 1.0 Completed");
