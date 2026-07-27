import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createLeaveBalanceService } from "@/modules/leave/application/leave-balance.service";
import { recordLeaveAudit } from "@/modules/leave/application/leave-audit.service";

export class LeaveAccrualService extends BaseRepository {
  async creditMonthly(employeeId: string, leaveTypeId: string, year: number, month: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const leaveType = await prisma.leaveType.findFirst({ where: { id: leaveTypeId, companyId } });
    if (!leaveType || Number(leaveType.accrualRate) <= 0) return null;

    const monthlyCredit = leaveType.accrualType === "monthly" ? Number(leaveType.accrualRate) : Number(leaveType.accrualRate) / 12;
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0));

    const existing = await prisma.leaveAccrual.findFirst({
      where: { employeeId, leaveTypeId, periodStart, periodEnd },
    });
    if (existing) return existing;

    const accrual = await prisma.leaveAccrual.create({
      data: {
        companyId,
        employeeId,
        leaveTypeId,
        periodType: "monthly",
        periodStart,
        periodEnd,
        creditedDays: monthlyCredit,
        createdBy: actorUserId,
      },
    });

    const balance = createLeaveBalanceService(companyId);
    const row = await balance.ensureBalance(employeeId, leaveTypeId, year);
    await prisma.leaveBalance.update({
      where: { id: row.id },
      data: {
        credited: { increment: monthlyCredit },
        allocated: { increment: monthlyCredit },
        closingBalance: { increment: monthlyCredit },
        version: { increment: 1 },
      },
    });

    await recordLeaveAudit("leave_balance_adjusted", {
      companyId,
      employeeId,
      actorUserId,
      entityId: accrual.id,
      metadata: { type: "monthly_credit", days: monthlyCredit, month, year },
    });

    return accrual;
  }

  async creditYearly(employeeId: string, leaveTypeId: string, year: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const leaveType = await prisma.leaveType.findFirst({ where: { id: leaveTypeId, companyId } });
    if (!leaveType) return null;

    const credit = leaveType.accrualType === "yearly" ? Number(leaveType.accrualRate) : Number(leaveType.accrualRate) * 12;
    if (credit <= 0) return null;

    const periodStart = new Date(Date.UTC(year, 0, 1));
    const periodEnd = new Date(Date.UTC(year, 11, 31));

    const accrual = await prisma.leaveAccrual.create({
      data: {
        companyId,
        employeeId,
        leaveTypeId,
        periodType: "yearly",
        periodStart,
        periodEnd,
        creditedDays: credit,
        createdBy: actorUserId,
      },
    });

    const balance = createLeaveBalanceService(companyId);
    const row = await balance.ensureBalance(employeeId, leaveTypeId, year, 0, credit);
    await prisma.leaveBalance.update({
      where: { id: row.id },
      data: {
        credited: credit,
        allocated: credit,
        closingBalance: credit,
        version: { increment: 1 },
      },
    });

    await recordLeaveAudit("leave_balance_adjusted", {
      companyId,
      employeeId,
      actorUserId,
      entityId: accrual.id,
      metadata: { type: "yearly_credit", days: credit, year },
    });

    return accrual;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLeaveAccrualService(companyId: string) {
  return new LeaveAccrualService(companyId);
}
