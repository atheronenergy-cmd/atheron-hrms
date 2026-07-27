/**
 * Employee module verification.
 * Run: npx tsx scripts/verify-employee.ts
 */
import { EMPLOYEE_ROUTES } from "../src/modules/employee/domain/types";
import {
  createEmployeeSchema,
  employeeSearchSchema,
  updateEmployeeSchema,
} from "../src/modules/employee/validation/schemas";
import { generateCode } from "../src/shared/utils/id.utils";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Employee Module Verification ===\n");

assert(PERMISSIONS.EMPLOYEE.PROFILE.READ === "employee.profile.read", "Employee read permission");
assert(PERMISSIONS.EMPLOYEE.PROFILE.CREATE === "employee.profile.create", "Employee create permission");
assert(PERMISSIONS.EMPLOYEE.PROFILE.IMPORT === "employee.profile.import", "Employee import permission");
assert(PERMISSIONS.EMPLOYEE.PROFILE.EXPORT === "employee.profile.export", "Employee export permission");
assert(EMPLOYEE_ROUTES.list === "/dashboard/employees", "Employee list route");

const code = generateCode("ATH", 1);
assert(code === "ATH-000001", "Employee ID format ATH-000001");

const create = createEmployeeSchema.safeParse({
  branchId: "00000000-0000-4000-8000-000000000001",
  departmentId: "00000000-0000-4000-8000-000000000002",
  designationId: "00000000-0000-4000-8000-000000000003",
  firstName: "Rahul",
  lastName: "Sharma",
  email: "rahul@atheron.com",
  dateOfJoining: new Date("2026-01-15"),
  autoGenerateCode: true,
});
assert(create.success, "CreateEmployeeSchema accepts valid employee");

const update = updateEmployeeSchema.safeParse({
  id: "00000000-0000-4000-8000-000000000004",
  version: 1,
  firstName: "Rahul",
});
assert(update.success, "UpdateEmployeeSchema accepts partial update");

const search = employeeSearchSchema.safeParse({ page: "1", pageSize: "25", search: "ATH" });
assert(search.success, "EmployeeSearchSchema accepts search query");

console.log("\n=== All employee checks passed ===\n");
