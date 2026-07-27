import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createAttendanceApprovalService } from "@/modules/attendance/application/attendance-approval.service";
import { createAttendanceCorrectionService } from "@/modules/attendance/application/attendance-correction.service";
import { createAttendanceRuleService } from "@/modules/attendance/application/attendance-rule.service";
import { createAttendanceService } from "@/modules/attendance/application/attendance.service";
import type { AttendanceDashboardStats, AttendanceReportRow } from "@/modules/attendance/domain/types";
import type { AttendanceQueryInput } from "@/modules/attendance/validation/schemas";
import { buildPaginatedResult } from "@/shared/pagination";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export class AttendanceReportService extends BaseRepository {
  async getDashboardStats(): Promise<AttendanceDashboardStats> {
    const companyId = this.requireCompanyId();
    const today = dateOnly(new Date());

    const [present, absent, late, onLeave, overtime, rows] = await Promise.all([
      prisma.attendance.count({ where: { companyId, date: today, deletedAt: null, status: { in: ["present", "overtime", "work_from_home"] } } }),
      prisma.attendance.count({ where: { companyId, date: today, deletedAt: null, status: "absent" } }),
      prisma.attendance.count({ where: { companyId, date: today, deletedAt: null, status: "late" } }),
      prisma.attendance.count({ where: { companyId, date: today, deletedAt: null, status: "on_leave" } }),
      prisma.attendance.count({ where: { companyId, date: today, deletedAt: null, overtimeMinutes: { gt: 0 } } }),
      prisma.attendance.findMany({
        where: {
          companyId,
          deletedAt: null,
          date: { gte: new Date(today.getTime() - 6 * 86400000), lte: today },
        },
        select: { date: true, status: true },
      }),
    ]);

    const trendMap = new Map<string, { present: number; absent: number }>();
    for (const r of rows) {
      const key = r.date.toISOString().slice(0, 10);
      const entry = trendMap.get(key) ?? { present: 0, absent: 0 };
      if (r.status === "absent") entry.absent += 1;
      else entry.present += 1;
      trendMap.set(key, entry);
    }

    const deptRows = await prisma.attendance.groupBy({
      by: ["departmentId"],
      where: { companyId, date: today, deletedAt: null, departmentId: { not: null } },
      _count: { _all: true },
    });

    const byDepartment = await Promise.all(
      deptRows.map(async (d) => {
        const dept = d.departmentId
          ? await prisma.department.findUnique({ where: { id: d.departmentId }, select: { name: true } })
          : null;
        const presentCount = await prisma.attendance.count({
          where: { companyId, date: today, departmentId: d.departmentId, status: { not: "absent" } },
        });
        return { name: dept?.name ?? "Unknown", present: presentCount, total: d._count._all };
      }),
    );

    const branchRows = await prisma.attendance.groupBy({
      by: ["branchId"],
      where: { companyId, date: today, deletedAt: null, branchId: { not: null } },
      _count: { _all: true },
    });

    const byBranch = await Promise.all(
      branchRows.map(async (b) => {
        const branch = b.branchId
          ? await prisma.branch.findUnique({ where: { id: b.branchId }, select: { name: true } })
          : null;
        const presentCount = await prisma.attendance.count({
          where: { companyId, date: today, branchId: b.branchId, status: { not: "absent" } },
        });
        return { name: branch?.name ?? "Unknown", present: presentCount, total: b._count._all };
      }),
    );

    return {
      todayPresent: present,
      todayAbsent: absent,
      todayLate: late,
      onLeave,
      overtimeCount: overtime,
      trend: [...trendMap.entries()].map(([date, v]) => ({ date, ...v })),
      byDepartment,
      byBranch,
    };
  }

  async dailyReport(query: AttendanceQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where = {
      companyId,
      deletedAt: null,
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom ? { gte: dateOnly(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: dateOnly(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { date: "desc" },
        include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      }),
      prisma.attendance.count({ where }),
    ]);

    const items: AttendanceReportRow[] = rows.map((r) => ({
      employeeId: r.employeeId,
      employeeCode: r.employee.employeeCode,
      employeeName: [r.employee.firstName, r.employee.lastName].filter(Boolean).join(" "),
      date: r.date.toISOString().slice(0, 10),
      status: r.status,
      checkInAt: r.checkInAt?.toISOString() ?? null,
      checkOutAt: r.checkOutAt?.toISOString() ?? null,
      lateMinutes: r.lateMinutes,
      overtimeMinutes: r.overtimeMinutes,
      effectiveWorkMinutes: r.effectiveWorkMinutes,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async exportCsv(query: AttendanceQueryInput): Promise<string> {
    const data = await this.dailyReport({ ...query, page: 1, pageSize: 10000 });
    const headers = ["Employee Code", "Name", "Date", "Status", "Check In", "Check Out", "Late Min", "OT Min", "Work Min"];
    const lines = data.items.map((r) =>
      [r.employeeCode, r.employeeName, r.date, r.status, r.checkInAt ?? "", r.checkOutAt ?? "", r.lateMinutes, r.overtimeMinutes, r.effectiveWorkMinutes].join(","),
    );
    return [headers.join(","), ...lines].join("\n");
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createAttendanceReportService(companyId: string) {
  return new AttendanceReportService(companyId);
}

export function getAttendanceServices(companyId: string) {
  return {
    attendance: createAttendanceService(companyId),
    rules: createAttendanceRuleService(companyId),
    correction: createAttendanceCorrectionService(companyId),
    approval: createAttendanceApprovalService(companyId),
    report: createAttendanceReportService(companyId),
  };
}
