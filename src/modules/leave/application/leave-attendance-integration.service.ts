import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { leaveDayCalculator } from "@/modules/leave/application/leave-day-calculator";
import { NotFoundError } from "@/shared/errors";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function eachDate(start: Date, end: Date) {
  const dates: Date[] = [];
  const cur = dateOnly(start);
  const last = dateOnly(end);
  while (cur <= last) {
    dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export class LeaveAttendanceIntegrationService extends BaseRepository {
  async syncApprovedLeave(leaveId: string, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const leave = await prisma.leave.findFirst({
      where: { id: leaveId, companyId, deletedAt: null },
      include: { leaveType: true, employee: true },
    });
    if (!leave) throw new NotFoundError("Leave", leaveId);

    const dates = eachDate(leave.startDate, leave.endDate);
    let leaveDayCount = 0;

    for (const day of dates) {
      const workingDays = await leaveDayCalculator.calculateWorkingDays({
        companyId,
        employeeId: leave.employeeId,
        branchId: leave.branchId ?? leave.employee.branchId,
        startDate: day,
        endDate: day,
        halfDayType: "none",
      });
      if (workingDays <= 0) continue;

      const isHalf =
        leave.halfDayType !== "none" &&
        (dates.length === 1 || day.getTime() === dateOnly(leave.startDate).getTime() || day.getTime() === dateOnly(leave.endDate).getTime());
      const status =
        leave.leaveType.code === "WFH"
          ? "work_from_home"
          : leave.leaveType.code === "OD"
            ? "outdoor_duty"
            : isHalf
              ? "half_day"
              : "on_leave";

      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: leave.employeeId, date: day } },
        create: {
          companyId,
          employeeId: leave.employeeId,
          date: day,
          branchId: leave.branchId ?? leave.employee.branchId,
          departmentId: leave.departmentId ?? leave.employee.departmentId,
          status: status as never,
          approvalStatus: "approved",
          remarks: `Leave: ${leave.leaveType.code}`,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
        update: {
          status: status as never,
          approvalStatus: "approved",
          remarks: `Leave: ${leave.leaveType.code}`,
          updatedBy: actorUserId,
          version: { increment: 1 },
        },
      });

      leaveDayCount += isHalf ? 0.5 : 1;
    }

    await this.updateMonthlySummary(leave.employeeId, leave.startDate, leaveDayCount);
    return { leaveId, daysUpdated: leaveDayCount };
  }

  private async updateMonthlySummary(employeeId: string, refDate: Date, leaveDays: number) {
    const companyId = this.requireCompanyId();
    const periodStart = dateOnly(new Date(Date.UTC(refDate.getFullYear(), refDate.getMonth(), 1)));
    const periodEnd = dateOnly(new Date(Date.UTC(refDate.getFullYear(), refDate.getMonth() + 1, 0)));

    await prisma.attendanceSummary.upsert({
      where: { employeeId_periodType_periodStart: { employeeId, periodType: "monthly", periodStart } },
      create: {
        companyId,
        employeeId,
        periodType: "monthly",
        periodStart,
        periodEnd,
        leaveDays: Math.ceil(leaveDays),
      },
      update: {
        leaveDays: { increment: Math.ceil(leaveDays) },
      },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLeaveAttendanceIntegrationService(companyId: string) {
  return new LeaveAttendanceIntegrationService(companyId);
}
