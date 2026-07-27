export const APP_NAME = "Atheron HRMS";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const DATE_FORMAT = "dd MMM yyyy";
export const DATETIME_FORMAT = "dd MMM yyyy HH:mm";
export const TIME_FORMAT = "HH:mm";

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export const DEFAULT_CURRENCY = "INR";

export const PASSWORD_MIN_LENGTH = 12;
export const MAX_UPLOAD_SIZE_MB = 10;

export const ROUTES = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  portal: "/portal",
  maintenance: "/maintenance",
  unauthorized: "/unauthorized",
} as const;

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  permission?: string;
  permissions?: string[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", permission: "dashboard.view.read" },
  {
    label: "Company",
    href: "/dashboard/company",
    icon: "Building",
    permission: "company.profile.read",
  },
  {
    label: "Employees",
    href: "/dashboard/employees",
    icon: "Users",
    permission: "employee.profile.read",
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: "UserCog",
    permission: "user.account.read",
  },
  {
    label: "Attendance",
    href: "/dashboard/attendance",
    icon: "Clock",
    permission: "attendance.record.read",
  },
  {
    label: "Leave",
    href: "/dashboard/leave",
    icon: "CalendarDays",
    permission: "leave.view.read",
  },
  {
    label: "Payroll",
    href: "/dashboard/payroll",
    icon: "Wallet",
    permission: "payroll.payrun.read",
  },
  {
    label: "Loans",
    href: "/dashboard/loans",
    icon: "Wallet",
    permission: "loan.view.read",
  },
  {
    label: "Earnings",
    href: "/dashboard/earnings",
    icon: "BarChart3",
    permission: "overtime.module.read",
  },
  {
    label: "Statutory",
    href: "/dashboard/statutory",
    icon: "Shield",
    permission: "statutory.module.read",
  },
  {
    label: "Departments",
    href: "/dashboard/departments",
    icon: "Building2",
    permission: "department.profile.read",
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: "BarChart3",
    permissions: ["report.general.read", "report.payroll.read", "report.attendance.read"],
  },
  {
    label: "Security",
    href: "/dashboard/security",
    icon: "Shield",
    permission: "settings.security.read",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: "Settings",
    permissions: ["settings.system.read", "settings.permission.manage", "user.account.read"],
  },
];
