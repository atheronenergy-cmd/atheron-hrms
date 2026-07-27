import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { computeContentHash, createPayrollGovernanceAuditService } from "@/modules/payroll-governance/application/payroll-governance-audit.service";
import { createPayrollSnapshotService } from "@/modules/payroll-governance/application/payroll-snapshot.service";
import type { rollbackSchema } from "@/modules/payroll-governance/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class PayrollVersionService extends BaseRepository {
  private audit = createPayrollGovernanceAuditService(this.companyId ?? "");

  async list(payrollId: string) {
    return prisma.payrollVersion.findMany({
      where: { companyId: this.requireCompanyId(), payrollId },
      orderBy: { versionNumber: "desc" },
    });
  }

  async createVersion(payrollId: string, changeReason: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const snapshotSvc = createPayrollSnapshotService(companyId);
    const payload = await snapshotSvc.buildPayload(payrollId);
    const contentHash = computeContentHash(payload);

    const last = await prisma.payrollVersion.findFirst({
      where: { payrollId, companyId },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;

    const differenceLog = last
      ? [
          {
            fromVersion: last.versionNumber,
            toVersion: versionNumber,
            grossDelta: payload.totals.gross - Number((last.snapshot as { totals?: { gross?: number } })?.totals?.gross ?? 0),
            netDelta: payload.totals.net - Number((last.snapshot as { totals?: { net?: number } })?.totals?.net ?? 0),
            reason: changeReason,
            at: new Date().toISOString(),
          },
        ]
      : [{ toVersion: versionNumber, reason: changeReason, at: new Date().toISOString() }];

    const version = await prisma.payrollVersion.create({
      data: {
        companyId,
        payrollId,
        versionNumber,
        previousVersionId: last?.id ?? null,
        snapshot: payload as object,
        differenceLog: differenceLog as object,
        contentHash,
        changeReason,
        createdBy: actorUserId,
      },
    });

    await this.audit.record({ entityType: "payroll_version", entityId: version.id, action: "version_created", actorUserId, metadata: { payrollId, versionNumber } });
    return version;
  }

  async getDiff(payrollId: string, fromVersion: number, toVersion: number) {
    const versions = await prisma.payrollVersion.findMany({
      where: { payrollId, companyId: this.requireCompanyId(), versionNumber: { in: [fromVersion, toVersion] } },
    });
    if (versions.length < 2) throw new NotFoundError("Payroll versions", `${fromVersion}-${toVersion}`);
    const [from, to] = versions.sort((a, b) => a.versionNumber - b.versionNumber);
    return { from, to, differenceLog: to.differenceLog };
  }

  async rollback(input: z.infer<typeof rollbackSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const payroll = await prisma.payroll.findFirst({ where: { id: input.payrollId, companyId, deletedAt: null } });
    if (!payroll) throw new NotFoundError("Payroll", input.payrollId);
    if (payroll.status === "locked") throw new BusinessRuleError("Locked payroll cannot be rolled back without unlock");

    const target = await prisma.payrollVersion.findFirst({
      where: { payrollId: input.payrollId, companyId, versionNumber: input.versionNumber },
    });
    if (!target) throw new NotFoundError("Payroll version", String(input.versionNumber));

    const newVersion = await this.createVersion(input.payrollId, `Rollback to v${input.versionNumber}: ${input.reason}`, actorUserId);
    await this.audit.record({
      entityType: "payroll_version",
      entityId: newVersion.id,
      action: "rollback_protected",
      actorUserId,
      metadata: { targetVersion: input.versionNumber, reason: input.reason },
    });
    return { protected: true, newVersion, targetVersion: target };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollVersionService(companyId: string) {
  return new PayrollVersionService(companyId);
}
