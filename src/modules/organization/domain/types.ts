export const ORG_ROUTES = {
  dashboard: "/dashboard/company",
  profile: "/dashboard/company/profile",
  branches: "/dashboard/company/branches",
  branchNew: "/dashboard/company/branches/new",
  branchDetail: (id: string) => `/dashboard/company/branches/${id}`,
  branchEdit: (id: string) => `/dashboard/company/branches/${id}/edit`,
  departments: "/dashboard/departments",
  departmentNew: "/dashboard/departments/new",
  departmentEdit: (id: string) => `/dashboard/departments/${id}/edit`,
  designations: "/dashboard/company/designations",
  designationNew: "/dashboard/company/designations/new",
  designationEdit: (id: string) => `/dashboard/company/designations/${id}/edit`,
  structure: "/dashboard/company/structure",
  schedules: "/dashboard/company/schedules",
  scheduleNew: "/dashboard/company/schedules/new",
  scheduleEdit: (id: string) => `/dashboard/company/schedules/${id}/edit`,
  holidays: "/dashboard/company/holidays",
  holidayNew: "/dashboard/company/holidays/new",
  holidayEdit: (id: string) => `/dashboard/company/holidays/${id}/edit`,
  policies: "/dashboard/company/policies",
  policyNew: "/dashboard/company/policies/new",
  policyEdit: (id: string) => `/dashboard/company/policies/${id}/edit`,
  settings: "/dashboard/company/settings",
} as const;

export const RECORD_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  trial: "Trial",
};

export const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  public: "Public Holiday",
  restricted: "Restricted Holiday",
  optional: "Optional Holiday",
};

export const HR_POLICY_CATEGORY_LABELS: Record<string, string> = {
  attendance: "Attendance Policy",
  leave: "Leave Policy",
  payroll: "Payroll Policy",
  overtime: "Overtime Policy",
  probation: "Probation Policy",
};

export type CompanyProfile = {
  id: string;
  name: string;
  legalName: string | null;
  slug: string;
  companyCode: string | null;
  logoFileId: string | null;
  registrationNumber: string | null;
  taxId: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  cinNumber: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: Record<string, unknown>;
  countryCode: string;
  state: string | null;
  city: string | null;
  pinCode: string | null;
  currencyCode: string;
  timezone: string;
  dateFormat: string;
  fiscalYearStartMonth: number;
  payrollCycleDay: number | null;
  status: string;
  version: number;
};

export type OrgDashboardStats = {
  branchCount: number;
  departmentCount: number;
  designationCount: number;
  activePolicyCount: number;
  employeeCount: number;
  holidayCount: number;
  scheduleCount: number;
};

export type OrgStructureNode = {
  id: string;
  type: "company" | "branch" | "department" | "designation";
  label: string;
  code?: string;
  status: string;
  children?: OrgStructureNode[];
};

export type BranchListItem = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  isHeadOffice: boolean;
  status: string;
  city: string | null;
  managerName: string | null;
  employeeCount: number;
  version: number;
};

export type DepartmentListItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  branchName: string | null;
  status: string;
  employeeCount: number;
  version: number;
};

export type DesignationListItem = {
  id: string;
  name: string;
  code: string;
  level: number;
  departmentName: string | null;
  status: string;
  employeeCount: number;
  version: number;
};

export type HolidayListItem = {
  id: string;
  name: string;
  date: Date;
  holidayType: string;
  branchName: string | null;
  calendarYear: number;
  status: string;
  version: number;
};

export type PolicyListItem = {
  id: string;
  name: string;
  code: string;
  category: string;
  status: string;
  version: number;
};

export type ScheduleListItem = {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  workingDays: number[];
  status: string;
  version: number;
};

export type CompanySettingsData = {
  defaultCurrency: string;
  timezone: string;
  payrollDate: number | null;
  dateFormat: string;
  attendanceRules: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
  documentSettings: Record<string, unknown>;
};
