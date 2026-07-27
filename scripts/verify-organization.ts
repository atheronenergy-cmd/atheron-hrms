/**
 * Organization module verification.
 * Run: npx tsx scripts/verify-organization.ts
 */
import { ORG_ROUTES } from "../src/modules/organization/domain/types";
import {
  branchSchema,
  companySchema,
  createDepartmentSchema,
  createDesignationSchema,
  createHolidaySchema,
  createPolicySchema,
  createWorkingScheduleSchema,
} from "../src/modules/organization/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Organization Module Verification ===\n");

assert(PERMISSIONS.COMPANY.PROFILE.READ === "company.profile.read", "Company read permission");
assert(PERMISSIONS.BRANCH.PROFILE.CREATE === "branch.profile.create", "Branch create permission");
assert(PERMISSIONS.HR.POLICY.MANAGE === "hr.policy.manage", "HR policy manage permission");
assert(ORG_ROUTES.dashboard === "/dashboard/company", "Company dashboard route");

const company = companySchema.safeParse({
  name: "Atheron Energy Pvt Ltd",
  slug: "atheron-energy",
  companyCode: "ATH001",
  countryCode: "IN",
  currencyCode: "INR",
});
assert(company.success, "CompanySchema accepts valid company");

const branch = branchSchema.safeParse({ name: "HQ", code: "HQ01" });
assert(branch.success, "BranchSchema accepts valid branch");

const dept = createDepartmentSchema.safeParse({ name: "Production", code: "PROD" });
assert(dept.success, "DepartmentSchema accepts valid department");

const desig = createDesignationSchema.safeParse({ name: "Engineer", code: "ENG", level: 3 });
assert(desig.success, "DesignationSchema accepts valid designation");

const holiday = createHolidaySchema.safeParse({
  name: "Republic Day",
  date: new Date("2026-01-26"),
  holidayType: "public",
});
assert(holiday.success, "HolidaySchema accepts valid holiday");

const policy = createPolicySchema.safeParse({
  category: "attendance",
  name: "Late Grace",
  code: "ATT-LATE",
  rules: { graceMinutes: 15 },
});
assert(policy.success, "PolicySchema accepts valid policy");

const schedule = createWorkingScheduleSchema.safeParse({
  name: "Standard Office",
  code: "STD",
  startTime: "09:00",
  endTime: "18:00",
});
assert(schedule.success, "WorkingScheduleSchema accepts valid schedule");

console.log("\n=== All organization checks passed ===\n");
