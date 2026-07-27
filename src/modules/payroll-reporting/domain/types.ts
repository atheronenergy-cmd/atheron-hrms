import type { AccountingProviderCode, BankFileFormat, BankProviderCode, PayrollReportType } from "@prisma/client";

export const PAYROLL_REPORTING_ROUTES = {
  dashboard: "/dashboard/payroll/reporting",
  reports: "/dashboard/payroll/reporting/reports",
  salaryRegister: "/dashboard/payroll/reporting/salary-register",
  bankTransfers: "/dashboard/payroll/reporting/bank-transfers",
  accounting: "/dashboard/payroll/reporting/accounting",
  costCenters: "/dashboard/payroll/reporting/cost-centers",
  analytics: "/dashboard/payroll/reporting/analytics",
  executive: "/dashboard/payroll/reporting/executive",
} as const;

export const PAYROLL_REPORT_TYPES: PayrollReportType[] = [
  "monthly_payroll",
  "department_payroll",
  "branch_payroll",
  "employee_payroll",
  "salary_register",
  "payroll_summary",
  "payroll_variance",
  "payroll_comparison",
];

export const BANK_PROVIDERS: BankProviderCode[] = [
  "icici", "hdfc", "axis", "sbi", "pnb", "canara", "kotak", "idfc", "indusind", "generic_csv", "custom",
];

export const ACCOUNTING_PROVIDERS: AccountingProviderCode[] = [
  "tally_prime", "zoho_books", "busy", "erpnext", "quickbooks", "custom_csv", "journal_entry", "general_ledger",
];

export type ReportFilters = {
  companyId?: string;
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  employeeId?: string;
  payrollPeriodId?: string;
  payrollId?: string;
  status?: string;
  employmentType?: string;
  costCenterId?: string;
  periodStart?: string;
  periodEnd?: string;
};

export type SalaryRegisterRow = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  costCenter?: string;
  basic: number;
  allowances: number;
  gross: number;
  deductions: number;
  employerContributions: number;
  netSalary: number;
  paymentStatus: string;
};

export type PayrollAnalyticsMetrics = {
  totalPayroll: number;
  averageSalary: number;
  highestSalary: number;
  lowestSalary: number;
  payrollGrowth: number;
  overtimeCost: number;
  bonusCost: number;
  employerContribution: number;
  departmentCost: Record<string, number>;
  headcount: number;
};

export type BankTransferRow = {
  employeeId: string;
  employeeCode: string;
  beneficiaryName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
  amount: number;
  paymentMode: string;
  upiId?: string;
};

export type BankProviderMapping = {
  columns: Array<{ source: string; target: string; defaultValue?: string }>;
  delimiter?: string;
  header?: boolean;
};

export type AccountingProviderMapping = {
  accounts: Record<string, { code: string; name: string }>;
  exportFormat?: string;
};

export const DEFAULT_JOURNAL_ACCOUNTS = {
  salaryExpense: { code: "SAL_EXP", name: "Salary Expense" },
  employerPf: { code: "PF_EMP", name: "Employer PF Contribution" },
  employerEsi: { code: "ESI_EMP", name: "Employer ESI Contribution" },
  employeeDeductions: { code: "EMP_DED", name: "Employee Deductions Payable" },
  taxPayable: { code: "TDS_PAY", name: "TDS Payable" },
  cashBank: { code: "BANK", name: "Cash/Bank Account" },
  roundOff: { code: "ROUND", name: "Round Off" },
} as const;

export type JournalLineInput = {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  costCenterCode?: string;
};

export type ExecutiveDashboardData = {
  kpis: PayrollAnalyticsMetrics;
  charts: {
    monthlyTrend: Array<{ month: string; amount: number }>;
    departmentCost: Array<{ department: string; amount: number }>;
    branchCost: Array<{ branch: string; amount: number }>;
    salaryDistribution: Array<{ range: string; count: number }>;
    overtimeTrend: Array<{ month: string; amount: number }>;
    bonusTrend: Array<{ month: string; amount: number }>;
    headcountTrend: Array<{ month: string; count: number }>;
  };
  forecast: { nextMonthEstimate: number; growthRate: number };
};
