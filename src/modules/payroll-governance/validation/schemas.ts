import { z } from "zod";

import {
  ARREAR_TYPES,
  GOVERNANCE_REPORT_TYPES,
  REOPEN_ACTIONS,
  RETRO_PAYROLL_TYPES,
} from "@/modules/payroll-governance/domain/types";

export const approvalActionSchema = z.object({
  payrollId: z.string().uuid(),
  action: z.enum(["submit", "approve", "reject", "send_back", "delegate", "escalate"]),
  comments: z.string().max(2000).optional(),
  delegateToUserId: z.string().uuid().optional(),
  stepNumber: z.number().int().positive().optional(),
});

export const payrollLockSchema = z.object({
  payrollId: z.string().uuid(),
  version: z.number().int().positive(),
  lockType: z.enum(["full", "partial", "compliance"]).default("full"),
  reason: z.string().max(2000).optional(),
});

export const payrollUnlockSchema = z.object({
  payrollId: z.string().uuid(),
  version: z.number().int().positive(),
  reason: z.string().min(10).max(2000),
  approvedByUserId: z.string().uuid().optional(),
});

export const payrollReopenSchema = z.object({
  payrollId: z.string().uuid(),
  version: z.number().int().positive(),
  action: z.enum(REOPEN_ACTIONS),
  reason: z.string().min(10).max(2000),
});

export const retroPayrollSchema = z.object({
  employeeId: z.string().uuid(),
  payrollId: z.string().uuid().optional(),
  retroType: z.enum(RETRO_PAYROLL_TYPES),
  originalPeriodStart: z.coerce.date(),
  originalPeriodEnd: z.coerce.date(),
  originalAmount: z.number().nonnegative().default(0),
  revisedAmount: z.number().nonnegative().default(0),
  reason: z.string().max(2000).optional(),
});

export const arrearSchema = z.object({
  employeeId: z.string().uuid(),
  retroPayrollId: z.string().uuid().optional(),
  targetPayrollId: z.string().uuid().optional(),
  arrearType: z.enum(ARREAR_TYPES),
  amount: z.number().positive(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  mergeIntoPayroll: z.boolean().default(true),
  remarks: z.string().max(2000).optional(),
});

export const financialYearSchema = z.object({
  code: z.string().min(4).max(20),
  label: z.string().min(4).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  financialYearId: z.string().uuid().optional(),
  carryForwardConfig: z.record(z.unknown()).optional(),
});

export const financialYearActionSchema = z.object({
  payrollYearId: z.string().uuid(),
  action: z.enum(["open", "close", "lock", "archive"]),
  remarks: z.string().max(2000).optional(),
});

export const snapshotSchema = z.object({
  payrollId: z.string().uuid(),
  snapshotType: z.enum(["full", "compliance", "backup", "version"]).default("full"),
});

export const backupSchema = z.object({
  payrollId: z.string().uuid(),
});

export const backupRestoreSchema = z.object({
  backupId: z.string().uuid(),
  validateOnly: z.boolean().default(false),
});

export const complianceSnapshotSchema = z.object({
  payrollId: z.string().uuid(),
});

export const versionQuerySchema = z.object({
  payrollId: z.string().uuid(),
});

export const governanceReportSchema = z.object({
  reportType: z.enum(GOVERNANCE_REPORT_TYPES),
  payrollId: z.string().uuid().optional(),
  payrollYearId: z.string().uuid().optional(),
});

export const rollbackSchema = z.object({
  payrollId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  reason: z.string().min(10).max(2000),
});
