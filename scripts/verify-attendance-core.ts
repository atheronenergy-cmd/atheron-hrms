/**
 * Attendance Core module verification.
 * Run: npx tsx scripts/verify-attendance-core.ts
 */
import { attendanceCalculationService } from "../src/modules/attendance/application/attendance-calculation.service";
import { DEFAULT_ATTENDANCE_RULE } from "../src/modules/attendance/domain/types";
import {
  attendancePunchSchema,
  attendanceRuleSchema,
  correctionRequestSchema,
  manualAttendanceSchema,
} from "../src/modules/attendance/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Attendance Core Module Verification ===\n");

assert(PERMISSIONS.ATTENDANCE.RECORD.READ === "attendance.record.read", "View permission");
assert(PERMISSIONS.ATTENDANCE.RECORD.CREATE === "attendance.record.create", "Create permission");
assert(PERMISSIONS.ATTENDANCE.RECORD.APPROVE === "attendance.record.approve", "Approve permission");
assert(PERMISSIONS.ATTENDANCE.RECORD.EXPORT === "attendance.record.export", "Export permission");
assert(PERMISSIONS.ATTENDANCE.RULE.MANAGE === "attendance.rule.manage", "Manage rules permission");

const punch = attendancePunchSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  punchType: "in",
  method: "manual",
});
assert(punch.success, "AttendancePunchSchema accepts valid input");

const manual = manualAttendanceSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  date: "2026-07-24",
  status: "present",
});
assert(manual.success, "ManualAttendanceSchema accepts valid input");

const correction = correctionRequestSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  attendanceDate: "2026-07-24",
  correctionType: "missed_punch",
  reason: "Forgot check-out",
});
assert(correction.success, "CorrectionRequestSchema accepts valid input");

const rule = attendanceRuleSchema.safeParse({ name: "Default", gracePeriodMinutes: 15 });
assert(rule.success, "AttendanceRuleSchema accepts valid input");

const shift = attendanceCalculationService.shiftFromTimes(
  new Date("1970-01-01T09:00:00"),
  new Date("1970-01-01T18:00:00"),
  60,
  false,
);
const result = attendanceCalculationService.calculate({
  checkInAt: new Date("2026-07-24T09:40:00"),
  checkOutAt: new Date("2026-07-24T18:00:00"),
  breakMinutes: 60,
  shift,
  rule: DEFAULT_ATTENDANCE_RULE,
});
assert(result.lateMinutes === 25, "Late calculation with 15 min grace (40 min after 9 -> 25 min late)");
assert(result.effectiveWorkMinutes === 440, "Effective working hours calculated");
assert(result.status === "late", "Status resolved as late");

const overtimeResult = attendanceCalculationService.calculate({
  checkInAt: new Date("2026-07-24T09:00:00"),
  checkOutAt: new Date("2026-07-24T20:00:00"),
  breakMinutes: 60,
  shift,
  rule: DEFAULT_ATTENDANCE_RULE,
});
assert(overtimeResult.overtimeMinutes > 0, "Overtime calculation");

console.log("\n=== All attendance core checks passed ===\n");
