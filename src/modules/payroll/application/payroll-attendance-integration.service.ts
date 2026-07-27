import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export type AttendancePayrollSummary = {
  presentDays: number;
  absentDays: number;
  paidDays: number;
  workingDays: number;
  lateCount: number;
  halfDays: number;
  overtimeHours: number;
};

export class PayrollAttendanceIntegrationService extends BaseRepository {
  async getSummary(employeeId: string, startDate: Date, endDate: Date): Promise<AttendancePayrollSummary> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.attendance.findMany({
      where: {
        companyId,
        employeeId,
        deletedAt: null,
        date: { gte: dateOnly(startDate), lte: dateOnly(endDate) },
      },
    });

    let presentDays = 0;
    let absentDays = 0;
    let lateCount = 0;
    let halfDays = 0;
    let overtimeHours = 0;

    for (const r of rows) {
      if (r.status === "absent") absentDays += 1;
      else if (r.status === "half_day") halfDays += 0.5;
      else if (["present", "late", "overtime", "work_from_home", "outdoor_duty", "on_leave"].includes(r.status)) {
        presentDays += r.status === "half_day" ? 0.5 : 1;
      }
      if (r.status === "late") lateCount += 1;
      overtimeHours += (r.overtimeMinutes ?? 0) / 60;
    }

    const workingDays = Math.max(1, this.estimateWorkingDays(startDate, endDate));
    const paidDays = Math.max(0, presentDays);

    return { presentDays, absentDays, paidDays, workingDays, lateCount, halfDays, overtimeHours };
  }

  private estimateWorkingDays(start: Date, end: Date) {
    let count = 0;
    const cur = dateOnly(start);
    const last = dateOnly(end);
    while (cur <= last) {
      const dow = cur.getUTCDay();
      if (dow !== 0 && dow !== 6) count += 1;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return count || 1;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollAttendanceIntegrationService(companyId: string) {
  return new PayrollAttendanceIntegrationService(companyId);
}
