import { z } from "zod";

const scopeFields = {
  scope: z.enum(["company", "branch", "department", "designation", "employee"]).optional(),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  designationId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
};

export const overtimeRuleSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  overtimeType: z.enum(["hourly", "daily", "weekly", "holiday", "weekend", "night_shift", "double", "triple", "custom"]),
  calculationMode: z.enum(["fixed", "percentage", "formula", "conditional", "slab"]).optional(),
  hourlyRate: z.number().min(0).optional(),
  multiplier: z.number().min(0).optional(),
  minHours: z.number().min(0).optional(),
  maxHours: z.number().min(0).optional(),
  approvalRequired: z.boolean().optional(),
  autoCalculation: z.boolean().optional(),
  formulaExpression: z.string().optional(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  ...scopeFields,
});

export const overtimeRecordSchema = z.object({
  employeeId: z.string().uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  otHours: z.number().min(0).optional(),
  holidayOtHours: z.number().min(0).optional(),
  nightOtHours: z.number().min(0).optional(),
  remarks: z.string().optional(),
});

export const bonusRuleSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  bonusType: z.string().min(2).max(50),
  calculationMode: z.enum(["fixed", "percentage", "formula", "conditional", "slab"]).optional(),
  amount: z.number().min(0).optional(),
  percentageValue: z.number().min(0).max(100).optional(),
  percentageOf: z.string().optional(),
  formulaExpression: z.string().optional(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  ...scopeFields,
});

export const employeeBonusSchema = z.object({
  employeeId: z.string().uuid(),
  bonusType: z.string().min(2).max(50),
  amount: z.number().min(0),
  bonusDate: z.coerce.date(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  bonusRuleId: z.string().uuid().optional(),
  remarks: z.string().optional(),
});

export const incentiveRuleSchema = bonusRuleSchema.extend({ incentiveType: z.string().min(2).max(50) }).omit({ bonusType: true });
export const employeeIncentiveSchema = z.object({
  employeeId: z.string().uuid(),
  incentiveType: z.string().min(2).max(50),
  amount: z.number().min(0),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  incentiveRuleId: z.string().uuid().optional(),
  remarks: z.string().optional(),
});

export const commissionRuleSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  commissionType: z.string().min(2).max(50),
  calculationMode: z.enum(["fixed", "percentage", "formula", "conditional", "slab"]).optional(),
  amount: z.number().min(0).optional(),
  percentageValue: z.number().min(0).max(100).optional(),
  slabs: z.array(z.object({ from: z.number(), to: z.number().nullable(), rate: z.number().optional(), amount: z.number().optional() })).optional(),
  targetValue: z.number().min(0).optional(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  ...scopeFields,
});

export const employeeCommissionSchema = z.object({
  employeeId: z.string().uuid(),
  commissionType: z.string().min(2).max(50),
  salesAmount: z.number().min(0),
  amount: z.number().min(0).optional(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  commissionRuleId: z.string().uuid().optional(),
});

export const allowanceRuleSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  allowanceType: z.string().min(2).max(50),
  calculationMode: z.enum(["fixed", "percentage", "formula", "conditional", "slab"]).optional(),
  amount: z.number().min(0).optional(),
  percentageValue: z.number().min(0).max(100).optional(),
  percentageOf: z.string().optional(),
  formulaExpression: z.string().optional(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  ...scopeFields,
});

export const employeeAllowanceSchema = z.object({
  employeeId: z.string().uuid(),
  allowanceType: z.string().min(2).max(50),
  amount: z.number().min(0),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  allowanceRuleId: z.string().uuid().optional(),
});

export const productionMetricSchema = z.object({
  employeeId: z.string().uuid(),
  metricDate: z.coerce.date(),
  kpiCode: z.string().min(2).max(50),
  kpiName: z.string().min(2).max(100),
  targetValue: z.number().min(0),
  actualValue: z.number().min(0),
  qualityScore: z.number().min(0).max(100).optional(),
  rejectPercent: z.number().min(0).max(100).optional(),
  efficiencyScore: z.number().min(0).max(100).optional(),
});

export const performanceMetricSchema = z.object({
  employeeId: z.string().uuid(),
  metricDate: z.coerce.date(),
  metricCode: z.string().min(2).max(50),
  metricName: z.string().min(2).max(100),
  score: z.number().min(0).max(100),
  targetScore: z.number().min(0).max(100).optional(),
  rewardAmount: z.number().min(0).optional(),
});

export const earningsCalculateSchema = z.object({
  employeeId: z.string().uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  basic: z.number().min(0),
  gross: z.number().min(0),
  workingDays: z.number().min(0).default(26),
  overtimeHours: z.number().min(0).default(0),
});

export const earningsApprovalSchema = z.object({
  entityType: z.enum(["overtime", "bonus", "incentive", "commission", "allowance"]),
  entityId: z.string().uuid(),
  approvalLevel: z.enum(["manager", "hr", "finance"]).optional(),
  remarks: z.string().optional(),
});

export const earningsReportQuerySchema = z.object({
  reportType: z.enum(["overtime", "bonus", "incentive", "commission", "allowance", "production", "department_incentive"]),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
});
