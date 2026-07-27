import { prisma } from "@/infrastructure/database/prisma-client";

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

export class LeaveDayCalculator {
  async calculateWorkingDays(params: {
    companyId: string;
    employeeId: string;
    branchId: string;
    startDate: Date;
    endDate: Date;
    halfDayType: string;
    excludeWeeklyOff?: boolean;
  }) {
    const dates = eachDate(params.startDate, params.endDate);
    const holidays = await prisma.holiday.findMany({
      where: {
        companyId: params.companyId,
        deletedAt: null,
        status: "active",
        date: { gte: dateOnly(params.startDate), lte: dateOnly(params.endDate) },
        OR: [{ branchId: null }, { branchId: params.branchId }],
      },
    });
    const holidaySet = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));

    const shiftAssignment = await prisma.shiftAssignment.findFirst({
      where: {
        employeeId: params.employeeId,
        effectiveFrom: { lte: params.endDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: params.startDate } }],
      },
      include: { shift: true },
      orderBy: { effectiveFrom: "desc" },
    });
    const workingDays = (shiftAssignment?.shift.workingDays as number[] | null) ?? [1, 2, 3, 4, 5];

    let count = 0;
    for (const d of dates) {
      const key = d.toISOString().slice(0, 10);
      if (holidaySet.has(key)) continue;
      const dow = d.getUTCDay();
      if (params.excludeWeeklyOff !== false && !workingDays.includes(dow === 0 ? 7 : dow)) continue;
      count += 1;
    }

    if (params.halfDayType !== "none" && count > 0) {
      return Math.max(0.5, count - 0.5);
    }
    return count;
  }

  calculateHours(startTime: string, endTime: string) {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = (sh ?? 0) * 60 + (sm ?? 0);
    const end = (eh ?? 0) * 60 + (em ?? 0);
    return Math.max(0, (end - start) / 60);
  }
}

export const leaveDayCalculator = new LeaveDayCalculator();
