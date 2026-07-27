import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createEarningsAuditService } from "@/modules/earnings/application/earnings-audit.service";
import { createOvertimeCalculationService } from "@/modules/earnings/application/overtime-calculation.service";
import type { overtimeRecordSchema } from "@/modules/earnings/validation/schemas";
import type { z } from "zod";

type OvertimeRecordInput = z.infer<typeof overtimeRecordSchema>;

export class OvertimeService extends BaseRepository {
  async listRecords(status?: string) {
    return prisma.overtimeRecord.findMany({
      where: { companyId: this.requireCompanyId(), deletedAt: null, ...(status ? { status: status as never } : {}) },
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async createRecord(input: OvertimeRecordInput, userId?: string) {
    const companyId = this.requireCompanyId();
    const calc = await createOvertimeCalculationService(companyId).calculate({
      employeeId: input.employeeId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      basic: 0,
      workingDays: 22,
      overtimeHours: input.otHours ?? 0,
      holidayOtHours: input.holidayOtHours,
      nightOtHours: input.nightOtHours,
    });
    const record = await prisma.overtimeRecord.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        overtimeRuleId: calc.ruleId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        otHours: calc.otHours,
        holidayOtHours: calc.holidayOtHours,
        nightOtHours: calc.nightOtHours,
        hourlyRate: calc.hourlyRate,
        multiplier: calc.multiplier,
        amount: calc.amount,
        status: "submitted",
        createdBy: userId,
      },
    });
    await createEarningsAuditService(companyId).log("OvertimeRecord", record.id, "created", userId);
    return record;
  }

  async approve(recordId: string, approverUserId: string, level = "manager") {
    const companyId = this.requireCompanyId();
    const record = await prisma.overtimeRecord.update({
      where: { id: recordId, companyId },
      data: { status: "approved", updatedBy: approverUserId },
    });
    await prisma.overtimeApproval.create({
      data: { companyId, overtimeRecordId: recordId, approvalLevel: level, status: "approved", approverUserId, approvedAt: new Date() },
    });
    await createEarningsAuditService(companyId).log("OvertimeRecord", recordId, "approved", approverUserId, { level });
    return record;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createOvertimeService(companyId: string) {
  return new OvertimeService(companyId);
}
