import { z } from "zod";

import { paginationSchema, uuidSchema } from "@/shared/validation/common.schema";

export const leaveStatusSchema = z.enum(["draft", "pending", "approved", "rejected", "cancelled", "sent_back"]);
export const leaveHalfDayTypeSchema = z.enum(["none", "first_half", "second_half"]);
export const leaveUnitSchema = z.enum(["days", "hours"]);
export const leaveApprovalActionSchema = z.enum(["approve", "reject", "send_back", "cancel", "escalate"]);

export const leaveTypeSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/i),
  description: z.string().max(2000).optional(),
  isPaid: z.boolean().default(true),
  isCarryForward: z.boolean().default(false),
  maxCarryForwardDays: z.coerce.number().min(0).max(365).default(0),
  maxPerMonth: z.coerce.number().min(0).max(31).optional(),
  maxPerYear: z.coerce.number().min(0).max(365).optional(),
  minDaysPerRequest: z.coerce.number().min(0).max(365).default(0.5),
  maxDaysPerRequest: z.coerce.number().min(0).max(365).optional(),
  halfDayAllowed: z.boolean().default(true),
  hourlyLeaveAllowed: z.boolean().default(false),
  requiresAttachment: z.boolean().default(false),
  medicalCertificateRequired: z.boolean().default(false),
  managerApprovalRequired: z.boolean().default(true),
  hrApprovalRequired: z.boolean().default(false),
  genderRestriction: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  probationRestricted: z.boolean().default(false),
  noticePeriodRestricted: z.boolean().default(false),
  accrualType: z.enum(["monthly", "yearly"]).default("yearly"),
  accrualRate: z.coerce.number().min(0).max(365).default(0),
  minDaysNotice: z.coerce.number().int().min(0).max(90).default(0),
  maxConsecutiveDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const leavePolicySchema = z.object({
  name: z.string().min(1).max(100),
  leaveTypeId: uuidSchema.optional(),
  accrualPeriod: z.enum(["monthly", "yearly"]).default("yearly"),
  creditAmount: z.coerce.number().min(0).max(365).default(0),
  allowCarryForward: z.boolean().default(false),
  maxCarryForwardDays: z.coerce.number().min(0).max(365).default(0),
  expiryMonths: z.coerce.number().int().min(1).max(24).optional(),
  allowNegativeBalance: z.boolean().default(false),
  sandwichHolidayRule: z.boolean().default(false),
  excludeWeeklyOff: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const leaveApplicationSchema = z
  .object({
    employeeId: uuidSchema.optional(),
    leaveTypeId: uuidSchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    leaveUnit: leaveUnitSchema.default("days"),
    halfDayType: leaveHalfDayTypeSchema.default("none"),
    reason: z.string().min(1).max(2000),
    attachmentFileId: uuidSchema.optional(),
    emergencyContact: z.record(z.unknown()).optional(),
    delegateEmployeeId: uuidSchema.optional(),
    submit: z.boolean().default(true),
  })
  .refine((d) => d.endDate >= d.startDate, { message: "End date must be on or after start date", path: ["endDate"] });

export const leaveApprovalSchema = z.object({
  leaveId: uuidSchema,
  version: z.number().int().min(1),
  action: leaveApprovalActionSchema,
  comments: z.string().max(2000).optional(),
});

export const leaveBalanceAdjustSchema = z.object({
  employeeId: uuidSchema,
  leaveTypeId: uuidSchema,
  year: z.coerce.number().int().min(2000).max(2100),
  credited: z.coerce.number().min(0).max(365).optional(),
  openingBalance: z.coerce.number().min(0).max(365).optional(),
  remarks: z.string().max(500).optional(),
});

export const leaveQuerySchema = paginationSchema.extend({
  employeeId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  leaveTypeId: uuidSchema.optional(),
  status: leaveStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["startDate", "createdAt", "status"]).default("startDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const leaveCalendarQuerySchema = z.object({
  view: z.enum(["personal", "department", "branch", "company"]).default("personal"),
  employeeId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  status: leaveStatusSchema.optional(),
});

export type LeaveTypeInput = z.infer<typeof leaveTypeSchema>;
export type LeavePolicyInput = z.infer<typeof leavePolicySchema>;
export type LeaveApplicationInput = z.infer<typeof leaveApplicationSchema>;
export type LeaveApprovalInput = z.infer<typeof leaveApprovalSchema>;
export type LeaveBalanceAdjustInput = z.infer<typeof leaveBalanceAdjustSchema>;
export type LeaveQueryInput = z.infer<typeof leaveQuerySchema>;
export type LeaveCalendarQueryInput = z.infer<typeof leaveCalendarQuerySchema>;
