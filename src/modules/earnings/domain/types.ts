export const EARNINGS_ROUTES = {
  dashboard: "/dashboard/earnings",
  overtime: "/dashboard/earnings/overtime",
  overtimeRequests: "/dashboard/earnings/overtime/requests",
  bonus: "/dashboard/earnings/bonus",
  incentives: "/dashboard/earnings/incentives",
  commission: "/dashboard/earnings/commission",
  allowances: "/dashboard/earnings/allowances",
  production: "/dashboard/earnings/production",
  performance: "/dashboard/earnings/performance",
  reports: "/dashboard/earnings/reports",
} as const;

export type EarningsDashboardStats = {
  pendingOt: number;
  approvedOt: number;
  monthlyBonus: number;
  monthlyIncentives: number;
  totalCommission: number;
  totalAllowances: number;
  productionRewards: number;
};

export type EarningsBreakdown = {
  overtime: number;
  bonus: number;
  incentive: number;
  commission: number;
  allowance: number;
  production: number;
  performance: number;
  total: number;
};

export type EarningsCalculationResult = {
  breakdown: EarningsBreakdown;
  context: Record<string, number>;
  components: Array<{ code: string; name: string; amount: number }>;
  warnings: string[];
  metadata: {
    overtimeHours?: number;
    holidayOtHours?: number;
    nightOtHours?: number;
  };
};

export const EARNINGS_COMPONENT_CODES = new Set([
  "OVERTIME",
  "OT",
  "BONUS",
  "INCENTIVE",
  "COMMISSION",
  "ALLOWANCE",
  "TRAVEL_ALLOWANCE",
  "FUEL_ALLOWANCE",
  "FOOD_ALLOWANCE",
  "PRODUCTION_INCENTIVE",
  "PERFORMANCE_REWARD",
]);

export const EARNINGS_CODE_ALIASES: Record<string, keyof EarningsBreakdown> = {
  OVERTIME: "overtime",
  OT: "overtime",
  BONUS: "bonus",
  INCENTIVE: "incentive",
  COMMISSION: "commission",
  ALLOWANCE: "allowance",
  TRAVEL_ALLOWANCE: "allowance",
  FUEL_ALLOWANCE: "allowance",
  FOOD_ALLOWANCE: "allowance",
  PRODUCTION_INCENTIVE: "production",
  PERFORMANCE_REWARD: "performance",
};

export type EarningsReportType =
  | "overtime"
  | "bonus"
  | "incentive"
  | "commission"
  | "allowance"
  | "production"
  | "department_incentive";

export type RuleLike = {
  calculationMode: string;
  amount: unknown;
  percentageValue?: unknown;
  percentageOf?: string | null;
  formulaExpression?: string | null;
  slabs?: unknown;
  targetValue?: unknown;
};

export type EmployeeScope = {
  employeeId: string;
  branchId: string;
  departmentId: string;
  designationId: string;
};
