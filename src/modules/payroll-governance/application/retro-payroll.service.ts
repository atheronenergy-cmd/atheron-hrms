import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createPayrollCalculationService } from "@/modules/payroll/application/payroll-calculation.service";
import { createPayrollGovernanceAuditService } from "@/modules/payroll-governance/application/payroll-governance-audit.service";
import { createArrearService } from "@/modules/payroll-governance/application/arrear.service";
import type { retroPayrollSchema } from "@/modules/payroll-governance/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class RetroPayrollService extends BaseRepository {
  private audit = createPayrollGovernanceAuditService(this.companyId ?? "");

  async list(status?: string) {
    return prisma.retroPayroll.findMany({
      where: {
        companyId: this.requireCompanyId(),
        ...(status ? { status: status as never } : {}),
      },
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(input: z.infer<typeof retroPayrollSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, companyId, deletedAt: null } });
    if (!employee) throw new NotFoundError("Employee", input.employeeId);

    const differenceAmount = input.revisedAmount - input.originalAmount;
    const adjustmentAmount = Math.max(differenceAmount, 0);
    const recoveryAmount = Math.max(-differenceAmount, 0);

    let calculationPayload: Record<string, unknown> = {};
    if (input.retroType !== "manual") {
      const calc = createPayrollCalculationService(companyId);
      const result = await calc.calculateEmployee({
        employeeId: input.employeeId,
        periodStart: input.originalPeriodStart,
        periodEnd: input.originalPeriodEnd,
      });
      calculationPayload = { preview: result, retroType: input.retroType };
    }

    const retro = await prisma.retroPayroll.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        payrollId: input.payrollId ?? null,
        retroType: input.retroType,
        status: "calculated",
        originalPeriodStart: input.originalPeriodStart,
        originalPeriodEnd: input.originalPeriodEnd,
        originalAmount: input.originalAmount,
        revisedAmount: input.revisedAmount,
        differenceAmount,
        adjustmentAmount,
        recoveryAmount,
        reason: input.reason ?? null,
        calculationPayload: calculationPayload as object,
        createdBy: actorUserId,
      },
    });

    if (differenceAmount > 0) {
      await createArrearService(companyId).createFromRetro(retro.id, actorUserId);
    }

    await this.audit.record({ entityType: "retro_payroll", entityId: retro.id, action: "retro_created", actorUserId, metadata: { differenceAmount } });
    return retro;
  }

  async approve(retroId: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const retro = await prisma.retroPayroll.update({
      where: { id: retroId },
      data: { status: "approved", approvedBy: actorUserId, approvedAt: new Date() },
    });
    await this.audit.record({ entityType: "retro_payroll", entityId: retroId, action: "retro_approved", actorUserId });
    return retro;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createRetroPayrollService(companyId: string) {
  return new RetroPayrollService(companyId);
}
