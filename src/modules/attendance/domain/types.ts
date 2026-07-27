export const ATTENDANCE_ROUTES = {
  list: "/dashboard/attendance",
  mark: "/dashboard/attendance/mark",
  corrections: "/dashboard/attendance/corrections",
  rules: "/dashboard/attendance/rules",
  gps: "/dashboard/attendance/gps",
  qr: "/dashboard/attendance/qr",
} as const;

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  early_leaving: "Early Leaving",
  half_day: "Half Day",
  holiday: "Holiday",
  weekly_off: "Weekly Off",
  on_leave: "On Leave",
  work_from_home: "Work From Home",
  outdoor_duty: "Outdoor Duty",
  overtime: "Overtime",
};

export const ATTENDANCE_METHOD_LABELS: Record<string, string> = {
  manual: "Manual",
  gps: "GPS",
  qr: "QR",
  face: "Face",
  biometric: "Biometric",
};

export const CORRECTION_TYPE_LABELS: Record<string, string> = {
  missed_punch: "Missed Punch",
  wrong_timing: "Wrong Timing",
  wrong_location: "Wrong Location",
  manual: "Manual Correction",
};

export type AttendanceListItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  branchName: string;
  departmentName: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workingHours: string;
  effectiveWorkMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  status: string;
  checkInMethod: string | null;
  approvalStatus: string;
  version: number;
};

export type AttendanceDashboardStats = {
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  onLeave: number;
  overtimeCount: number;
  trend: Array<{ date: string; present: number; absent: number }>;
  byDepartment: Array<{ name: string; present: number; total: number }>;
  byBranch: Array<{ name: string; present: number; total: number }>;
};

export type AttendanceCalendarDay = {
  date: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
};

export type AttendanceCorrectionItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  attendanceDate: string;
  correctionType: string;
  reason: string;
  status: string;
  version: number;
};

export type AttendanceRuleItem = {
  id: string;
  name: string;
  gracePeriodMinutes: number;
  lateLimitMinutes: number;
  halfDayThresholdMinutes: number;
  overtimeStartMinutes: number;
  minimumWorkMinutes: number;
  earlyLeavingGraceMinutes: number;
  isDefault: boolean;
  version: number;
};

export type AttendanceReportRow = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  effectiveWorkMinutes: number;
};

export const DEFAULT_ATTENDANCE_RULE = {
  gracePeriodMinutes: 15,
  lateLimitMinutes: 15,
  halfDayThresholdMinutes: 240,
  overtimeStartMinutes: 0,
  minimumWorkMinutes: 480,
  earlyLeavingGraceMinutes: 15,
};
