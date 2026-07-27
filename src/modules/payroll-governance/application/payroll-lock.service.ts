import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createPayrollGovernanceAuditService } from "@/modules/payroll-governance/application/payroll-governance-audit.service";
import { createPayrollSnapshotService } from "@/modules/payroll-governance/application/payroll-snapshot.service";
import type { payrollLockSchema, payrollReopenSchema, payrollUnlockSchema } from "@/modules/payroll-governance/validation/schemas";
import { payrollValidationService } from "@/modules/payroll/application/payroll-validation.service";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class PayrollLockService extends BaseRepository {
  private audit = createPayrollGovernanceAuditService(this.companyId ?? "");

  async listActive() {
    return prisma.payrollLock.findMany({
      where: { companyId: this.requireCompanyId(), isActive: true },
      include: { payroll: { select: { payrollNumber: true, status: true, totalNet: true } } },
      orderBy: { lockedAt: "desc" },
    });
  }

  async lock(input: z.infer<typeof payrollLockSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    await payrollValidationService.validateEditable(input.payrollId, companyId, input.version);

    const payroll = await prisma.payroll.findFirst({ where: { id: input.payrollId, companyId } });
    if (!payroll || payroll.status !== "approved") {
      throw new BusinessRuleError("Only approved payrolls can be locked");
    }

    await createPayrollSnapshotService(companyId).create({ payrollId: input.payrollId, snapshotType: "full" }, actorUserId);

    const [lock, updated] = await prisma.$transaction([
      prisma.payrollLock.create({
        data: {
          companyId,
          payrollId: input.payrollId,
          lockType: input.lockType,
          lockedBy: actorUserId,
          metadata: { reason: input.reason ?? null },
        },
      }),
      prisma.payroll.update({
        where: { id: input.payrollId, version: input.version },
        data: { status: "locked", lockedBy: actorUserId, lockedAt: new Date(), updatedBy: actorUserId, version: { increment: 1 } },
      }),
    ]);

    await this.audit.record({ entityType: "payroll_lock", entityId: lock.id, action: "payroll_locked", actorUserId, metadata: { payrollId: input.payrollId } });
    return { lock, payroll: updated };
  }

  async unlock(input: z.infer<typeof payrollUnlockSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const payroll = await prisma.payroll.findFirst({ where: { id: input.payrollId, companyId, deletedAt: null } });
    if (!payroll) throw new NotFoundError("Payroll", input.payrollId);
    if (payroll.status !== "locked") throw new BusinessRuleError("Payroll is not locked");
    if (payroll.version !== input.version) throw new BusinessRuleError("Payroll version mismatch");

    const activeLock = await prisma.payrollLock.findFirst({
      where: { payrollId: input.payrollId, companyId, isActive: true },
    });
    if (!activeLock) throw new NotFoundError("Active payroll lock", input.payrollId);

    const [updatedLock, updatedPayroll, reopenLog] = await prisma.$transaction([
      prisma.payrollLock.update({
        where: { id: activeLock.id },
        data: {
          isActive: false,
          unlockedBy: actorUserId,
          unlockedAt: new Date(),
          unlockReason: input.reason,
          unlockApprovedBy: input.approvedByUserId ?? actorUserId,
        },
      }),
      prisma.payroll.update({
        where: { id: input.payrollId },
        data: { status: "approved", lockedBy: null, lockedAt: null, updatedBy: actorUserId, version: { increment: 1 } },
      }),
      prisma.payrollReopenLog.create({
        data: {
          companyId,
          payrollId: input.payrollId,
          action: "unlock",
          reason: input.reason,
          approvedBy: input.approvedByUserId ?? actorUserId,
          actorUserId,
          previousStatus: "locked",
          newStatus: "approved",
        },
      }),
    ]);

    await this.audit.record({
      entityType: "payroll_lock",
      entityId: activeLock.id,
      action: "payroll_unlocked",
      actorUserId,
      metadata: { payrollId: input.payrollId, reason: input.reason },
    });
    return { lock: updatedLock, payroll: updatedPayroll, reopenLog };
  }

  async reopen(input: z.infer<typeof payrollReopenSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const payroll = await prisma.payroll.findFirst({ where: { id: input.payrollId, companyId, deletedAt: null } });
    if (!payroll) throw new NotFoundError("Payroll", input.payrollId);

    const previousStatus = payroll.status;
    let newStatus = previousStatus;

    if (input.action === "unlock" && previousStatus === "locked") {
      return this.unlock({ payrollId: input.payrollId, version: input.version, reason: input.reason }, actorUserId);
    }
    if (input.action === "modify" && ["locked", "approved"].includes(previousStatus)) {
      newStatus = "calculated";
    }
    if (input.action === "recalculate") {
      newStatus = "calculated";
    }
    if (input.action === "relock" && previousStatus === "approved") {
      return this.lock({ payrollId: input.payrollId, version: input.version, lockType: "full" }, actorUserId);
    }

    const updated = await prisma.payroll.update({
      where: { id: input.payrollId, version: input.version },
      data: { status: newStatus as never, updatedBy: actorUserId, version: { increment: 1 } },
    });

    const reopenLog = await prisma.payrollReopenLog.create({
      data: {
        companyId,
        payrollId: input.payrollId,
        action: input.action,
        reason: input.reason,
        actorUserId,
        previousStatus,
        newStatus,
      },
    });

    await this.audit.record({ entityType: "payroll_reopen", entityId: reopenLog.id, action: `payroll_reopen_${input.action}`, actorUserId });
    return { payroll: updated, reopenLog };
  }

  async getReopenHistory(payrollId?: string) {
    return prisma.payrollReopenLog.findMany({
      where: { companyId: this.requireCompanyId(), ...(payrollId ? { payrollId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollLockService(companyId: string) {
  return new PayrollLockService(companyId);
}
