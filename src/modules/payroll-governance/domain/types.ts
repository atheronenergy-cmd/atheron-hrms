import type {
  PayrollApprovalStepRole,
  PayrollArrearType,
  PayrollReopenAction,
  RetroPayrollType,
} from "@prisma/client";

export const PAYROLL_GOVERNANCE_ROUTES = {
  dashboard: "/dashboard/payroll/governance",
  approval: "/dashboard/payroll/governance/approval",
  locks: "/dashboard/payroll/governance/locks",
  versions: "/dashboard/payroll/governance/versions",
  retro: "/dashboard/payroll/governance/retro",
  arrears: "/dashboard/payroll/governance/arrears",
  financialYear: "/dashboard/payroll/governance/financial-year",
  compliance: "/dashboard/payroll/governance/compliance",
  backup: "/dashboard/payroll/governance/backup",
  reports: "/dashboard/payroll/governance/reports",
} as const;

export const DEFAULT_APPROVAL_WORKFLOW: Array<{ stepNumber: number; stepRole: PayrollApprovalStepRole; stepLabel: string }> = [
  { stepNumber: 1, stepRole: "hr", stepLabel: "HR Review" },
  { stepNumber: 2, stepRole: "finance", stepLabel: "Finance Review" },
  { stepNumber: 3, stepRole: "accounts", stepLabel: "Accounts Review" },
  { stepNumber: 4, stepRole: "director", stepLabel: "Director Approval" },
];

export const PAYROLL_GOVERNANCE_STATUSES = [
  "draft",
  "calculated",
  "pending_approval",
  "approved",
  "locked",
  "paid",
  "cancelled",
  "archived",
] as const;

export const RETRO_PAYROLL_TYPES = [
  "late_promotion",
  "late_increment",
  "attendance_correction",
  "leave_correction",
  "statutory_revision",
  "manual",
] as const satisfies readonly RetroPayrollType[];

export const ARREAR_TYPES = ["salary", "allowance", "bonus", "overtime", "manual"] as const satisfies readonly PayrollArrearType[];

export const REOPEN_ACTIONS = ["unlock", "modify", "recalculate", "relock"] as const satisfies readonly PayrollReopenAction[];

export type GovernanceReportType =
  | "approval_history"
  | "locked_payroll"
  | "version_history"
  | "retro_payroll"
  | "arrear_report"
  | "financial_year_summary"
  | "compliance_snapshot";

export const GOVERNANCE_REPORT_TYPES = [
  "approval_history",
  "locked_payroll",
  "version_history",
  "retro_payroll",
  "arrear_report",
  "financial_year_summary",
  "compliance_snapshot",
] as const satisfies readonly GovernanceReportType[];

export type PayrollSnapshotPayload = {
  payroll: Record<string, unknown>;
  employees: Array<Record<string, unknown>>;
  attendance: Record<string, unknown>;
  leave: Record<string, unknown>;
  salaryStructure: Record<string, unknown>;
  components: Array<Record<string, unknown>>;
  statutory: Record<string, unknown>;
  totals: { gross: number; net: number; deductions: number };
  version: number;
  timestamp: string;
};

export type ComplianceSnapshotData = {
  pfValues: Record<string, number>;
  esiValues: Record<string, number>;
  ptValues: Record<string, number>;
  tdsValues: Record<string, number>;
  salarySummary: Record<string, number>;
  employeeStatus: Record<string, string>;
  rulesVersion: Record<string, string>;
  usedConfiguration: Record<string, unknown>;
};
