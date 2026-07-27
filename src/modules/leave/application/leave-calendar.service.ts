import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { LeaveCalendarDay } from "@/modules/leave/domain/types";
import type { LeaveCalendarQueryInput } from "@/modules/leave/validation/schemas";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export class LeaveCalendarService extends BaseRepository {
  async getCalendar(query: LeaveCalendarQueryInput, scopeEmployeeId?: string): Promise<LeaveCalendarDay[]> {
    const companyId = this.requireCompanyId();
    const start = dateOnly(new Date(Date.UTC(query.year, query.month - 1, 1)));
    const end = dateOnly(new Date(Date.UTC(query.year, query.month, 0)));

    const where = {
      companyId,
      deletedAt: null,
      status: query.status ?? ("approved" as const),
      startDate: { lte: end },
      endDate: { gte: start },
      ...(query.view === "personal" && scopeEmployeeId ? { employeeId: scopeEmployeeId } : {}),
      ...(query.view === "department" && query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.view === "branch" && query.branchId ? { branchId: query.branchId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    };

    const rows = await prisma.leave.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { code: true } },
      },
    });

    const days: LeaveCalendarDay[] = [];
    for (const leave of rows) {
      const cur = dateOnly(leave.startDate);
      const last = dateOnly(leave.endDate);
      while (cur <= last) {
        if (cur >= start && cur <= end) {
          days.push({
            date: cur.toISOString().slice(0, 10),
            employeeId: leave.employeeId,
            employeeName: [leave.employee.firstName, leave.employee.lastName].filter(Boolean).join(" "),
            leaveTypeCode: leave.leaveType.code,
            status: leave.status,
            halfDayType: leave.halfDayType,
          });
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }
    return days;
  }

  async getUpcomingHolidays(limit = 5) {
    const companyId = this.requireCompanyId();
    const today = dateOnly(new Date());
    const rows = await prisma.holiday.findMany({
      where: { companyId, deletedAt: null, status: "active", date: { gte: today } },
      orderBy: { date: "asc" },
      take: limit,
    });
    return rows.map((h) => ({ name: h.name, date: h.date.toISOString().slice(0, 10) }));
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLeaveCalendarService(companyId: string) {
  return new LeaveCalendarService(companyId);
}
