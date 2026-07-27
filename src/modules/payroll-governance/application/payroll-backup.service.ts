import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { computeContentHash, createPayrollGovernanceAuditService } from "@/modules/payroll-governance/application/payroll-governance-audit.service";
import { createPayrollSnapshotService } from "@/modules/payroll-governance/application/payroll-snapshot.service";
import type { backupRestoreSchema, backupSchema } from "@/modules/payroll-governance/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class PayrollBackupService extends BaseRepository {
  private audit = createPayrollGovernanceAuditService(this.companyId ?? "");

  async list(payrollId?: string) {
    return prisma.payrollBackup.findMany({
      where: { companyId: this.requireCompanyId(), ...(payrollId ? { payrollId } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(input: z.infer<typeof backupSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const snapshotSvc = createPayrollSnapshotService(companyId);
    const payload = await snapshotSvc.buildPayload(input.payrollId);
    const contentHash = computeContentHash(payload);
    const count = await prisma.payrollBackup.count({ where: { companyId } });

    const backup = await prisma.payrollBackup.create({
      data: {
        companyId,
        payrollId: input.payrollId,
        backupNumber: `BK-${Date.now().toString().slice(-8)}-${String(count + 1).padStart(3, "0")}`,
        contentHash,
        payload: payload as object,
        status: "active",
        createdBy: actorUserId,
      },
    });

    await this.audit.record({ entityType: "payroll_backup", entityId: backup.id, action: "backup_created", actorUserId, metadata: { payrollId: input.payrollId, hash: contentHash } });
    return backup;
  }

  async restore(input: z.infer<typeof backupRestoreSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const backup = await prisma.payrollBackup.findFirst({
      where: { id: input.backupId, companyId, status: "active" },
    });
    if (!backup) throw new NotFoundError("Payroll backup", input.backupId);

    const computed = computeContentHash(backup.payload);
    if (computed !== backup.contentHash) {
      await prisma.payrollBackup.update({ where: { id: backup.id }, data: { status: "invalid" } });
      throw new BusinessRuleError("Backup checksum validation failed");
    }

    if (input.validateOnly) {
      return { valid: true, backup, message: "Checksum verified — restore not executed" };
    }

    const restored = await prisma.payrollBackup.update({
      where: { id: backup.id },
      data: { status: "restored", restoredAt: new Date(), restoredBy: actorUserId },
    });

    await this.audit.record({ entityType: "payroll_backup", entityId: backup.id, action: "backup_restored", actorUserId, metadata: { payrollId: backup.payrollId } });
    return { valid: true, backup: restored, payload: backup.payload };
  }

  async validate(backupId: string) {
    const backup = await prisma.payrollBackup.findFirst({ where: { id: backupId, companyId: this.requireCompanyId() } });
    if (!backup) throw new NotFoundError("Payroll backup", backupId);
    const computed = computeContentHash(backup.payload);
    return { valid: computed === backup.contentHash, storedHash: backup.contentHash, computedHash: computed };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollBackupService(companyId: string) {
  return new PayrollBackupService(companyId);
}
