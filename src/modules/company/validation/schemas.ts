import { z } from "zod";

import { paginationSchema, uuidSchema } from "@/shared/validation/common.schema";

export const recordStatusSchema = z.enum(["active", "inactive", "suspended", "trial"]);

const auditableFields = {
  remarks: z.string().max(2000).optional(),
};

export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  registrationNumber: z.string().max(100).optional(),
  taxId: z.string().max(100).optional(),
  countryCode: z.string().length(2).default("IN"),
  currencyCode: z.string().length(3).default("INR"),
  timezone: z.string().max(50).default("Asia/Kolkata"),
  fiscalYearStartMonth: z.number().int().min(1).max(12).default(4),
  ...auditableFields,
});

export const updateCompanySchema = createCompanySchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const companyQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: recordStatusSchema.optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const createBranchSchema = z.object({
  companyId: uuidSchema,
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  isHeadOffice: z.boolean().default(false),
  ...auditableFields,
});

export const createDepartmentSchema = z.object({
  companyId: uuidSchema,
  branchId: uuidSchema.optional(),
  parentDepartmentId: uuidSchema.optional(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  ...auditableFields,
});

export const createDesignationSchema = z.object({
  companyId: uuidSchema,
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  level: z.number().int().min(1).default(1),
  description: z.string().max(2000).optional(),
  ...auditableFields,
});

// Employee schemas — canonical source: @/modules/employee/validation/schemas
export {
  createEmployeeSchema,
  employeeQuerySchema,
  employeeSearchSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "@/modules/employee/validation/schemas";
