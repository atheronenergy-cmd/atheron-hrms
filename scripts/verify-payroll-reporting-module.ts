/**
 * Enterprise Payroll Reporting & Banking Module verification.
 * Run: npx tsx scripts/verify-payroll-reporting-module.ts
 */
import { getAccountingProvider, listAccountingProviders } from "../src/modules/payroll-reporting/application/accounting-providers/index";
import { getBankTransferProvider, listBankProviders } from "../src/modules/payroll-reporting/application/bank-providers/index";
import { BANK_PROVIDERS, DEFAULT_JOURNAL_ACCOUNTS, PAYROLL_REPORTING_ROUTES } from "../src/modules/payroll-reporting/domain/types";
import {
  accountingExportSchema,
  bankBatchSchema,
  costCenterSchema,
  journalEntrySchema,
  payrollReportSchema,
  salaryRegisterSchema,
} from "../src/modules/payroll-reporting/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Enterprise Payroll Reporting & Banking Module Verification ===\n");

assert(PERMISSIONS.PAYROLL_REPORTING.VIEW === "payroll.report.view", "payroll.report.view permission");
assert(PERMISSIONS.PAYROLL_REPORTING.EXPORT === "payroll.report.export", "payroll.report.export permission");
assert(PERMISSIONS.BANK_TRANSFER.GENERATE === "bank_transfer.generate.create", "bank_transfer.generate permission");
assert(PERMISSIONS.BANK_TRANSFER.APPROVE === "bank_transfer.approve.approve", "bank_transfer.approve permission");
assert(PERMISSIONS.ACCOUNTING.EXPORT === "accounting.export.create", "accounting.export permission");
assert(PERMISSIONS.ANALYTICS.VIEW === "analytics.view.read", "analytics.view permission");
assert(PERMISSIONS.COST_CENTER.MANAGE === "cost_center.manage.manage", "cost_center.manage permission");

assert(PAYROLL_REPORTING_ROUTES.dashboard === "/dashboard/payroll/reporting", "Reporting dashboard route");
assert(BANK_PROVIDERS.length >= 10, "Bank providers registered");

assert(payrollReportSchema.safeParse({ reportType: "monthly_payroll", payrollId: "00000000-0000-4000-8000-000000000001" }).success, "Payroll report schema");
assert(salaryRegisterSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001" }).success, "Salary register schema");
assert(bankBatchSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001", providerCode: "hdfc", fileFormat: "neft" }).success, "Bank batch schema");
assert(accountingExportSchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001", providerCode: "tally_prime" }).success, "Accounting export schema");
assert(journalEntrySchema.safeParse({ payrollId: "00000000-0000-4000-8000-000000000001" }).success, "Journal entry schema");
assert(costCenterSchema.safeParse({ name: "Manufacturing", code: "MFG", centerType: "cost_center" }).success, "Cost center schema");

const bankProvider = getBankTransferProvider("generic_csv");
const sampleRows = [{
  employeeId: "1", employeeCode: "E001", beneficiaryName: "Test User", accountNumber: "1234567890", ifscCode: "HDFC0001234", amount: 50000, paymentMode: "NEFT",
}];
const validationErrors = bankProvider.validate(sampleRows);
assert(validationErrors.length === 0, "Bank provider validation");
const file = bankProvider.generateFile(sampleRows, "csv");
assert(file.content.includes("Beneficiary Name"), "Bank CSV file generation");

const accountingProvider = getAccountingProvider("journal_entry");
const exportFile = accountingProvider.generateExport([
  { accountCode: DEFAULT_JOURNAL_ACCOUNTS.salaryExpense.code, accountName: DEFAULT_JOURNAL_ACCOUNTS.salaryExpense.name, debitAmount: 100000, creditAmount: 0 },
  { accountCode: DEFAULT_JOURNAL_ACCOUNTS.cashBank.code, accountName: DEFAULT_JOURNAL_ACCOUNTS.cashBank.name, debitAmount: 0, creditAmount: 100000 },
]);
assert(exportFile.content.includes("Salary Expense"), "Accounting export generation");
assert(listBankProviders().length >= 10, "List bank providers");
assert(listAccountingProviders().length >= 7, "List accounting providers");

console.log("\n=== All Payroll Reporting checks passed ===\n");
console.log("Enterprise Payroll Reporting & Banking Module Version 1.0 Completed");
