import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { computeContentHash, createPayrollGovernanceAuditService } from "@/modules/payroll-governance/application/payroll-governance-audit.service";
import type { PayrollSnapshotPayload } from "@/modules/payroll-governance/domain/types";
import type { snapshotSchema } from "@/modules/payroll-governance/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class PayrollSnapshotService extends BaseRepository {
  private audit = createPayrollGovernanceAuditService(this.companyId ?? "");

  async list(payrollId: string) {
    return prisma.payrollSnapshot.findMany({
      where: { companyId: this.requireCompanyId(), payrollId },
      orderBy: { versionNumber: "desc" },
    });
  }

  async buildPayload(payrollId: string): Promise<PayrollSnapshotPayload> {
    const companyId = this.requireCompanyId();
    const payroll = await prisma.payroll.findFirst({
      where: { id: payrollId, companyId, deletedAt: null },
      include: {
        payrollPeriod: true,
        payrollCalculations: {
          where: { deletedAt: null },
          include: {
            employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, employmentStatus: true } },
            componentValues: true,
            employerContribution: true,
          },
        },
      },
    });
    if (!payroll) throw new NotFoundError("Payroll", payrollId);

    const employeeIds = payroll.payrollCalculations.map((c) => c.employeeId);
    const period = payroll.payrollPeriod;

    const [attendanceCount, leaveCount] = period
      ? await Promise.all([
          prisma.attendance.count({
            where: {
              companyId,
              employeeId: { in: employeeIds },
              attendanceDate: { gte: period.startDate, lte: period.endDate },
            },
          }),
          prisma.leave.count({
            where: {
              companyId,
              employeeId: { in: employeeIds },
              startDate: { lte: period.endDate },
              endDate: { gte: period.startDate },
            },
          }),
        ])
      : [0, 0];

    return {
      payroll: {
        id: payroll.id,
        payrollNumber: payroll.payrollNumber,
        status: payroll.status,
        totalGross: Number(payroll.totalGross),
        totalNet: Number(payroll.totalNet),
        employeeCount: payroll.employeeCount,
        calculationVersion: payroll.calculationVersion,
      },
      employees: payroll.payrollCalculations.map((c) => ({
        employeeId: c.employeeId,
        employeeCode: c.employee.employeeCode,
        name: `${c.employee.firstName} ${c.employee.lastName}`,
        status: c.employee.employmentStatus,
        gross: Number(c.grossSalary),
        net: Number(c.netSalary),
      })),
      attendance: { recordCount: attendanceCount, periodStart: period?.startDate, periodEnd: period?.endDate },
      leave: { recordCount: leaveCount },
      salaryStructure: { calculationVersion: payroll.calculationVersion },
      components: payroll.payrollCalculations.flatMap((c) =>
        c.componentValues.map((v) => ({
          employeeId: c.employeeId,
          code: v.componentCode,
          type: v.componentType,
          amount: Number(v.amount),
        })),
      ),
      statutory: payroll.payrollCalculations.reduce(
        (acc, c) => {
          const ec = c.employerContribution;
          if (ec) {
            acc.pf = (acc.pf ?? 0) + Number(ec.pfEmployer);
            acc.esi = (acc.esi ?? 0) + Number(ec.esiEmployer);
          }
          return acc;
        },
        {} as Record<string, number>,
      ),
      totals: {
        gross: Number(payroll.totalGross),
        net: Number(payroll.totalNet),
        deductions: Number(payroll.totalDeductions),
      },
      version: payroll.version,
      timestamp: new Date().toISOString(),
    };
  }

  async create(input: z.infer<typeof snapshotSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const payload = await this.buildPayload(input.payrollId);
    const contentHash = computeContentHash(payload);
    const last = await prisma.payrollSnapshot.findFirst({
      where: { payrollId: input.payrollId },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;

    const snapshot = await prisma.payrollSnapshot.create({
      data: {
        companyId,
        payrollId: input.payrollId,
        snapshotType: input.snapshotType,
        versionNumber,
        contentHash,
        payload: payload as object,
        employeeCount: payload.employees.length,
        totalGross: payload.totals.gross,
        totalNet: payload.totals.net,
        createdBy: actorUserId,
      },
    });

    await this.audit.record({ entityType: "payroll_snapshot", entityId: snapshot.id, action: "snapshot_created", actorUserId, metadata: { payrollId: input.payrollId, hash: contentHash } });
    return snapshot;
  }

  async validate(snapshotId: string) {
    const snapshot = await prisma.payrollSnapshot.findFirst({
      where: { id: snapshotId, companyId: this.requireCompanyId() },
    });
    if (!snapshot) throw new NotFoundError("Payroll snapshot", snapshotId);
    const computed = computeContentHash(snapshot.payload);
    return { valid: computed === snapshot.contentHash, storedHash: snapshot.contentHash, computedHash: computed };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollSnapshotService(companyId: string) {
  return new PayrollSnapshotService(companyId);
}
