import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createPayrollGovernanceAuditService } from "@/modules/payroll-governance/application/payroll-governance-audit.service";
import type { financialYearActionSchema, financialYearSchema } from "@/modules/payroll-governance/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class FinancialYearService extends BaseRepository {
  private audit = createPayrollGovernanceAuditService(this.companyId ?? "");

  async list() {
    return prisma.payrollYear.findMany({
      where: { companyId: this.requireCompanyId() },
      orderBy: { startDate: "desc" },
    });
  }

  async create(input: z.infer<typeof financialYearSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    if (input.endDate <= input.startDate) throw new BusinessRuleError("End date must be after start date");

    const year = await prisma.payrollYear.create({
      data: {
        companyId,
        code: input.code,
        label: input.label,
        startDate: input.startDate,
        endDate: input.endDate,
        financialYearId: input.financialYearId ?? null,
        carryForwardConfig: (input.carryForwardConfig ?? {}) as object,
        status: "open",
        createdBy: actorUserId,
      },
    });

    await this.audit.record({ entityType: "payroll_year", entityId: year.id, action: "year_opened", actorUserId });
    return year;
  }

  async processAction(input: z.infer<typeof financialYearActionSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const year = await prisma.payrollYear.findFirst({ where: { id: input.payrollYearId, companyId } });
    if (!year) throw new NotFoundError("Payroll year", input.payrollYearId);

    const now = new Date();
    const data: Record<string, unknown> = { metadata: { ...(year.metadata as object), lastAction: input.action, remarks: input.remarks ?? null } };

    switch (input.action) {
      case "open":
        data.status = "open";
        break;
      case "close":
        if (year.status !== "open") throw new BusinessRuleError("Only open years can be closed");
        data.status = "closed";
        data.closedAt = now;
        data.closedBy = actorUserId;
        break;
      case "lock":
        if (!["closed", "open"].includes(year.status)) throw new BusinessRuleError("Year must be open or closed to lock");
        data.status = "locked";
        data.lockedAt = now;
        data.lockedBy = actorUserId;
        break;
      case "archive":
        data.status = "archived";
        data.archivedAt = now;
        data.archivedBy = actorUserId;
        break;
    }

    const updated = await prisma.payrollYear.update({ where: { id: year.id }, data: data as never });

    if (input.action === "close") {
      await this.prepareYearEnd(year.id, actorUserId);
    }

    await this.audit.record({
      entityType: "payroll_year",
      entityId: year.id,
      action: `year_${input.action}`,
      actorUserId,
    });
    return updated;
  }

  async prepareYearEnd(payrollYearId: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const year = await prisma.payrollYear.findFirst({ where: { id: payrollYearId, companyId } });
    if (!year) throw new NotFoundError("Payroll year", payrollYearId);

    const payrolls = await prisma.payroll.findMany({
      where: {
        companyId,
        deletedAt: null,
        payrollPeriod: { startDate: { gte: year.startDate }, endDate: { lte: year.endDate } },
      },
      select: { id: true, totalNet: true, status: true },
    });

    const openingBalances = {
      totalNetPaid: payrolls.filter((p) => ["locked", "paid"].includes(p.status)).reduce((s, p) => s + Number(p.totalNet), 0),
      payrollCount: payrolls.length,
    };

    return prisma.payrollYear.update({
      where: { id: payrollYearId },
      data: {
        openingBalances: openingBalances as object,
        carryForwardConfig: {
          leaveCarryForward: true,
          salaryRevisionBaseline: true,
          statutoryResetPrep: true,
          payrollArchive: true,
        } as object,
        metadata: { yearEndPreparedAt: new Date().toISOString(), preparedBy: actorUserId } as object,
      },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createFinancialYearService(companyId: string) {
  return new FinancialYearService(companyId);
}
