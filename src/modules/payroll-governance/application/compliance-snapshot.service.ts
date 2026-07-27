import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { computeContentHash, createPayrollGovernanceAuditService } from "@/modules/payroll-governance/application/payroll-governance-audit.service";
import type { ComplianceSnapshotData } from "@/modules/payroll-governance/domain/types";
import type { complianceSnapshotSchema } from "@/modules/payroll-governance/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class ComplianceSnapshotService extends BaseRepository {
  private audit = createPayrollGovernanceAuditService(this.companyId ?? "");

  async list(payrollId?: string) {
    return prisma.payrollComplianceSnapshot.findMany({
      where: { companyId: this.requireCompanyId(), ...(payrollId ? { payrollId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async capture(input: z.infer<typeof complianceSnapshotSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const payroll = await prisma.payroll.findFirst({
      where: { id: input.payrollId, companyId, deletedAt: null },
      include: {
        payrollCalculations: {
          where: { deletedAt: null },
          include: {
            componentValues: true,
            employerContribution: true,
            employee: { select: { employmentStatus: true, employeeCode: true } },
          },
        },
      },
    });
    if (!payroll) throw new NotFoundError("Payroll", input.payrollId);

    const data: ComplianceSnapshotData = {
      pfValues: {},
      esiValues: {},
      ptValues: {},
      tdsValues: {},
      salarySummary: { gross: Number(payroll.totalGross), net: Number(payroll.totalNet), deductions: Number(payroll.totalDeductions) },
      employeeStatus: {},
      rulesVersion: {},
      usedConfiguration: { calculationVersion: payroll.calculationVersion },
    };

    for (const calc of payroll.payrollCalculations) {
      data.employeeStatus[calc.employee.employeeCode] = calc.employee.employmentStatus;
      for (const cv of calc.componentValues) {
        const code = cv.componentCode.toUpperCase();
        const amt = Number(cv.amount);
        if (code.includes("PF")) data.pfValues[calc.employee.employeeCode] = (data.pfValues[calc.employee.employeeCode] ?? 0) + amt;
        if (code.includes("ESI")) data.esiValues[calc.employee.employeeCode] = (data.esiValues[calc.employee.employeeCode] ?? 0) + amt;
        if (code.includes("PT") || code.includes("PROF")) data.ptValues[calc.employee.employeeCode] = (data.ptValues[calc.employee.employeeCode] ?? 0) + amt;
        if (code.includes("TDS") || code.includes("TAX")) data.tdsValues[calc.employee.employeeCode] = (data.tdsValues[calc.employee.employeeCode] ?? 0) + amt;
      }
      for (const ec of calc.employerContribution ? [calc.employerContribution] : []) {
        data.pfValues[`employer_${calc.employee.employeeCode}`] = Number(ec.pfEmployer);
        data.esiValues[`employer_${calc.employee.employeeCode}`] = Number(ec.esiEmployer);
      }
    }

    const activeRules = await prisma.statutoryVersion.findMany({
      where: { companyId, status: "active" },
      include: { statutoryRule: { select: { ruleType: true } } },
    });
    for (const r of activeRules) data.rulesVersion[r.statutoryRule.ruleType] = `v${r.versionNumber}`;

    const contentHash = computeContentHash(data);
    const count = await prisma.payrollComplianceSnapshot.count({ where: { payrollId: input.payrollId } });

    const snapshot = await prisma.payrollComplianceSnapshot.create({
      data: {
        companyId,
        payrollId: input.payrollId,
        snapshotNumber: `CS-${String(count + 1).padStart(4, "0")}`,
        pfValues: data.pfValues as object,
        esiValues: data.esiValues as object,
        ptValues: data.ptValues as object,
        tdsValues: data.tdsValues as object,
        salarySummary: data.salarySummary as object,
        employeeStatus: data.employeeStatus as object,
        rulesVersion: data.rulesVersion as object,
        usedConfiguration: data.usedConfiguration as object,
        contentHash,
        createdBy: actorUserId,
      },
    });

    await this.audit.record({ entityType: "compliance_snapshot", entityId: snapshot.id, action: "compliance_snapshot_created", actorUserId, metadata: { payrollId: input.payrollId } });
    return snapshot;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createComplianceSnapshotService(companyId: string) {
  return new ComplianceSnapshotService(companyId);
}
