import { z } from "zod";

import { ACCOUNTING_PROVIDERS, BANK_PROVIDERS, PAYROLL_REPORT_TYPES } from "@/modules/payroll-reporting/domain/types";

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reportFiltersSchema = z.object({
  branchId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  designationId: uuidSchema.optional(),
  employeeId: uuidSchema.optional(),
  payrollPeriodId: uuidSchema.optional(),
  payrollId: uuidSchema.optional(),
  status: z.string().optional(),
  employmentType: z.string().optional(),
  costCenterId: uuidSchema.optional(),
  periodStart: dateSchema.optional(),
  periodEnd: dateSchema.optional(),
});

export const payrollReportSchema = z.object({
  reportType: z.enum([
    "monthly_payroll",
    "department_payroll",
    "branch_payroll",
    "employee_payroll",
    "salary_register",
    "payroll_summary",
    "payroll_variance",
    "payroll_comparison",
  ]),
  payrollId: uuidSchema.optional(),
  payrollPeriodId: uuidSchema.optional(),
  filters: reportFiltersSchema.default({}),
  exportFile: z.boolean().default(false),
});

export const salaryRegisterSchema = z.object({
  payrollId: uuidSchema,
  filters: reportFiltersSchema.default({}),
  exportFile: z.boolean().default(false),
});

export const bankBatchSchema = z.object({
  payrollId: uuidSchema,
  providerCode: z.enum(BANK_PROVIDERS as [string, ...string[]]),
  fileFormat: z.enum(["neft", "rtgs", "csv", "excel", "custom"]),
  mappingConfig: z.record(z.unknown()).default({}),
  employeeIds: z.array(uuidSchema).optional(),
});

export const bankBatchApproveSchema = z.object({
  batchId: uuidSchema,
});

export const bankTransferStatusSchema = z.object({
  recordId: uuidSchema,
  status: z.enum(["pending", "processing", "transferred", "completed", "failed", "rejected", "cancelled", "retry"]),
  failureReason: z.string().max(500).optional(),
});

export const accountingExportSchema = z.object({
  payrollId: uuidSchema,
  providerCode: z.enum(ACCOUNTING_PROVIDERS as [string, ...string[]]),
  mappingConfig: z.record(z.unknown()).default({}),
  generateJournal: z.boolean().default(true),
});

export const journalEntrySchema = z.object({
  payrollId: uuidSchema,
  entryDate: dateSchema.optional(),
  description: z.string().max(255).optional(),
});

export const costCenterSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/),
  centerType: z.enum(["cost_center", "sub_cost_center", "project", "business_unit", "location"]).default("cost_center"),
  parentId: uuidSchema.optional(),
  description: z.string().max(500).optional(),
});

export const analyticsQuerySchema = z.object({
  payrollId: uuidSchema.optional(),
  periodStart: dateSchema.optional(),
  periodEnd: dateSchema.optional(),
  refresh: z.boolean().default(false),
});

export const payrollReportingReportSchema = z.object({
  reportType: z.enum(["payslip_generation", "email_delivery", "archive", "salary_certificate"]).optional(),
}).passthrough();
