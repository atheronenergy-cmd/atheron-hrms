import { z } from "zod";

import { ADVANCE_TYPES, LOAN_TYPE_CATEGORIES } from "@/modules/loan-recovery/domain/types";

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const positiveAmount = z.coerce.number().positive();
const nonNegativeAmount = z.coerce.number().min(0);

export const loanTypeSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/),
  category: z.enum(LOAN_TYPE_CATEGORIES),
  interestType: z.enum(["none", "flat", "reducing_balance", "simple", "compound"]).default("none"),
  defaultRate: nonNegativeAmount.default(0),
  maxTenureMonths: z.coerce.number().int().positive().optional(),
  maxAmount: positiveAmount.optional(),
  remarks: z.string().max(500).optional(),
});

export const loanPolicySchema = z.object({
  loanTypeId: uuidSchema.optional(),
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/),
  maxLoanAmount: positiveAmount.optional(),
  maxAdvanceAmount: positiveAmount.optional(),
  maxTenureMonths: z.coerce.number().int().positive().optional(),
  minServiceMonths: z.coerce.number().int().min(0).optional(),
  interestRules: z.record(z.unknown()).default({}),
  eligibilityRules: z.record(z.unknown()).default({}),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional(),
});

export const employeeLoanSchema = z.object({
  employeeId: uuidSchema,
  loanTypeId: uuidSchema,
  principalAmount: positiveAmount,
  interestType: z.enum(["none", "flat", "reducing_balance", "simple", "compound"]).optional(),
  interestRate: nonNegativeAmount.optional(),
  tenureMonths: z.coerce.number().int().positive().max(360),
  recoveryMode: z.enum(["monthly", "weekly", "biweekly", "custom"]).default("monthly"),
  disbursementDate: dateSchema.optional(),
  startRecoveryDate: dateSchema,
  remarks: z.string().max(500).optional(),
});

export const salaryAdvanceSchema = z.object({
  employeeId: uuidSchema,
  advanceType: z.enum(ADVANCE_TYPES),
  amount: positiveAmount,
  recoveryStartDate: dateSchema,
  recoveryMode: z.enum(["monthly", "weekly", "biweekly", "custom"]).default("monthly"),
  installmentCount: z.coerce.number().int().positive().max(60).default(1),
  remarks: z.string().max(500).optional(),
});

export const loanApprovalActionSchema = z.object({
  loanId: uuidSchema,
  action: z.enum(["submit", "approve", "reject", "cancel"]),
  approvalLevel: z.enum(["manager", "hr", "finance"]).optional(),
  remarks: z.string().max(500).optional(),
});

export const advanceApprovalActionSchema = z.object({
  advanceId: uuidSchema,
  action: z.enum(["submit", "approve", "reject", "cancel"]),
  remarks: z.string().max(500).optional(),
});

export const foreclosureSchema = z.object({
  loanId: uuidSchema,
  foreclosureType: z.enum(["partial_prepayment", "full_prepayment", "foreclosure"]),
  amountPaid: positiveAmount,
  waivedAmount: nonNegativeAmount.default(0),
  remarks: z.string().max(500).optional(),
});

export const recoveryAdjustmentSchema = z.object({
  employeeId: uuidSchema,
  entityType: z.enum(["loan", "advance"]),
  entityId: uuidSchema,
  adjustmentType: z.enum(["waiver", "write_off", "penalty", "manual"]),
  amount: positiveAmount,
  reason: z.string().max(500).optional(),
});

export const emiScheduleQuerySchema = z.object({
  loanId: uuidSchema.optional(),
  employeeId: uuidSchema.optional(),
  status: z.enum(["scheduled", "due", "paid", "overdue", "waived", "skipped"]).optional(),
});

export const recoveryQuerySchema = z.object({
  employeeId: uuidSchema.optional(),
  periodStart: dateSchema.optional(),
  periodEnd: dateSchema.optional(),
});

export const loanReportQuerySchema = z.object({
  reportType: z.enum([
    "loan_register",
    "outstanding",
    "recovery",
    "advance",
    "emi",
    "foreclosure",
    "department_loan",
  ]),
  periodStart: dateSchema.optional(),
  periodEnd: dateSchema.optional(),
  departmentId: uuidSchema.optional(),
});

export const loanCalculateSchema = z.object({
  employeeId: uuidSchema,
  periodStart: dateSchema,
  periodEnd: dateSchema,
});

export const loanDisburseSchema = z.object({
  loanId: uuidSchema,
  disbursementDate: dateSchema,
});
