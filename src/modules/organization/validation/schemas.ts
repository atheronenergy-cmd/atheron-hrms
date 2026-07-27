import { z } from "zod";

import {
  emailSchema,
  paginationSchema,
  phoneSchema,
  uuidSchema,
} from "@/shared/validation/common.schema";

export const recordStatusSchema = z.enum(["active", "inactive", "suspended", "trial"]);
export const holidayTypeSchema = z.enum(["public", "restricted", "optional"]);
export const hrPolicyCategorySchema = z.enum([
  "attendance",
  "leave",
  "payroll",
  "overtime",
  "probation",
]);
export const shiftTypeSchema = z.enum(["fixed", "flexible", "rotational"]);

const auditableFields = {
  remarks: z.string().max(2000).optional(),
};

const addressSchema = z.object({
  line1: z.string().max(255).optional(),
  line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pinCode: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
});

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  legalName: z.string().max(255).optional(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  companyCode: z.string().max(50).optional(),
  registrationNumber: z.string().max(100).optional(),
  taxId: z.string().max(100).optional(),
  gstNumber: z.string().max(50).optional(),
  panNumber: z.string().max(20).optional(),
  cinNumber: z.string().max(30).optional(),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  website: z.string().url("Invalid website URL").max(255).optional().or(z.literal("")),
  address: addressSchema.optional(),
  countryCode: z.string().length(2).default("IN"),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  pinCode: z.string().max(20).optional(),
  currencyCode: z.string().length(3).default("INR"),
  timezone: z.string().max(50).default("Asia/Kolkata"),
  dateFormat: z.string().max(30).default("dd MMM yyyy"),
  fiscalYearStartMonth: z.number().int().min(1).max(12).default(4),
  payrollCycleDay: z.number().int().min(1).max(31).nullable().optional(),
  status: recordStatusSchema.default("active"),
  ...auditableFields,
});

export const updateCompanySchema = companySchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const companyQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: recordStatusSchema.optional(),
});

export const branchSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i, "Invalid branch code"),
  managerUserId: uuidSchema.optional(),
  phone: phoneSchema.optional().or(z.literal("")),
  email: emailSchema.optional().or(z.literal("")),
  address: addressSchema.optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  geofenceRadiusMeters: z.coerce.number().int().min(0).max(10000).optional(),
  gpsAttendanceEnabled: z.boolean().default(false),
  allowOutsideLocation: z.boolean().default(false),
  locationRequired: z.boolean().default(true),
  isHeadOffice: z.boolean().default(false),
  status: recordStatusSchema.default("active"),
  ...auditableFields,
});

export const createBranchSchema = branchSchema;
export const updateBranchSchema = branchSchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const branchQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: recordStatusSchema.optional(),
});

export const departmentSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i),
  description: z.string().max(2000).optional(),
  branchId: uuidSchema.optional(),
  parentDepartmentId: uuidSchema.optional(),
  status: recordStatusSchema.default("active"),
  ...auditableFields,
});

export const createDepartmentSchema = departmentSchema;
export const updateDepartmentSchema = departmentSchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const departmentQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  branchId: uuidSchema.optional(),
  status: recordStatusSchema.optional(),
});

export const designationSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i),
  level: z.number().int().min(1).max(20).default(1),
  departmentId: uuidSchema.optional(),
  description: z.string().max(2000).optional(),
  status: recordStatusSchema.default("active"),
  ...auditableFields,
});

export const createDesignationSchema = designationSchema;
export const updateDesignationSchema = designationSchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const designationQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  departmentId: uuidSchema.optional(),
  status: recordStatusSchema.optional(),
});

export const holidaySchema = z.object({
  name: z.string().min(1).max(255),
  date: z.coerce.date(),
  holidayType: holidayTypeSchema.default("public"),
  description: z.string().max(2000).optional(),
  branchId: uuidSchema.optional(),
  applicableDepartmentIds: z.array(uuidSchema).default([]),
  status: recordStatusSchema.default("active"),
  ...auditableFields,
});

export const createHolidaySchema = holidaySchema;
export const updateHolidaySchema = holidaySchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const holidayQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  calendarYear: z.coerce.number().int().optional(),
  branchId: uuidSchema.optional(),
  status: recordStatusSchema.optional(),
});

export const policySchema = z.object({
  category: hrPolicyCategorySchema,
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i),
  description: z.string().max(2000).optional(),
  rules: z.record(z.string(), z.unknown()).default({}),
  status: recordStatusSchema.default("active"),
  ...auditableFields,
});

export const createPolicySchema = policySchema;
export const updatePolicySchema = policySchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const policyQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  category: hrPolicyCategorySchema.optional(),
  status: recordStatusSchema.optional(),
});

export const workingScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i),
  shiftType: shiftTypeSchema.default("fixed"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format"),
  breakDurationMinutes: z.number().int().min(0).max(480).default(60),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1).default([1, 2, 3, 4, 5]),
  isOvernight: z.boolean().default(false),
  status: recordStatusSchema.default("active"),
  ...auditableFields,
});

export const createWorkingScheduleSchema = workingScheduleSchema;
export const updateWorkingScheduleSchema = workingScheduleSchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const scheduleQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: recordStatusSchema.optional(),
});

export const companySettingsSchema = z.object({
  defaultCurrency: z.string().length(3),
  timezone: z.string().max(50),
  payrollDate: z.number().int().min(1).max(31).nullable(),
  dateFormat: z.string().max(30),
  attendanceRules: z.record(z.string(), z.unknown()).default({}),
  notificationSettings: z.record(z.string(), z.unknown()).default({}),
  documentSettings: z.record(z.string(), z.unknown()).default({}),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type BranchInput = z.infer<typeof branchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type DesignationInput = z.infer<typeof designationSchema>;
export type UpdateDesignationInput = z.infer<typeof updateDesignationSchema>;
export type HolidayInput = z.infer<typeof holidaySchema>;
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;
export type PolicyInput = z.infer<typeof policySchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
export type WorkingScheduleInput = z.infer<typeof workingScheduleSchema>;
export type UpdateWorkingScheduleInput = z.infer<typeof updateWorkingScheduleSchema>;
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
