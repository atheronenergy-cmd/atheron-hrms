export const LEAVE_ROUTES = {
  dashboard: "/dashboard/leave",
  apply: "/dashboard/leave/apply",
  myLeave: "/dashboard/leave/my",
  team: "/dashboard/leave/team",
  approvals: "/dashboard/leave/approvals",
  policies: "/dashboard/leave/policies",
  balance: "/dashboard/leave/balance",
  calendar: "/dashboard/leave/calendar",
} as const;

export const LEAVE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  sent_back: "Sent Back",
};

export const DEFAULT_LEAVE_TYPES = [
  { code: "CL", name: "Casual Leave", isPaid: true, accrualRate: 12 },
  { code: "SL", name: "Sick Leave", isPaid: true, accrualRate: 12, requiresAttachment: true },
  { code: "EL", name: "Earned Leave", isPaid: true, isCarryForward: true, accrualRate: 15 },
  { code: "PL", name: "Privilege Leave", isPaid: true, isCarryForward: true, accrualRate: 18 },
  { code: "ML", name: "Maternity Leave", isPaid: true, genderRestriction: "female" as const },
  { code: "PTL", name: "Paternity Leave", isPaid: true, genderRestriction: "male" as const },
  { code: "MRL", name: "Marriage Leave", isPaid: true, maxDaysPerRequest: 5 },
  { code: "BL", name: "Bereavement Leave", isPaid: true, maxDaysPerRequest: 5 },
  { code: "CO", name: "Compensatory Off", isPaid: true },
  { code: "WFH", name: "Work From Home", isPaid: true, halfDayAllowed: true },
  { code: "OD", name: "Outdoor Duty", isPaid: true },
  { code: "LWP", name: "Leave Without Pay", isPaid: false },
];

export type LeaveListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  halfDayType: string;
  status: string;
  version: number;
};

export type LeaveBalanceItem = {
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  year: number;
  openingBalance: number;
  credited: number;
  used: number;
  pending: number;
  rejected: number;
  expired: number;
  carriedForward: number;
  closingBalance: number;
};

export type LeaveDashboardStats = {
  myBalances: LeaveBalanceItem[];
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  teamOnLeaveToday: number;
  upcomingHolidays: Array<{ name: string; date: string }>;
  pendingApprovals: number;
};

export type LeaveCalendarDay = {
  date: string;
  employeeId: string;
  employeeName: string;
  leaveTypeCode: string;
  status: string;
  halfDayType: string;
};

export type LeaveApprovalItem = {
  id: string;
  leaveId: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  currentApprovalLevel: number;
  version: number;
};

export type LeaveReportRow = {
  employeeCode: string;
  employeeName: string;
  leaveTypeCode: string;
  totalDays: number;
  usedDays: number;
  lwpDays: number;
};
