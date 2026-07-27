import { z } from "zod";

import { paginationSchema, uuidSchema } from "@/shared/validation/common.schema";

export const salaryCalculationTypeSchema = z.enum(["fixed", "percentage", "formula", "manual", "computed"]);
export const salaryComponentTypeSchema = z.enum(["earning", "deduction"]);
export const salaryApprovalStatusSchema = z.enum(["draft", "pending", "approved", "rejected"]);
export const salaryTemplateScopeSchema = z.enum(["department", "designation", "employee", "branch"]);
export const payFrequencySchema = z.enum(["monthly", "weekly", "daily", "hourly"]);

export const salaryStructureSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i),
  payFrequency: payFrequencySchema.default("monthly"),
  description: z.string().max(2000).optional(),
  payGradeId: uuidSchema.optional(),
  monthlyCtcDefault: z.coerce.number().min(0).optional(),
  annualCtcDefault: z.coerce.number().min(0).optional(),
  isDefault: z.boolean().default(false),
});

export const salaryComponentSchema = z.object({
  salaryStructureId: uuidSchema,
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i),
  componentType: salaryComponentTypeSchema,
  calculationType: salaryCalculationTypeSchema.default("fixed"),
  amount: z.coerce.number().min(0).default(0),
  percentageOf: z.string().max(50).optional(),
  percentageValue: z.coerce.number().min(0).max(100).optional(),
  formulaExpression: z.string().max(2000).optional(),
  formulaId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  isTaxable: z.boolean().default(true),
  isEmployerContribution: z.boolean().default(false),
  affectsGross: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const salaryFormulaSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i),
  expression: z.string().min(1).max(2000),
  description: z.string().max(2000).optional(),
  variables: z.array(z.string()).default([]),
});

export const salaryTemplateSchema = z
  .object({
    salaryStructureId: uuidSchema,
    name: z.string().min(1).max(100),
    scope: salaryTemplateScopeSchema,
    branchId: uuidSchema.optional(),
    departmentId: uuidSchema.optional(),
    designationId: uuidSchema.optional(),
    employeeId: uuidSchema.optional(),
    priority: z.coerce.number().int().min(0).default(0),
    effectiveFrom: z.coerce.date(),
    effectiveTo: z.coerce.date().optional(),
  })
  .refine(
    (d) => {
      if (d.scope === "branch") return !!d.branchId;
      if (d.scope === "department") return !!d.departmentId;
      if (d.scope === "designation") return !!d.designationId;
      if (d.scope === "employee") return !!d.employeeId;
      return true;
    },
    { message: "Scope target ID is required" },
  );

export const employeeSalarySchema = z.object({
  employeeId: uuidSchema,
  salaryStructureId: uuidSchema,
  payGradeId: uuidSchema.optional(),
  baseSalary: z.coerce.number().min(0),
  monthlyCtc: z.coerce.number().min(0).default(0),
  annualCtc: z.coerce.number().min(0).default(0),
  grossPlaceholder: z.coerce.number().min(0).default(0),
  netPlaceholder: z.coerce.number().min(0).default(0),
  employerContribution: z.coerce.number().min(0).default(0),
  employeeContribution: z.coerce.number().min(0).default(0),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  remarks: z.string().max(2000).optional(),
  submitForApproval: z.boolean().default(true),
});

export const salaryRevisionSchema = z.object({
  employeeId: uuidSchema,
  employeeSalaryId: uuidSchema.optional(),
  previousSalary: z.coerce.number().min(0),
  newSalary: z.coerce.number().min(0),
  previousCtc: z.coerce.number().min(0).optional(),
  newCtc: z.coerce.number().min(0).optional(),
  effectiveDate: z.coerce.date(),
  reason: z.string().min(1).max(2000),
  revisionType: z.string().max(50).optional(),
});

export const payGradeSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i),
  level: z.coerce.number().int().min(1).max(99).default(1),
  minCtc: z.coerce.number().min(0).optional(),
  maxCtc: z.coerce.number().min(0).optional(),
  description: z.string().max(2000).optional(),
});

