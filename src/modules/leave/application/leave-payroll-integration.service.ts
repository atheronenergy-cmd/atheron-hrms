import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";

export type LeavePayrollAdjustment = {
  employeeId: string;
  employeeCode: string;
  leaveTypeCode: string;
  isPaid: boolean;
  totalDays: number;
  lwpDays: number;
  paidLeaveDays: number;
  startDate: string;
  endDate: string;
  encashmentDays: number;
  encashmentAmount: number;
};

export class LeavePayrollIntegrationService extends BaseRepository {
  /**
   * Prepare payroll adjustment payloads for approved leaves in a pay period.
   * Does not calculate salary — only exports leave data for payroll module.
   */
  async getPayrollAdjustments(params: { periodStart: Date; periodEnd: Date; employeeId?: string }) {
    const companyId = this.requireCompanyId();
    const rows = await prisma.leave.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: "approved",
        ...(params.employeeId ? { employeeId: params.employeeId } : {}),
        startDate: { lte: params.periodEnd },
        endDate: { gte: params.periodStart },
      },
      include: {
        employee: { select: { employeeCode: true } },
        leaveType: { select: { code: true, isPaid: true } },
      },
    });

    const encashments = await prisma.leaveEncashment.findMany({
      where: {
        companyId,
        status: "approved",
        ...(params.employeeId ? { employeeId: params.employeeId } : {}),
      },
    });

    const encByEmployee = new Map<string, { days: number; amount: number }>();
    for (const e of encashments) {
      const cur = encByEmployee.get(e.employeeId) ?? { days: 0, amount: 0 };
      cur.days += Number(e.days);
      cur.amount += Number(e.amount);
      encByEmployee.set(e.employeeId, cur);
    }

    return rows.map((r): LeavePayrollAdjustment => {
      const days = Number(r.totalDays);
      const isPaid = r.leaveType.isPaid;
      const enc = encByEmployee.get(r.employeeId);
      return {
        employeeId: r.employeeId,
        employeeCode: r.employee.employeeCode,
        leaveTypeCode: r.leaveType.code,
        isPaid,
        totalDays: days,
        lwpDays: isPaid ? 0 : days,
        paidLeaveDays: isPaid ? days : 0,
        startDate: r.startDate.toISOString().slice(0, 10),
        endDate: r.endDate.toISOString().slice(0, 10),
        encashmentDays: enc?.days ?? 0,
        encashmentAmount: enc?.amount ?? 0,
      };
    });
  }

  async prepareEncashment(employeeId: string, leaveTypeId: string, year: number, days: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    return prisma.leaveEncashment.create({
      data: {
        companyId,
        employeeId,
        leaveTypeId,
        year,
        days,
        amount: 0,
        status: "draft",
        createdBy: actorUserId,
        remarks: "Prepared for payroll integration — amount to be calculated by payroll module",
      },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLeavePayrollIntegrationService(companyId: string) {
  return new LeavePayrollIntegrationService(companyId);
}
