import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createLeaveApprovalService } from "@/modules/leave/application/leave-approval.service";
import { createLeaveBalanceService } from "@/modules/leave/application/leave-balance.service";
import { createLeaveCalendarService } from "@/modules/leave/application/leave-calendar.service";
import { createLeaveAccrualService } from "@/modules/leave/application/leave-accrual.service";
import { createLeaveAttendanceIntegrationService } from "@/modules/leave/application/leave-attendance-integration.service";
import { createLeavePayrollIntegrationService } from "@/modules/leave/application/leave-payroll-integration.service";
import { createLeavePolicyService } from "@/modules/leave/application/leave-policy.service";
import { createLeaveService } from "@/modules/leave/application/leave.service";
import type { LeaveDashboardStats, LeaveReportRow } from "@/modules/leave/domain/types";
import type { LeaveQueryInput } from "@/modules/leave/validation/schemas";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export class LeaveReportService extends BaseRepository {
  async getDashboardStats(employeeId?: string): Promise<LeaveDashboardStats> {
    const companyId = this.requireCompanyId();
    const year = new Date().getFullYear();
    const today = dateOnly(new Date());

    const balanceSvc = createLeaveBalanceService(companyId);
    const calendarSvc = createLeaveCalendarService(companyId);

    const [pendingCount, approvedCount, rejectedCount, teamOnLeaveToday, pendingApprovals, upcomingHolidays] =
      await Promise.all([
        prisma.leave.count({
          where: { companyId, deletedAt: null, status: "pending", ...(employeeId ? { employeeId } : {}) },
        }),
        prisma.leave.count({
          where: { companyId, deletedAt: null, status: "approved", ...(employeeId ? { employeeId } : {}) },
        }),
        prisma.leave.count({
          where: { companyId, deletedAt: null, status: "rejected", ...(employeeId ? { employeeId } : {}) },
        }),
        prisma.leave.count({
          where: {
            companyId,
            deletedAt: null,
            status: "approved",
            startDate: { lte: today },
            endDate: { gte: today },
          },
        }),
        prisma.leave.count({ where: { companyId, deletedAt: null, status: { in: ["pending", "sent_back"] } } }),
        calendarSvc.getUpcomingHolidays(5),
      ]);

    const myBalances = employeeId ? await balanceSvc.getEmployeeBalances(employeeId, year) : [];

    return {
      myBalances,
      pendingCount,
      approvedCount,
      rejectedCount,
      teamOnLeaveToday,
      upcomingHolidays,
      pendingApprovals,
    };
  }

  async leaveSummaryReport(query: LeaveQueryInput): Promise<LeaveReportRow[]> {
    const companyId = this.requireCompanyId();
    const year = query.dateFrom?.getFullYear() ?? new Date().getFullYear();

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
      },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
      take: 500,
    });

    const rows: LeaveReportRow[] = [];
    for (const emp of employees) {
      const balances = await createLeaveBalanceService(companyId).getEmployeeBalances(emp.id, year);
      for (const b of balances) {
        rows.push({
          employeeCode: emp.employeeCode,
          employeeName: [emp.firstName, emp.lastName].filter(Boolean).join(" "),
          leaveTypeCode: b.leaveTypeCode,
          totalDays: b.openingBalance + b.credited + b.carriedForward,
          usedDays: b.used,
          lwpDays: b.leaveTypeCode === "LWP" ? b.used : 0,
        });
      }
    }
    return rows;
  }

  async lwpReport(query: LeaveQueryInput) {
    const companyId = this.requireCompanyId();
    const rows = await prisma.leave.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: "approved",
        leaveType: { code: "LWP" },
        ...(query.dateFrom || query.dateTo
          ? {
              startDate: { ...(query.dateTo ? { lte: query.dateTo } : {}) },
              endDate: { ...(query.dateFrom ? { gte: query.dateFrom } : {}) },
            }
          : {}),
      },
      include: {
        employee: { select: { employeeCode: true, firstName: true, lastName: true } },
        leaveType: { select: { code: true } },
      },
    });
    return rows.map((r) => ({
      employeeCode: r.employee.employeeCode,
      employeeName: [r.employee.firstName, r.employee.lastName].filter(Boolean).join(" "),
      days: Number(r.totalDays),
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
    }));
  }

  async utilizationReport(year: number) {
    const companyId = this.requireCompanyId();
    const grouped = await prisma.leave.groupBy({
      by: ["leaveTypeId"],
      where: { companyId, deletedAt: null, status: "approved", startDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
      _sum: { totalDays: true },
      _count: { _all: true },
    });

    const types = await prisma.leaveType.findMany({ where: { companyId } });
    const typeMap = new Map(types.map((t) => [t.id, t]));

    return grouped.map((g) => ({
      leaveTypeCode: typeMap.get(g.leaveTypeId)?.code ?? "UNKNOWN",
      leaveTypeName: typeMap.get(g.leaveTypeId)?.name ?? "Unknown",
      totalDaysUsed: Number(g._sum.totalDays ?? 0),
      requestCount: g._count._all,
    }));
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLeaveReportService(companyId: string) {
  return new LeaveReportService(companyId);
}

export function getLeaveServices(companyId: string) {
  return {
    leave: createLeaveService(companyId),
    approval: createLeaveApprovalService(companyId),
    balance: createLeaveBalanceService(companyId),
    policy: createLeavePolicyService(companyId),
    accrual: createLeaveAccrualService(companyId),
    calendar: createLeaveCalendarService(companyId),
    attendance: createLeaveAttendanceIntegrationService(companyId),
    payroll: createLeavePayrollIntegrationService(companyId),
    report: createLeaveReportService(companyId),
  };
}
