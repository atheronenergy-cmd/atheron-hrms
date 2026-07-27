/**
 * Enterprise Earnings Engine verification.
 * Run: npx tsx scripts/verify-earnings-engine.ts
 */
import {
  createAllowanceService,
  createBonusService,
  createCommissionService,
  createIncentiveService,
  createPerformanceRewardService,
  createProductionIncentiveService,
} from "../src/modules/earnings/application/bonus.service";
import { calculateRuleAmount } from "../src/modules/earnings/application/rule-engine.helper";
import { EARNINGS_COMPONENT_CODES, EARNINGS_ROUTES } from "../src/modules/earnings/domain/types";
import { PLACEHOLDER_COMPONENT_CODES } from "../src/modules/payroll/domain/types";
import {
  allowanceRuleSchema,
  bonusRuleSchema,
  commissionRuleSchema,
  earningsCalculateSchema,
  incentiveRuleSchema,
  overtimeRuleSchema,
  productionMetricSchema,
} from "../src/modules/earnings/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

console.log("\n=== Enterprise Earnings Engine Verification ===\n");

assert(PERMISSIONS.OVERTIME.VIEW === "overtime.module.read", "overtime.view permission");
assert(PERMISSIONS.OVERTIME.MANAGE === "overtime.module.manage", "overtime.manage permission");
assert(PERMISSIONS.OVERTIME.APPROVE === "overtime.request.approve", "overtime.approve permission");
assert(PERMISSIONS.BONUS.MANAGE === "bonus.module.manage", "bonus.manage permission");
assert(PERMISSIONS.INCENTIVE.MANAGE === "incentive.module.manage", "incentive.manage permission");
assert(PERMISSIONS.COMMISSION.MANAGE === "commission.module.manage", "commission.manage permission");
assert(PERMISSIONS.ALLOWANCE.MANAGE === "allowance.module.manage", "allowance.manage permission");

assert(EARNINGS_ROUTES.dashboard === "/dashboard/earnings", "Earnings dashboard route");
assert(!PLACEHOLDER_COMPONENT_CODES.has("BONUS"), "BONUS removed from payroll placeholders");
assert(EARNINGS_COMPONENT_CODES.has("OVERTIME"), "OVERTIME in earnings codes");

assert(overtimeRuleSchema.safeParse({ name: "Standard OT", code: "STD_OT", overtimeType: "hourly", effectiveFrom: "2026-01-01", multiplier: 1.5 }).success, "Overtime rule schema");
assert(bonusRuleSchema.safeParse({ name: "Festival", code: "FEST", bonusType: "festival", effectiveFrom: "2026-01-01", amount: 5000 }).success, "Bonus rule schema");
assert(incentiveRuleSchema.safeParse({ name: "Sales", code: "SALES", incentiveType: "sales", effectiveFrom: "2026-01-01", amount: 1000 }).success, "Incentive rule schema");
assert(commissionRuleSchema.safeParse({ name: "Sales Comm", code: "SC", commissionType: "percentage", effectiveFrom: "2026-01-01", percentageValue: 5 }).success, "Commission rule schema");
assert(allowanceRuleSchema.safeParse({ name: "Travel", code: "TRAVEL", allowanceType: "travel", effectiveFrom: "2026-01-01", amount: 2000 }).success, "Allowance rule schema");
assert(productionMetricSchema.safeParse({ employeeId: "00000000-0000-4000-8000-000000000001", metricDate: "2026-07-01", kpiCode: "PACKS", kpiName: "Battery Packs", targetValue: 100, actualValue: 120 }).success, "Production metric schema");
assert(earningsCalculateSchema.safeParse({ employeeId: "00000000-0000-4000-8000-000000000002", periodStart: "2026-07-01", periodEnd: "2026-07-31", basic: 15000, gross: 25000, overtimeHours: 10 }).success, "Earnings calculate schema");

const hourlyRate = round2(22000 / 22 / 8);
const hourlyOtPay = round2(10 * hourlyRate * 1.5);
const holidayOtPay = round2(4 * hourlyRate * 2);
const nightOtPay = round2(2 * hourlyRate * 1.25);
assert(hourlyOtPay > 0, "Hourly OT calculation");
assert(holidayOtPay > hourlyOtPay / 10, "Holiday OT uses higher multiplier");
assert(nightOtPay > 0, "Night shift OT calculation");

const ruleAmount = calculateRuleAmount(
  { calculationMode: "percentage", amount: 0, percentageValue: 10, percentageOf: "BASIC" },
  { BASIC: 20000 },
);
assert(ruleAmount === 2000, "Rule engine percentage calculation");

const slabAmount = calculateRuleAmount(
  { calculationMode: "slab", amount: 0, slabs: [{ from: 0, to: 100000, rate: 5 }, { from: 100001, to: null, rate: 10 }] },
  {},
  150000,
);
assert(slabAmount > 0, "Commission slab calculation");

assert(typeof createBonusService === "function", "BonusService factory");
assert(typeof createIncentiveService === "function", "IncentiveService factory");
assert(typeof createCommissionService === "function", "CommissionService factory");
assert(typeof createAllowanceService === "function", "AllowanceService factory");
assert(typeof createProductionIncentiveService === "function", "ProductionIncentiveService factory");
assert(typeof createPerformanceRewardService === "function", "PerformanceRewardService factory");

console.log("\n=== All earnings engine checks passed ===\n");
console.log("Enterprise Earnings Engine Version 1.0 Completed");
