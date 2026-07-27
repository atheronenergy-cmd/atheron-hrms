import type { LoanInterestType, LoanRecoveryMode, LoanWorkflowStatus } from "@prisma/client";

export const LOAN_RECOVERY_ROUTES = {
  dashboard: "/dashboard/loans",
  loans: "/dashboard/loans/employee-loans",
  application: "/dashboard/loans/application",
  advances: "/dashboard/loans/advances",
  recoverySchedule: "/dashboard/loans/recovery-schedule",
  emiSchedule: "/dashboard/loans/emi-schedule",
  recoveryHistory: "/dashboard/loans/recovery-history",
  policies: "/dashboard/loans/policies",
  reports: "/dashboard/loans/reports",
} as const;

export const LOAN_TYPE_CATEGORIES = [
  "company",
  "emergency",
  "medical",
  "education",
  "vehicle",
  "festival",
  "custom",
] as const;

export const ADVANCE_TYPES = [
  "one_time",
  "recurring",
  "festival",
  "emergency",
  "travel",
] as const;

export const LOAN_RECOVERY_COMPONENT_CODES = new Set([
  "LOAN",
  "ADVANCE",
  "LOAN_RECOVERY",
  "ADVANCE_RECOVERY",
]);

export const LOAN_RECOVERY_CODE_ALIASES: Record<string, keyof RecoveryBreakdown> = {
  LOAN: "loanDisbursement",
  ADVANCE: "advanceDisbursement",
  LOAN_RECOVERY: "loanRecovery",
  ADVANCE_RECOVERY: "advanceRecovery",
};

export type RecoveryBreakdown = {
  loanRecovery: number;
  advanceRecovery: number;
  penaltyRecovery: number;
  manualRecovery: number;
  assetRecovery: number;
  loanDisbursement: number;
  advanceDisbursement: number;
  total: number;
};

export type RecoveryCalculationResult = {
  breakdown: RecoveryBreakdown;
  context: Record<string, number>;
  components: Array<{ code: string; name: string; amount: number }>;
  warnings: string[];
  metadata: {
    loanEmiIds: string[];
    advanceRecoveryAmounts: Array<{ advanceId: string; amount: number }>;
  };
};

export type EmiScheduleItem = {
  emiNumber: number;
  dueDate: Date;
  principalComponent: number;
  interestComponent: number;
  installmentAmount: number;
  outstandingBalance: number;
};

export type LoanCalculationInput = {
  principal: number;
  interestType: LoanInterestType;
  interestRate: number;
  tenure: number;
  recoveryMode: LoanRecoveryMode;
  startRecoveryDate: Date;
};

export type LoanDashboardStats = {
  activeLoans: number;
  pendingApprovals: number;
  outstandingBalance: number;
  monthlyEmiCollection: number;
  salaryAdvances: number;
  overdueRecoveries: number;
};

export type FinalSettlementRecoverySummary = {
  employeeId: string;
  outstandingLoans: Array<{
    loanId: string;
    loanNumber: string;
    outstandingBalance: number;
    pendingEmis: number;
  }>;
  outstandingAdvances: Array<{
    advanceId: string;
    advanceNumber: string;
    outstandingBalance: number;
  }>;
  totalOutstanding: number;
  recoverySummary: string;
};

export type LoanReportType =
  | "loan_register"
  | "outstanding"
  | "recovery"
  | "advance"
  | "emi"
  | "foreclosure"
  | "department_loan";

export const APPROVAL_LEVELS = ["manager", "hr", "finance"] as const;

export const APPROVAL_TRANSITIONS: Record<string, LoanWorkflowStatus> = {
  manager: "manager_approved",
  hr: "hr_approved",
  finance: "finance_approved",
};

export type LoanPolicyEligibility = {
  departmentIds?: string[];
  designationIds?: string[];
  employmentTypes?: string[];
  minServiceMonths?: number;
};
