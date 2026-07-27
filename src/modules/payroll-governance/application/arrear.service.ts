import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createPayrollGovernanceAuditService } from "@/modules/payroll-governance/application/payroll-governance-audit.service";
import type { arrearSchema } from "@/modules/payroll-governance/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class ArrearService extends BaseRepository {
  private audit = createPayrollGovernanceAuditService(this.companyId ?? "");

  async list(status?: string) {
    return prisma.payrollArrear.findMany({
      where: {
        companyId: this.requireCompanyId(),
        ...(status ? { status: status as never } : {}),
      },
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(input: z.infer<typeof arrearSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, companyId, deletedAt: null } });
    if (!employee) throw new NotFoundError("Employee", input.employeeId);

    const arrear = await prisma.payrollArrear.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        retroPayrollId: input.retroPayrollId ?? null,
        targetPayrollId: input.targetPayrollId ?? null,
        arrearType: input.arrearType,
        amount: input.amount,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        mergeIntoPayroll: input.mergeIntoPayroll,
        remarks: input.remarks ?? null,
        createdBy: actorUserId,
      },
    });

    await this.audit.record({ entityType: "payroll_arrear", entityId: arrear.id, action: "arrear_created", actorUserId, metadata: { amount: input.amount } });
    return arrear;
  }

  async createFromRetro(retroPayrollId: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const retro = await prisma.retroPayroll.findFirst({ where: { id: retroPayrollId, companyId } });
    if (!retro) throw new NotFoundError("Retro payroll", retroPayrollId);

    return this.create(
      {
        employeeId: retro.employeeId,
        retroPayrollId: retro.id,
        targetPayrollId: retro.payrollId ?? undefined,
        arrearType: "salary",
        amount: Number(retro.adjustmentAmount),
        periodStart: retro.originalPeriodStart,
        periodEnd: retro.originalPeriodEnd,
        mergeIntoPayroll: true,
        remarks: retro.reason ?? undefined,
      },
      actorUserId,
    );
  }

  async mergeToPayroll(arrearId: string, targetPayrollId: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const arrear = await prisma.payrollArrear.update({
      where: { id: arrearId },
      data: {
        targetPayrollId,
        status: "merged",
        mergedAt: new Date(),
      },
    });
    await this.audit.record({ entityType: "payroll_arrear", entityId: arrearId, action: "arrear_merged", actorUserId, metadata: { targetPayrollId } });
    return arrear;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createArrearService(companyId: string) {
  return new ArrearService(companyId);
}
