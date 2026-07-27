export const SALARY_ROUTES = {
  dashboard: "/dashboard/payroll",
  structures: "/dashboard/payroll/structures",
  components: "/dashboard/payroll/components",
  templates: "/dashboard/payroll/templates",
  payGrades: "/dashboard/payroll/pay-grades",
  employeeSalary: "/dashboard/payroll/employee-salary",
  revisions: "/dashboard/payroll/revisions",
} as const;

export const DEFAULT_SALARY_STRUCTURES = [
  { code: "FACTORY_WORKER", name: "Factory Worker" },
  { code: "ASSEMBLY_OP", name: "Assembly Operator" },
  { code: "ENGINEER", name: "Engineer" },
  { code: "HR_EXEC", name: "HR Executive" },
  { code: "SALES_EXEC", name: "Sales Executive" },
  { code: "BRANCH_MGR", name: "Branch Manager" },
  { code: "DIRECTOR", name: "Director" },
  { code: "INTERN", name: "Intern" },
  { code: "CONTRACT", name: "Contract Employee" },
];

export const DEFAULT_EARNING_COMPONENTS = [
  { code: "BASIC", name: "Basic", calculationType: "fixed" as const },
  { code: "HRA", name: "HRA", calculationType: "percentage" as const, percentageOf: "BASIC", percentageValue: 40 },
  { code: "DA", name: "DA", calculationType: "percentage" as const, percentageOf: "BASIC", percentageValue: 20 },
  { code: "CONVEYANCE", name: "Conveyance", calculationType: "fixed" as const },
  { code: "MEDICAL", name: "Medical", calculationType: "fixed" as const },
  { code: "SPECIAL", name: "Special Allowance", calculationType: "formula" as const, formulaExpression: "GROSS - BASIC - HRA - DA" },
];

export const DEFAULT_DEDUCTION_COMPONENTS = [
  { code: "PF", name: "PF", calculationType: "percentage" as const, percentageOf: "BASIC", percentageValue: 12 },
  { code: "ESI", name: "ESI", calculationType: "percentage" as const, percentageOf: "GROSS", percentageValue: 0.75 },
  { code: "PT", name: "Professional Tax", calculationType: "fixed" as const },
  { code: "LOAN", name: "Loan Recovery", calculationType: "manual" as const },
  { code: "ADVANCE", name: "Advance Recovery", calculationType: "manual" as const },
  { code: "LWP", name: "LWP Deduction", calculationType: "computed" as const },
];

export const DEFAULT_PAY_GRADES = [
  { code: "GRADE_A", name: "Grade A", level: 1 },
  { code: "GRADE_B", name: "Grade B", level: 2 },
  { code: "GRADE_C", name: "Grade C", level: 3 },
];

export type SalaryStructureListItem = {
  id: string;
  code: string;
  name: string;
  payFrequency: string;
  payGradeName: string | null;
  componentCount: number;
  monthlyCtcDefault: number | null;
  status: string;
  version: number;
};

export type SalaryComponentListItem = {
  id: string;
  code: string;
  name: string;
  structureCode: string;
  structureName: string;
  componentType: string;
  calculationType: string;
  amount: number;
  sortOrder: number;
  status: string;
};

export type EmployeeSalaryListItem = {
  id: string;
  employeeCode: string;
  employeeName: string;
  structureCode: string;
  structureName: string;
  baseSalary: number;
  monthlyCtc: number;
  annualCtc: number;
  approvalStatus: string;
  effectiveFrom: string;
  version: number;
};

export type SalaryRevisionListItem = {
  id: string;
  employeeCode: string;
  employeeName: string;
  previousSalary: number;
  newSalary: number;
  effectiveDate: string;
  reason: string | null;
  approvalStatus: string;
  approvedBy: string | null;
};

export type FormulaValidationResult = {
  valid: boolean;
  dependencies: string[];
  errors: string[];
  preview?: number;
};

export const PAYROLL_ROUTES = {
  dashboard: "/dashboard/payroll",
  generate: "/dashboard/payroll/generate",
  preview: "/dashboard/payroll/preview",
  history: "/dashboard/payroll/history",
  details: "/dashboard/payroll/details",
  periods: "/dashboard/payroll/periods",
  structures: "/dashboard/payroll/structures",
  components: "/dashboard/payroll/components",
  templates: "/dashboard/payroll/templates",
  payGrades: "/dashboard/payroll/pay-grades",
  employeeSalary: "/dashboard/payroll/employee-salary",
  revisions: "/dashboard/payroll/revisions",
  payslips: "/dashboard/payroll/payslips",
  myPayslips: "/dashboard/payroll/my-payslips",
} as const;

export const PLACEHOLDER_COMPONENT_CODES = new Set<string>([]);

export type PayrollDashboardStats = {
  pendingCount: number;
  approvedCount: number;
  employeesProcessed: number;
  totalGross: number;
  totalNet: number;
  pendingErrors: number;
};

export type PayrollPreviewResult = {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  components: Array<{ code: string; name: string; type: string; amount: number; isPlaceholder?: boolean }>;
  attendance: Record<string, number>;
  leave: Record<string, number>;
  gross: number;
  deductions: number;
  net: number;
  warnings: string[];
};

export type PayrollCalculationResult = PayrollPreviewResult & {
  paidDays: number;
  workingDays: number;
  employeeSalaryId?: string;
  salaryStructureId?: string;
  statutory?: import("@/modules/statutory/domain/types").StatutoryCalculationResult;
  earnings?: import("@/modules/earnings/domain/types").EarningsCalculationResult;
};
