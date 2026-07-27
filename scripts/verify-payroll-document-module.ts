/**
 * Enterprise Payroll Document Module verification.
 * Run: npx tsx scripts/verify-payroll-document-module.ts
 */
import { generatePayslipPassword, hashPassword, verifyPassword } from "../src/modules/payroll-documents/application/payslip-password.service";
import { PAYROLL_DOCUMENT_ROUTES } from "../src/modules/payroll-documents/domain/types";
import {
  emailDistributionSchema,
  payrollExportSchema,
  payslipBulkGenerateSchema,
  payslipGenerateSchema,
  pdfGenerationSchema,
  salaryCertificateSchema,
} from "../src/modules/payroll-documents/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Enterprise Payroll Document Module Verification ===\n");

assert(PERMISSIONS.PAYSLIP.VIEW === "payslip.view.read", "payslip.view permission");
assert(PERMISSIONS.PAYSLIP.GENERATE === "payslip.generate.create", "payslip.generate permission");
assert(PERMISSIONS.PAYSLIP.DOWNLOAD === "payslip.download.read", "payslip.download permission");
assert(PERMISSIONS.PAYSLIP.EMAIL === "payslip.email.manage", "payslip.email permission");
assert(PERMISSIONS.SALARY_CERTIFICATE.GENERATE === "salary_certificate.generate.create", "salary_certificate.generate permission");
assert(PERMISSIONS.PAYROLL_EXPORT.GENERATE === "payroll_export.generate.create", "payroll_export.generate permission");

assert(PAYROLL_DOCUMENT_ROUTES.dashboard === "/dashboard/payroll/payslips", "Payslip dashboard route");
assert(PAYROLL_DOCUMENT_ROUTES.myPayslips === "/dashboard/payroll/my-payslips", "Employee payslip portal route");

assert(payslipGenerateSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001" }).success, "Payslip generate schema");
assert(payslipBulkGenerateSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001", mergePdf: true }).success, "Bulk payslip schema");
assert(salaryCertificateSchema.safeParse({ employeeId: "00000000-0000-4000-8000-000000000002", authorizedSignatory: "HR Manager" }).success, "Salary certificate schema");
assert(pdfGenerationSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001", passwordProtected: true }).success, "PDF generation schema");
assert(emailDistributionSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001" }).success, "Email distribution schema");
assert(payrollExportSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001", exportType: "payroll_register" }).success, "Payroll export schema");

const password = generatePayslipPassword("employee_id_dob", {
  employeeCode: "EMP001",
  dateOfBirth: new Date("1990-05-15"),
});
assert(Boolean(password), "Password generation employee_id_dob");
const hash = hashPassword(password!);
assert(verifyPassword(password!, hash), "Password hash verification");

const mobilePassword = generatePayslipPassword("mobile_last4", { employeeCode: "EMP001", phone: "9876543210" });
assert(mobilePassword === "3210", "Mobile last4 password rule");

console.log("\n=== All Payroll Document checks passed ===\n");
console.log("Enterprise Payroll Document Module Version 1.0 Completed");
