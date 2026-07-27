import { z } from "zod";

import { paginationSchema, uuidSchema } from "@/shared/validation/common.schema";

export const attendanceStatusSchema = z.enum([
  "present",
  "absent",
  "half_day",
  "late",
  "early_leaving",
  "on_leave",
  "holiday",
  "weekly_off",
  "work_from_home",
  "outdoor_duty",
  "overtime",
]);

export const attendanceMethodSchema = z.enum(["manual", "gps", "qr", "face", "biometric"]);

export const punchTypeSchema = z.enum(["in", "out", "break_start", "break_end"]);

export const attendancePunchSchema = z.object({
  employeeId: uuidSchema,
  punchType: punchTypeSchema,
  method: attendanceMethodSchema.default("manual"),
  timestamp: z.coerce.date().optional(),
  location: z.record(z.unknown()).optional(),
  deviceInfo: z.record(z.unknown()).optional(),
});

export const manualAttendanceSchema = z.object({
  employeeId: uuidSchema,
  date: z.coerce.date(),
  status: attendanceStatusSchema,
  checkInAt: z.coerce.date().optional(),
  checkOutAt: z.coerce.date().optional(),
  method: attendanceMethodSchema.default("manual"),
  remarks: z.string().max(2000).optional(),
});

export const correctionRequestSchema = z.object({
  employeeId: uuidSchema,
  attendanceDate: z.coerce.date(),
  correctionType: z.enum(["missed_punch", "wrong_timing", "wrong_location", "manual"]),
  requestedCheckIn: z.coerce.date().optional(),
  requestedCheckOut: z.coerce.date().optional(),
  reason: z.string().min(1).max(2000),
  attendanceId: uuidSchema.optional(),
});

export const correctionApprovalSchema = z.object({
  correctionId: uuidSchema,
  version: z.number().int().min(1),
  action: z.enum(["manager_approve", "hr_approve", "reject"]),
  comments: z.string().max(2000).optional(),
});

export const attendanceRuleSchema = z.object({
  name: z.string().min(1).max(100),
  branchId: uuidSchema.optional(),
  gracePeriodMinutes: z.number().int().min(0).max(120).default(15),
  lateLimitMinutes: z.number().int().min(0).max(120).default(15),
  halfDayThresholdMinutes: z.number().int().min(60).max(480).default(240),
  overtimeStartMinutes: z.number().int().min(0).max(240).default(0),
  minimumWorkMinutes: z.number().int().min(60).max(720).default(480),
  earlyLeavingGraceMinutes: z.number().int().min(0).max(120).default(15),
  isDefault: z.boolean().default(false),
});

export const updateAttendanceRuleSchema = attendanceRuleSchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const attendanceQuerySchema = paginationSchema.extend({
  employeeId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  status: attendanceStatusSchema.optional(),
  search: z.string().trim().max(255).optional(),
  sortBy: z.enum(["date", "status", "createdAt"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const calendarQuerySchema = z.object({
  employeeId: uuidSchema,
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export type AttendancePunchInput = z.infer<typeof attendancePunchSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
export type CorrectionRequestInput = z.infer<typeof correctionRequestSchema>;
export type AttendanceRuleInput = z.infer<typeof attendanceRuleSchema>;
export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>;
