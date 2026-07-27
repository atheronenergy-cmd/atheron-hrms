import type { PayslipPasswordRule, PayrollDocumentType } from "@prisma/client";

export const PAYROLL_DOCUMENT_ROUTES = {
  dashboard: "/dashboard/payroll/payslips",
  preview: "/dashboard/payroll/payslips/preview",
  employees: "/dashboard/payroll/payslips/employees",
  archive: "/dashboard/payroll/payslips/archive",
  certificates: "/dashboard/payroll/payslips/certificates",
  history: "/dashboard/payroll/payslips/history",
  myPayslips: "/dashboard/payroll/my-payslips",
  verify: "/verify/payslip",
} as const;

export type PayslipLineItem = {
  code: string;
  name: string;
  amount: number;
};

export type PayslipRenderData = {
  documentNumber: string;
  payslipNumber: string;
  company: {
    name: string;
    legalName?: string | null;
    address?: Record<string, unknown>;
    email?: string | null;
    phone?: string | null;
    gstNumber?: string | null;
    panNumber?: string | null;
    logoUrl?: string | null;
  };
  employee: {
    code: string;
    name: string;
    designation: string;
    department: string;
    joiningDate: string;
    bankDetails?: Record<string, unknown>;
  };
  period: {
    name: string;
    startDate: string;
    endDate: string;
    payDate?: string | null;
  };
  workingDays: number;
  paidDays: number;
  attendanceSummary: Record<string, unknown>;
  leaveSummary: Record<string, unknown>;
  earnings: PayslipLineItem[];
  deductions: PayslipLineItem[];
  employerContributions: PayslipLineItem[];
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  paymentMode?: string | null;
  generatedAt: string;
  verificationHash?: string;
  qrCodeDataUrl?: string;
};

export type PayrollDocumentDashboardStats = {
  totalPayslips: number;
  generatedThisMonth: number;
  pendingGeneration: number;
  emailsSent: number;
  emailsFailed: number;
  archivedDocuments: number;
  certificatesIssued: number;
};

export type PayrollDocumentReportType =
  | "payslip_generation"
  | "email_delivery"
  | "archive"
  | "salary_certificate";

export const DEFAULT_PASSWORD_RULE: PayslipPasswordRule = "employee_id_dob";

export const EXPORT_TYPES = [
  "payroll_register",
  "salary_register",
  "department_payroll",
  "branch_payroll",
  "employee_payroll",
  "monthly_payroll",
] as const;

export type PayrollExportType = (typeof EXPORT_TYPES)[number];

export const EXPORT_DOCUMENT_TYPE_MAP: Record<PayrollExportType, PayrollDocumentType> = {
  payroll_register: "payroll_register",
  salary_register: "salary_register",
  department_payroll: "department_payroll",
  branch_payroll: "branch_payroll",
  employee_payroll: "payslip",
  monthly_payroll: "monthly_payroll",
};

export type SalaryCertificateRenderData = {
  documentNumber: string;
  companyName: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  joiningDate: string;
  currentSalary: number;
  grossSalary: number;
  issuedDate: string;
  authorizedSignatory: string;
  verificationHash?: string;
  qrCodeDataUrl?: string;
};
