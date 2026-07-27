import { z } from "zod";

import { emailSchema, paginationSchema, uuidSchema } from "@/shared/validation/common.schema";

export const employeeStatusSchema = z.enum([
  "active",
  "inactive",
  "probation",
  "on_notice",
  "on_leave",
  "resigned",
  "terminated",
  "separated",
  "suspended",
  "retired",
]);

export const employmentTypeSchema = z.enum([
  "permanent",
  "contract",
  "intern",
  "consultant",
  "daily",
  "hourly",
  "trainee",
]);

export const genderSchema = z.enum(["male", "female", "other", "prefer_not_to_say"]);

export const addressBlockSchema = z.object({
  line1: z.string().max(500).optional(),
  line2: z.string().max(500).optional(),
  country: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  pinCode: z.string().max(20).optional(),
});

export const emergencyContactSchema = z.object({
  name: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  relation: z.string().max(100).optional(),
});

export const identityDocumentsSchema = z.object({
  aadhaar: z.string().max(20).optional(),
  pan: z.string().max(20).optional(),
  passport: z.string().max(30).optional(),
  passportExpiry: z.coerce.date().optional().nullable(),
  drivingLicence: z.string().max(30).optional(),
  drivingLicenceExpiry: z.coerce.date().optional().nullable(),
  voterId: z.string().max(30).optional(),
  uan: z.string().max(20).optional(),
  esicNumber: z.string().max(20).optional(),
});

const auditableFields = {
  remarks: z.string().max(2000).optional(),
};

const employeeCoreFields = {
  branchId: uuidSchema,
  departmentId: uuidSchema,
  designationId: uuidSchema,
  reportingManagerId: uuidSchema.optional().nullable(),
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional().nullable(),
  lastName: z.string().min(1).max(100),
  preferredName: z.string().max(100).optional().nullable(),
  email: emailSchema,
  personalEmail: emailSchema.optional().nullable().or(z.literal("")),
  phone: z.string().max(20).optional().nullable(),
  alternatePhone: z.string().max(20).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: genderSchema.optional().nullable(),
  bloodGroup: z.string().max(10).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  maritalStatus: z.string().max(30).optional().nullable(),
  fatherName: z.string().max(200).optional().nullable(),
  motherName: z.string().max(200).optional().nullable(),
  spouseName: z.string().max(200).optional().nullable(),
  emergencyContact: emergencyContactSchema.optional(),
  permanentAddress: addressBlockSchema.optional(),
  currentAddress: addressBlockSchema.optional(),
  identityDocuments: identityDocumentsSchema.optional(),
  dateOfJoining: z.coerce.date(),
  confirmationDate: z.coerce.date().optional().nullable(),
  employmentType: employmentTypeSchema.default("permanent"),
  employmentStatus: employeeStatusSchema.default("active"),
  probationStatus: z.string().max(50).optional().nullable(),
  noticePeriodDays: z.number().int().min(0).max(365).optional().nullable(),
  workLocation: z.string().max(255).optional().nullable(),
  ...auditableFields,
};

export const createEmployeeSchema = z.object({
  ...employeeCoreFields,
  employeeCode: z.string().min(1).max(50).optional(),
  autoGenerateCode: z.boolean().default(true),
});

export const updateEmployeeSchema = createEmployeeSchema
  .omit({ autoGenerateCode: true, employeeCode: true })
  .partial()
  .extend({
    id: uuidSchema,
    version: z.number().int().min(1),
  });

export const employeeSearchSchema = paginationSchema.extend({
  search: z.string().optional(),
  branchId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  designationId: uuidSchema.optional(),
  employmentStatus: employeeStatusSchema.optional(),
  employmentType: employmentTypeSchema.optional(),
  status: z.enum(["active", "inactive", "suspended", "trial"]).optional(),
  sortBy: z
    .enum(["employeeCode", "firstName", "dateOfJoining", "createdAt", "employmentStatus"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  includeDeleted: z.coerce.boolean().optional(),
});

export const employeeStatusChangeSchema = z.object({
  id: uuidSchema,
  version: z.number().int().min(1),
  employmentStatus: employeeStatusSchema,
  reason: z.string().max(500).optional(),
});

export const employeeImportSchema = z.object({
  format: z.enum(["csv", "excel"]),
  dryRun: z.boolean().default(true),
});

export const employeeExportSchema = z.object({
  format: z.enum(["csv", "excel", "pdf"]),
  branchId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  employmentStatus: employeeStatusSchema.optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeSearchInput = z.infer<typeof employeeSearchSchema>;

/** @deprecated Use employeeSearchSchema */
export const employeeQuerySchema = employeeSearchSchema;
export type EmployeeStatusChangeInput = z.infer<typeof employeeStatusChangeSchema>;
export type EmployeeImportInput = z.infer<typeof employeeImportSchema>;
export type EmployeeExportInput = z.infer<typeof employeeExportSchema>;
