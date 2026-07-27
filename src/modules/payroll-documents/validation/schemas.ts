import { z } from "zod";

import { EXPORT_TYPES } from "@/modules/payroll-documents/domain/types";

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const payslipGenerateSchema = z.object({
  payrollId: uuidSchema,
  employeeIds: z.array(uuidSchema).optional(),
  passwordRule: z.enum(["employee_id_dob", "mobile_last4", "employee_code_dob", "custom_policy", "none"]).optional(),
  revisionReason: z.string().max(500).optional(),
  regenerate: z.boolean().default(false),
});

export const payslipBulkGenerateSchema = z.object({
  payrollId: uuidSchema,
  mergePdf: z.boolean().default(false),
  passwordProtected: z.boolean().default(true),
  passwordRule: z.enum(["employee_id_dob", "mobile_last4", "employee_code_dob", "custom_policy", "none"]).optional(),
});

export const payslipDownloadSchema = z.object({
  payslipId: uuidSchema,
  password: z.string().optional(),
});

export const salaryCertificateSchema = z.object({
  employeeId: uuidSchema,
  authorizedSignatory: z.string().min(2).max(150),
  issuedDate: dateSchema.optional(),
  currentSalary: z.coerce.number().positive().optional(),
  grossSalary: z.coerce.number().positive().optional(),
});

export const pdfGenerationSchema = z.object({
  payslipId: uuidSchema.optional(),
  payrollId: uuidSchema.optional(),
  merge: z.boolean().default(false),
  passwordProtected: z.boolean().default(true),
  passwordRule: z.enum(["employee_id_dob", "mobile_last4", "employee_code_dob", "custom_policy", "none"]).optional(),
});

export const emailDistributionSchema = z.object({
  payslipId: uuidSchema.optional(),
  payrollId: uuidSchema.optional(),
  employeeIds: z.array(uuidSchema).optional(),
  retryFailed: z.boolean().default(false),
});

export const payrollExportSchema = z.object({
  payrollId: uuidSchema,
  exportType: z.enum(EXPORT_TYPES),
  departmentId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  employeeId: uuidSchema.optional(),
});

export const documentVerifySchema = z.object({
  documentNumber: z.string().min(5).max(50),
  verificationHash: z.string().min(16).max(128).optional(),
});

export const payslipQuerySchema = z.object({
  employeeId: uuidSchema.optional(),
  payrollId: uuidSchema.optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const payrollDocumentReportSchema = z.object({
  reportType: z.enum(["payslip_generation", "email_delivery", "archive", "salary_certificate"]),
  periodStart: dateSchema.optional(),
  periodEnd: dateSchema.optional(),
});
