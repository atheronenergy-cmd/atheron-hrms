/**
 * Salary Structure module verification.
 * Run: npx tsx scripts/verify-salary-structure.ts
 */
import { salaryFormulaEngine } from "../src/modules/payroll/application/salary-formula.service";
import { DEFAULT_SALARY_STRUCTURES, SALARY_ROUTES } from "../src/modules/payroll/domain/types";
import {
  employeeSalarySchema,
  salaryComponentSchema,
  salaryFormulaSchema,
  salaryRevisionSchema,
  salaryStructureSchema,
} from "../src/modules/payroll/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Salary Structure Module Verification ===\n");

assert(PERMISSIONS.PAYROLL.SALARY.VIEW === "salary.view.read", "salary.view permission");
assert(PERMISSIONS.PAYROLL.SALARY.CREATE === "salary.create.create", "salary.create permission");
assert(PERMISSIONS.PAYROLL.SALARY.UPDATE === "salary.update.update", "salary.update permission");
assert(PERMISSIONS.PAYROLL.SALARY.DELETE === "salary.delete.delete", "salary.delete permission");
assert(PERMISSIONS.PAYROLL.SALARY.ASSIGN === "salary.assign.assign", "salary.assign permission");
assert(PERMISSIONS.PAYROLL.SALARY.APPROVE === "salary.approve.approve", "salary.approve permission");

assert(SALARY_ROUTES.structures === "/dashboard/payroll/structures", "Structures route");
assert(DEFAULT_SALARY_STRUCTURES.length >= 9, "Default salary structures defined");

const structure = salaryStructureSchema.safeParse({ name: "Engineer", code: "ENGINEER" });
assert(structure.success, "SalaryStructureSchema valid");

const component = salaryComponentSchema.safeParse({
  salaryStructureId: "00000000-0000-4000-8000-000000000001",
  name: "HRA",
  code: "HRA",
  componentType: "earning",
  calculationType: "percentage",
  percentageOf: "BASIC",
  percentageValue: 40,
});
assert(component.success, "SalaryComponentSchema valid");

const formula = salaryFormulaSchema.safeParse({ name: "HRA Formula", code: "HRA_F", expression: "BASIC * 40%" });
assert(formula.success, "SalaryFormulaSchema valid");

const assignment = employeeSalarySchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000002",
  salaryStructureId: "00000000-0000-4000-8000-000000000001",
  baseSalary: 50000,
  monthlyCtc: 75000,
  effectiveFrom: "2026-07-01",
});
assert(assignment.success, "EmployeeSalarySchema valid");

const revision = salaryRevisionSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000002",
  previousSalary: 50000,
  newSalary: 55000,
  effectiveDate: "2026-08-01",
  reason: "Annual increment",
});
assert(revision.success, "SalaryRevisionSchema valid");

const validation = salaryFormulaEngine.validate("BASIC * 40%");
assert(validation.valid, "Formula validation: BASIC * 40%");

const preview = salaryFormulaEngine.preview("BASIC + DA", { BASIC: 50000, DA: 10000 });
assert(preview.valid && preview.preview === 60000, "Formula preview: BASIC + DA");

const grossPct = salaryFormulaEngine.preview("GROSS * 12%", { GROSS: 100000 });
assert(grossPct.valid && grossPct.preview === 12000, "Formula preview: GROSS * 12%");

console.log("\n=== All salary structure checks passed ===\n");
console.log("Salary Structure Module Version 1.0 Completed");