export const componentCategorySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i),
  categoryType: salaryComponentTypeSchema,
  description: z.string().max(2000).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const salaryQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sortBy: z.enum(["name", "code", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const salaryComponentQuerySchema = salaryQuerySchema.extend({
  salaryStructureId: uuidSchema.optional(),
  componentType: salaryComponentTypeSchema.optional(),
  calculationType: salaryCalculationTypeSchema.optional(),
});

export const employeeSalaryQuerySchema = salaryQuerySchema.extend({
  employeeId: uuidSchema.optional(),
  approvalStatus: salaryApprovalStatusSchema.optional(),
});

export const formulaPreviewSchema = z.object({
  expression: z.string().min(1).max(2000),
  context: z.record(z.coerce.number()).default({}),
});

export const payrollStatusSchema = z.enum([
  "draft", "calculated", "pending_approval", "approved", "locked", "paid", "cancelled", "processing", "review", "finalized",
]);

export const payrollPeriodTypeSchema = z.enum(["monthly", "weekly", "biweekly", "custom"]);
export const payrollPeriodStatusSchema = z.enum(["draft", "open", "closed", "locked"]);

export const payrollPeriodSchema = z.object({
  name: z.string().min(1).max(100),
  periodType: payrollPeriodTypeSchema.default("monthly"),
  payrollYear: z.coerce.number().int().min(2000).max(2100),
  payrollMonth: z.coerce.number().int().min(1).max(12).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  payDate: z.coerce.date().optional(),
}).refine((d) => d.endDate >= d.startDate, { message: "End date must be on or after start date", path: ["endDate"] });

export const payrollGenerateSchema = z.object({
  payrollPeriodId: uuidSchema,
  scope: z.enum(["employee", "department", "branch", "company"]).default("company"),
  employeeId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  previewOnly: z.boolean().default(false),
  payrollNumber: z.string().min(1).max(50).optional(),
});

export const payrollCalculateSchema = z.object({
  payrollId: uuidSchema,
  version: z.number().int().min(1),
  recalculate: z.boolean().default(false),
});

export const payrollApproveSchema = z.object({
  payrollId: uuidSchema,
  version: z.number().int().min(1),
});

export const payrollLockSchema = z.object({
  payrollId: uuidSchema,
  version: z.number().int().min(1),
  lock: z.boolean().default(true),
});

export const payrollQuerySchema = paginationSchema.extend({
  status: payrollStatusSchema.optional(),
  payrollPeriodId: uuidSchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "payrollNumber", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PayrollPeriodInput = z.infer<typeof payrollPeriodSchema>;
export type PayrollGenerateInput = z.infer<typeof payrollGenerateSchema>;
export type PayrollCalculateInput = z.infer<typeof payrollCalculateSchema>;
export type PayrollApproveInput = z.infer<typeof payrollApproveSchema>;
export type PayrollLockInput = z.infer<typeof payrollLockSchema>;
export type PayrollQueryInput = z.input<typeof payrollQuerySchema>;

export type SalaryStructureInput = z.infer<typeof salaryStructureSchema>;
export type SalaryComponentInput = z.infer<typeof salaryComponentSchema>;
export type SalaryFormulaInput = z.infer<typeof salaryFormulaSchema>;
export type SalaryTemplateInput = z.infer<typeof salaryTemplateSchema>;
export type EmployeeSalaryInput = z.infer<typeof employeeSalarySchema>;
export type SalaryRevisionInput = z.infer<typeof salaryRevisionSchema>;
export type PayGradeInput = z.infer<typeof payGradeSchema>;
export type SalaryQueryInput = z.input<typeof salaryQuerySchema>;
export type SalaryComponentQueryInput = z.input<typeof salaryComponentQuerySchema>;
export type EmployeeSalaryQueryInput = z.input<typeof employeeSalaryQuerySchema>;
export type FormulaPreviewInput = z.infer<typeof formulaPreviewSchema>;
