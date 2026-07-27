import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { attendanceCalculationService } from "@/modules/attendance/application/attendance-calculation.service";
import { createAttendanceRuleService } from "@/modules/attendance/application/attendance-rule.service";
import type { AttendanceCalendarDay, AttendanceListItem } from "@/modules/attendance/domain/types";
import type { AttendancePunchInput, AttendanceQueryInput, ManualAttendanceInput } from "@/modules/attendance/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export class AttendanceService extends BaseRepository {
  private get rules() {
    return createAttendanceRuleService(this.requireCompanyId());
  }
  private calc = attendanceCalculationService;

  async list(query: AttendanceQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const orderBy = { [query.sortBy ?? "date"]: query.sortOrder ?? "desc" } as Prisma.AttendanceOrderByWithRelationInput;

    const where: Prisma.AttendanceWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom ? { gte: dateOnly(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: dateOnly(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            employee: {
              OR: [
                { firstName: { contains: query.search, mode: "insensitive" } },
                { lastName: { contains: query.search, mode: "insensitive" } },
                { employeeCode: { contains: query.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          employee: {
            select: {
              employeeCode: true,
              firstName: true,
              lastName: true,
              branch: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return buildPaginatedResult(rows.map((r) => this.toListItem(r)), totalItems, page, pageSize);
  }

  async punch(input: AttendancePunchInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await this.getEmployee(input.employeeId, companyId);
    const now = input.timestamp ?? new Date();
    const day = dateOnly(now);

    let attendance = await prisma.attendance.findFirst({
      where: { companyId, employeeId: input.employeeId, date: day, deletedAt: null },
    });

    if (!attendance) {
      const shift = await this.resolveShift(input.employeeId, day);
      attendance = await prisma.attendance.create({
        data: {
          companyId,
          employeeId: input.employeeId,
          date: day,
          shiftId: shift?.id ?? null,
          branchId: emp.branchId,
          departmentId: emp.departmentId,
          status: "absent",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
    }

    await prisma.attendanceLog.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        attendanceId: attendance.id,
        punchedAt: now,
        punchType: input.punchType,
        method: input.method,
        location: (input.location ?? null) as object,
        deviceInfo: (input.deviceInfo ?? null) as object,
      },
    });

    const logs = await prisma.attendanceLog.findMany({
      where: { attendanceId: attendance.id },
      orderBy: { punchedAt: "asc" },
    });

    const checkInAt = logs.find((l) => l.punchType === "in")?.punchedAt ?? attendance.checkInAt;
    const checkOutAt = [...logs].reverse().find((l) => l.punchType === "out")?.punchedAt ?? attendance.checkOutAt;
    const breakMinutes = this.calculateBreakMinutes(logs);
    const shiftWindow = attendance.shiftId ? await this.getShiftWindow(attendance.shiftId) : null;
    const rule = await this.rules.getDefault();
    const calculated = this.calc.calculate({ checkInAt, checkOutAt, breakMinutes, shift: shiftWindow, rule });

    return prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkInAt: input.punchType === "in" && !attendance.checkInAt ? now : checkInAt,
        checkOutAt: input.punchType === "out" ? now : checkOutAt,
        checkInMethod: input.punchType === "in" ? input.method : attendance.checkInMethod,
        checkOutMethod: input.punchType === "out" ? input.method : attendance.checkOutMethod,
        totalWorkMinutes: calculated.totalWorkMinutes,
        effectiveWorkMinutes: calculated.effectiveWorkMinutes,
        breakMinutes: calculated.breakMinutes,
        lateMinutes: calculated.lateMinutes,
        earlyLeavingMinutes: calculated.earlyLeavingMinutes,
        overtimeMinutes: calculated.overtimeMinutes,
        status: calculated.status,
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  async createManual(input: ManualAttendanceInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await this.getEmployee(input.employeeId, companyId);
    const day = dateOnly(input.date);
    const shift = await this.resolveShift(input.employeeId, day);
    const rule = await this.rules.getDefault();
    const shiftWindow = shift ? this.calc.shiftFromTimes(shift.startTime, shift.endTime, shift.breakDurationMinutes, shift.isOvernight) : null;
    const calculated = this.calc.calculate({
      checkInAt: input.checkInAt ?? null,
      checkOutAt: input.checkOutAt ?? null,
      breakMinutes: shift?.breakDurationMinutes ?? 0,
      shift: shiftWindow,
      rule,
    });

    const row = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: input.employeeId, date: day } },
      create: {
        companyId,
        employeeId: input.employeeId,
        date: day,
        shiftId: shift?.id ?? null,
        branchId: emp.branchId,
        departmentId: emp.departmentId,
        checkInAt: input.checkInAt ?? null,
        checkOutAt: input.checkOutAt ?? null,
        checkInMethod: input.method,
        checkOutMethod: input.checkOutAt ? input.method : null,
        status: input.status ?? calculated.status,
        totalWorkMinutes: calculated.totalWorkMinutes,
        effectiveWorkMinutes: calculated.effectiveWorkMinutes,
        breakMinutes: calculated.breakMinutes,
        lateMinutes: calculated.lateMinutes,
        earlyLeavingMinutes: calculated.earlyLeavingMinutes,
        overtimeMinutes: calculated.overtimeMinutes,
        approvalStatus: "approved",
        remarks: input.remarks ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: {
        checkInAt: input.checkInAt ?? null,
        checkOutAt: input.checkOutAt ?? null,
        status: input.status ?? calculated.status,
        totalWorkMinutes: calculated.totalWorkMinutes,
        effectiveWorkMinutes: calculated.effectiveWorkMinutes,
        breakMinutes: calculated.breakMinutes,
        lateMinutes: calculated.lateMinutes,
        earlyLeavingMinutes: calculated.earlyLeavingMinutes,
        overtimeMinutes: calculated.overtimeMinutes,
        approvalStatus: "approved",
        remarks: input.remarks ?? null,
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    if (input.checkInAt) {
      await prisma.attendanceLog.create({
        data: {
          companyId,
          employeeId: input.employeeId,
          attendanceId: row.id,
          punchedAt: input.checkInAt,
          punchType: "in",
          method: input.method,
        },
      });
    }
    if (input.checkOutAt) {
      await prisma.attendanceLog.create({
        data: {
          companyId,
          employeeId: input.employeeId,
          attendanceId: row.id,
          punchedAt: input.checkOutAt,
          punchType: "out",
          method: input.method,
        },
      });
    }

    return row;
  }

  async getCalendar(employeeId: string, year: number, month: number): Promise<AttendanceCalendarDay[]> {
    const companyId = this.requireCompanyId();
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));

    const rows = await prisma.attendance.findMany({
      where: { companyId, employeeId, deletedAt: null, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    });

    return rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      status: r.status,
      checkInAt: r.checkInAt?.toISOString() ?? null,
      checkOutAt: r.checkOutAt?.toISOString() ?? null,
      lateMinutes: r.lateMinutes,
      overtimeMinutes: r.overtimeMinutes,
    }));
  }

  private calculateBreakMinutes(logs: Array<{ punchType: string; punchedAt: Date }>) {
    let total = 0;
    let breakStart: Date | null = null;
    for (const log of logs) {
      if (log.punchType === "break_start") breakStart = log.punchedAt;
      if (log.punchType === "break_end" && breakStart) {
        total += Math.round((log.punchedAt.getTime() - breakStart.getTime()) / 60000);
        breakStart = null;
      }
    }
    return total;
  }

  private async resolveShift(employeeId: string, date: Date) {
    return prisma.shiftAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      include: { shift: true },
      orderBy: { effectiveFrom: "desc" },
    }).then((a) => a?.shift ?? null);
  }

  private async getShiftWindow(shiftId: string) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) return null;
    return this.calc.shiftFromTimes(shift.startTime, shift.endTime, shift.breakDurationMinutes, shift.isOvernight);
  }

  private toListItem(
    r: Prisma.AttendanceGetPayload<{
      include: {
        employee: {
          select: {
            employeeCode: true;
            firstName: true;
            lastName: true;
            branch: { select: { name: true } };
            department: { select: { name: true } };
          };
        };
      };
    }>,
  ): AttendanceListItem {
    return {
      id: r.id,
      employeeId: r.employeeId,
      employeeCode: r.employee.employeeCode,
      employeeName: [r.employee.firstName, r.employee.lastName].filter(Boolean).join(" "),
      branchName: r.employee.branch.name,
      departmentName: r.employee.department.name,
      date: r.date.toISOString().slice(0, 10),
      checkInAt: r.checkInAt?.toISOString() ?? null,
      checkOutAt: r.checkOutAt?.toISOString() ?? null,
      workingHours: this.calc.formatMinutes(r.effectiveWorkMinutes),
      effectiveWorkMinutes: r.effectiveWorkMinutes,
      lateMinutes: r.lateMinutes,
      overtimeMinutes: r.overtimeMinutes,
      status: r.status,
      checkInMethod: r.checkInMethod,
      approvalStatus: r.approvalStatus,
      version: r.version,
    };
  }

  private async getEmployee(employeeId: string, companyId: string) {
    const emp = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
    if (!emp) throw new NotFoundError("Employee", employeeId);
    return emp;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createAttendanceService(companyId: string) {
  return new AttendanceService(companyId);
}
