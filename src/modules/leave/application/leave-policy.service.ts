import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { recordLeaveAudit } from "@/modules/leave/application/leave-audit.service";
import type { LeavePolicyInput, LeaveTypeInput } from "@/modules/leave/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class LeavePolicyService extends BaseRepository {
  async listPolicies() {
    return prisma.leavePolicy.findMany({
      where: { companyId: this.requireCompanyId(), status: "active" },
      include: { leaveType: { select: { code: true, name: true } } },
      orderBy: { name: "asc" },
    });
  }

  async listLeaveTypes() {
    return prisma.leaveType.findMany({
      where: { companyId: this.requireCompanyId(), deletedAt: null },
      orderBy: { code: "asc" },
    });
  }

  async createLeaveType(input: LeaveTypeInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    return prisma.leaveType.create({
      data: {
        companyId,
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description,
        isPaid: input.isPaid,
        isCarryForward: input.isCarryForward,
        maxCarryForwardDays: input.maxCarryForwardDays,
        maxPerMonth: input.maxPerMonth,
        maxPerYear: input.maxPerYear,
        minDaysPerRequest: input.minDaysPerRequest,
        maxDaysPerRequest: input.maxDaysPerRequest,
        halfDayAllowed: input.halfDayAllowed,
        hourlyLeaveAllowed: input.hourlyLeaveAllowed,
        requiresAttachment: input.requiresAttachment,
        medicalCertificateRequired: input.medicalCertificateRequired,
        managerApprovalRequired: input.managerApprovalRequired,
        hrApprovalRequired: input.hrApprovalRequired,
        genderRestriction: input.genderRestriction,
        probationRestricted: input.probationRestricted,
        noticePeriodRestricted: input.noticePeriodRestricted,
        accrualType: input.accrualType,
        accrualRate: input.accrualRate,
        minDaysNotice: input.minDaysNotice,
        maxConsecutiveDays: input.maxConsecutiveDays,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  async upsertPolicy(input: LeavePolicyInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const row = await prisma.leavePolicy.create({
      data: {
        companyId,
        leaveTypeId: input.leaveTypeId ?? null,
        name: input.name,
        accrualPeriod: input.accrualPeriod,
        creditAmount: input.creditAmount,
        allowCarryForward: input.allowCarryForward,
        maxCarryForwardDays: input.maxCarryForwardDays,
        expiryMonths: input.expiryMonths,
        allowNegativeBalance: input.allowNegativeBalance,
        sandwichHolidayRule: input.sandwichHolidayRule,
        excludeWeeklyOff: input.excludeWeeklyOff,
        isDefault: input.isDefault,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
    await recordLeaveAudit("leave_policy_changed", { companyId, actorUserId, entityId: row.id, metadata: { name: input.name } });
    return row;
  }

  async seedDefaultLeaveTypes(actorUserId: string) {
    const companyId = this.requireCompanyId();
    const { DEFAULT_LEAVE_TYPES } = await import("@/modules/leave/domain/types");
    const created = [];
    for (const t of DEFAULT_LEAVE_TYPES) {
      const existing = await prisma.leaveType.findFirst({ where: { companyId, code: t.code } });
      if (existing) continue;
      created.push(
        await prisma.leaveType.create({
          data: {
            companyId,
            name: t.name,
            code: t.code,
            isPaid: t.isPaid ?? true,
            isCarryForward: "isCarryForward" in t ? Boolean(t.isCarryForward) : false,
            accrualRate: "accrualRate" in t ? Number(t.accrualRate) : 0,
            genderRestriction: "genderRestriction" in t ? (t.genderRestriction as never) : undefined,
            maxDaysPerRequest: "maxDaysPerRequest" in t ? Number(t.maxDaysPerRequest) : undefined,
            halfDayAllowed: "halfDayAllowed" in t ? Boolean(t.halfDayAllowed) : true,
            requiresAttachment: "requiresAttachment" in t ? Boolean(t.requiresAttachment) : false,
            createdBy: actorUserId,
            updatedBy: actorUserId,
          },
        }),
      );
    }
    return created;
  }

  async getPolicy(id: string) {
    const row = await prisma.leavePolicy.findFirst({
      where: { id, companyId: this.requireCompanyId() },
      include: { leaveType: true },
    });
    if (!row) throw new NotFoundError("Leave policy", id);
    return row;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLeavePolicyService(companyId: string) {
  return new LeavePolicyService(companyId);
}
