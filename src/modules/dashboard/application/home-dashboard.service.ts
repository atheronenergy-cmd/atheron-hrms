import type { PayrollStatus } from "@prisma/client";

import { prisma } from "@/infrastructure/database/prisma-client";
import { formatRelative, zonedIsoDate } from "@/shared/utils/date.utils";

const PRESENT_STATUSES = new Set([
  "present",
  "late",
  "early_leaving",
  "half_day",
  "work_from_home",
  "outdoor_duty",
  "overtime",
]);

const PROCESSED_PAYROLL: PayrollStatus[] = [
  "calculated",
  "pending_approval",
  "approved",
  "locked",
  "paid",
  "processing",
  "review",
  "finalized",
];

export type HomeAttendancePoint = { day: string; present: number; absent: number };
export type HomePayrollPoint = { month: string; amount: number };
export type HomeActivity = { id: string; action: string; user: string; time: string };
export type HomeAttention = { label: string; count: number; href: string };

export type HomeDashboardData = {
  currency: string;
  employees: number;
  attendanceRate: number | null;
  presentToday: number;
  absentToday: number;
  payrollNetThisMonth: number;
  pendingLeave: number;
  departments: number;
  reportsThisMonth: number;
  attendanceTrend: HomeAttendancePoint[];
  payrollTrend: HomePayrollPoint[];
  activity: HomeActivity[];
  attention: HomeAttention[];
};

function utcDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function shiftIso(iso: string, days: number) {
  const date = utcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(utcDate(iso));
}

function recentMonths(todayIso: string, count: number) {
  const [yearStr, monthStr] = todayIso.split("-");
  let year = Number(yearStr);
  let month = Number(monthStr);
  const months: { year: number; month: number; label: string }[] = [];

  for (let i = 0; i < count; i += 1) {
    months.unshift({
      year,
      month,
      label: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
        new Date(Date.UTC(year, month - 1, 1)),
      ),
    });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  return months;
}

function humanize(action: string) {
  const text = action.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export async function getHomeDashboard(
  companyId: string,
  timeZone: string,
  currency: string,
): Promise<HomeDashboardData> {
  const todayIso = zonedIsoDate(new Date(), timeZone);
  const today = utcDate(todayIso);
  const trendStart = utcDate(shiftIso(todayIso, -6));
  const monthStart = utcDate(`${todayIso.slice(0, 7)}-01`);
  const months = recentMonths(todayIso, 6);
  const firstMonth = months[0]!;
  const payrollRangeStart = new Date(Date.UTC(firstMonth.year, firstMonth.month - 1, 1));

  const [
    employees,
    departments,
    pendingLeave,
    pendingPayroll,
    submittedCorrections,
    reportsThisMonth,
    todayRows,
    trendRows,
    payrollRows,
    activityRows,
  ] = await Promise.all([
    prisma.employee.count({
      where: {
        companyId,
        deletedAt: null,
        status: "active",
        employmentStatus: { in: ["active", "probation", "on_notice", "on_leave", "suspended"] },
      },
    }),
    prisma.department.count({ where: { companyId, deletedAt: null, status: "active" } }),
    prisma.leave.count({ where: { companyId, deletedAt: null, status: { in: ["pending", "sent_back"] } } }),
    prisma.payroll.count({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ["draft", "calculated", "pending_approval", "processing", "review"] },
      },
    }),
    prisma.attendanceCorrection.count({
      where: { companyId, deletedAt: null, status: "submitted" },
    }),
    prisma.payrollReport.count({ where: { companyId, generatedAt: { gte: monthStart } } }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { companyId, deletedAt: null, date: today },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ["date", "status"],
      where: { companyId, deletedAt: null, date: { gte: trendStart, lte: today } },
      _count: { _all: true },
    }),
    prisma.payroll.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { in: PROCESSED_PAYROLL },
        payrollPeriod: { startDate: { gte: payrollRangeStart, lte: today } },
      },
      select: {
        totalNet: true,
        payrollPeriod: { select: { payrollYear: true, payrollMonth: true, startDate: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
  ]);

  let presentToday = 0;
  let absentToday = 0;
  for (const row of todayRows) {
    const count = row._count._all;
    if (row.status === "absent") absentToday += count;
    else if (PRESENT_STATUSES.has(row.status)) presentToday += count;
  }

  const attendanceRate = employees > 0 ? Math.round((presentToday / employees) * 1000) / 10 : null;

  const trend = new Map<string, { present: number; absent: number }>();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const iso = shiftIso(todayIso, -offset);
    trend.set(iso, { present: 0, absent: 0 });
  }
  for (const row of trendRows) {
    const iso = row.date.toISOString().slice(0, 10);
    const entry = trend.get(iso);
    if (!entry) continue;
    if (row.status === "absent") entry.absent += row._count._all;
    else if (PRESENT_STATUSES.has(row.status)) entry.present += row._count._all;
  }

  const payrollByMonth = new Map<string, number>();
  for (const month of months) payrollByMonth.set(`${month.year}-${month.month}`, 0);
  for (const row of payrollRows) {
    const period = row.payrollPeriod;
    const year = period?.payrollYear ?? period?.startDate.getUTCFullYear();
    const month = period?.payrollMonth ?? (period ? period.startDate.getUTCMonth() + 1 : undefined);
    if (!year || !month) continue;
    const key = `${year}-${month}`;
    if (!payrollByMonth.has(key)) continue;
    payrollByMonth.set(key, (payrollByMonth.get(key) ?? 0) + Number(row.totalNet));
  }

  const currentKey = `${Number(todayIso.slice(0, 4))}-${Number(todayIso.slice(5, 7))}`;
  const attention: HomeAttention[] = [];
  if (pendingLeave > 0) {
    attention.push({ label: "Leave requests waiting", count: pendingLeave, href: "/dashboard/leave/approvals" });
  }
  if (pendingPayroll > 0) {
    attention.push({ label: "Payroll runs not finished", count: pendingPayroll, href: "/dashboard/payroll" });
  }
  if (submittedCorrections > 0) {
    attention.push({
      label: "Attendance corrections submitted",
      count: submittedCorrections,
      href: "/dashboard/attendance",
    });
  }

  return {
    currency,
    employees,
    attendanceRate,
    presentToday,
    absentToday,
    payrollNetThisMonth: payrollByMonth.get(currentKey) ?? 0,
    pendingLeave,
    departments,
    reportsThisMonth,
    attendanceTrend: [...trend.entries()].map(([iso, counts]) => ({
      day: weekdayLabel(iso, timeZone),
      present: counts.present,
      absent: counts.absent,
    })),
    payrollTrend: months.map((month) => ({
      month: month.label,
      amount: payrollByMonth.get(`${month.year}-${month.month}`) ?? 0,
    })),
    activity: activityRows.map((row) => ({
      id: row.id,
      action: humanize(row.action),
      user: row.user?.name ?? "System",
      time: formatRelative(row.createdAt),
    })),
    attention,
  };
}
