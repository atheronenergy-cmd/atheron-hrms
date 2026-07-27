import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { LeaveBalanceItem } from "@/modules/leave/domain/types";
import type { LeaveBalanceAdjustInput } from "@/modules/leave/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class LeaveBalanceService extends BaseRepository {
  async getEmployeeBalances(employeeId: string, year?: number): Promise<LeaveBalanceItem[]> {
    const companyId = this.requireCompanyId();
    const y = year ?? new Date().getFullYear();
    const rows = await prisma.leaveBalance.findMany({
      where: { companyId, employeeId, year: y },
      include: { leaveType: { select: { code: true, name: true } } },
      orderBy: { leaveType: { code: "asc" } },
    });
    return rows.map((r) => this.toItem(r));
  }

  async ensureBalance(employeeId: string, leaveTypeId: string, year: number, opening = 0, credited = 0) {
    const companyId = this.requireCompanyId();
    const leaveType = await prisma.leaveType.findFirst({ where: { id: leaveTypeId, companyId } });
    if (!leaveType) throw new NotFoundError("Leave type", leaveTypeId);

    const allocated = Number(opening) + Number(credited);
    return prisma.leaveBalance.upsert({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
      create: {
        companyId,
        employeeId,
        leaveTypeId,
        year,
        openingBalance: opening,
        credited,
        allocated,
        closingBalance: allocated,
      },
      update: {},
    });
  }

  async reservePending(employeeId: string, leaveTypeId: string, year: number, days: number) {
    const balance = await this.ensureBalance(employeeId, leaveTypeId, year);
    return prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        pending: { increment: days },
        closingBalance: { decrement: days },
        version: { increment: 1 },
      },
    });
  }

  async releasePending(employeeId: string, leaveTypeId: string, year: number, days: number, toUsed = false) {
    const balance = await prisma.leaveBalance.findFirst({
      where: { employeeId, leaveTypeId, year, companyId: this.requireCompanyId() },
    });
    if (!balance) return null;
    return prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        pending: { decrement: days },
        ...(toUsed ? { used: { increment: days } } : { rejected: { increment: days }, closingBalance: { increment: days } }),
        version: { increment: 1 },
      },
    });
  }

  async adjust(input: LeaveBalanceAdjustInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const balance = await this.ensureBalance(
      input.employeeId,
      input.leaveTypeId,
      input.year,
      input.openingBalance ?? 0,
      input.credited ?? 0,
    );
    const credited = input.credited ?? Number(balance.credited);
    const opening = input.openingBalance ?? Number(balance.openingBalance);
    const allocated = opening + credited;
    const closing = allocated - Number(balance.used) - Number(balance.pending) - Number(balance.expired);

    return prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        openingBalance: opening,
        credited,
        allocated,
        closingBalance: closing,
        version: { increment: 1 },
      },
    });
  }

  private toItem(
    r: Prisma.LeaveBalanceGetPayload<{ include: { leaveType: { select: { code: true; name: true } } } }>,
  ): LeaveBalanceItem {
    return {
      leaveTypeId: r.leaveTypeId,
      leaveTypeCode: r.leaveType.code,
      leaveTypeName: r.leaveType.name,
      year: r.year,
      openingBalance: Number(r.openingBalance),
      credited: Number(r.credited),
      used: Number(r.used),
      pending: Number(r.pending),
      rejected: Number(r.rejected),
      expired: Number(r.expired),
      carriedForward: Number(r.carriedForward),
      closingBalance: Number(r.closingBalance),
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLeaveBalanceService(companyId: string) {
  return new LeaveBalanceService(companyId);
}
