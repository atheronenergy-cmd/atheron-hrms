import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { recordPayrollAudit } from "@/modules/payroll/application/payroll-audit.service";
import { createPayrollCalculationService } from "@/modules/payroll/application/payroll-calculation.service";
import { createPayrollGenerationService } from "@/modules/payroll/application/payroll-generation.service";
import { createPayrollPreviewService } from "@/modules/payroll/application/payroll-generation.service";
import { payrollValidationService } from "@/modules/payroll/application/payroll-validation.service";
import type { PayrollDashboardStats } from "@/modules/payroll/domain/types";
import type { PayrollGenerateInput, PayrollPeriodInput, PayrollQueryInput } from "@/modules/payroll/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export class PayrollPeriodService extends BaseRepository {
  async list(query: PayrollQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.PayrollPeriodWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.payrollPeriod.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startDate: "desc" },
      }),
      prisma.payrollPeriod.count({ where }),
    ]);

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async create(input: PayrollPeriodInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    return prisma.payrollPeriod.create({
      data: {
        companyId,
        name: input.name,
        periodType: input.periodType,
        payrollYear: input.payrollYear,
        payrollMonth: input.payrollMonth,
        startDate: dateOnly(input.startDate),
        endDate: dateOnly(input.endDate),
        payDate: input.payDate ? dateOnly(input.payDate) : null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  async get(id: string) {
    const row = await prisma.payrollPeriod.findFirst({ where: { id, companyId: this.requireCompanyId(), deletedAt: null } });
    if (!row) throw new NotFoundError("Payroll period", id);
    return row;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export class PayrollService extends BaseRepository {
  async list(query: PayrollQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.PayrollWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.payrollPeriodId ? { payrollPeriodId: query.payrollPeriodId } : {}),
      ...(query.search ? { payrollNumber: { contains: query.search, mode: "insensitive" } } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.payroll.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [query.sortBy ?? "createdAt"]: query.sortOrder ?? "desc" },
        include: { payrollPeriod: { select: { name: true, startDate: true, endDate: true } } },
      }),
      prisma.payroll.count({ where }),
    ]);

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async get(id: string) {
    const payroll = await prisma.payroll.findFirst({
      where: { id, companyId: this.requireCompanyId(), deletedAt: null },
      include: {
        payrollPeriod: true,
        payrollCalculations: {
          where: { deletedAt: null },
          include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } }, componentValues: true },
        },
        calculationLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!payroll) throw new NotFoundError("Payroll", id);
    return payroll;
  }

  async getDashboardStats(): Promise<PayrollDashboardStats> {
    const companyId = this.requireCompanyId();
    const [pendingCount, approvedCount, aggregates, errorAgg] = await Promise.all([
      prisma.payroll.count({ where: { companyId, deletedAt: null, status: { in: ["draft", "calculated", "pending_approval"] } } }),
      prisma.payroll.count({ where: { companyId, deletedAt: null, status: "approved" } }),
      prisma.payroll.aggregate({
        where: { companyId, deletedAt: null, status: { notIn: ["cancelled"] } },
        _sum: { totalGross: true, totalNet: true, employeeCount: true },
      }),
      prisma.payroll.aggregate({ where: { companyId, deletedAt: null }, _sum: { errorCount: true } }),
    ]);

    return {
      pendingCount,
      approvedCount,
      employeesProcessed: aggregates._sum.employeeCount ?? 0,
      totalGross: Number(aggregates._sum.totalGross ?? 0),
      totalNet: Number(aggregates._sum.totalNet ?? 0),
      pendingErrors: errorAgg._sum.errorCount ?? 0,
    };
  }

  async generate(input: PayrollGenerateInput, actorUserId: string) {
    return createPayrollGenerationService(this.requireCompanyId()).generate(input, actorUserId);
  }

  async preview(input: PayrollGenerateInput) {
    return createPayrollPreviewService(this.requireCompanyId()).preview(input);
  }

  async calculate(payrollId: string, version: number, actorUserId: string) {
    return createPayrollGenerationService(this.requireCompanyId()).recalculate(payrollId, version, actorUserId);
  }

  async approve(payrollId: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await payrollValidationService.validateEditable(payrollId, companyId, version);
    const payroll = await prisma.payroll.update({
      where: { id: payrollId, version },
      data: {
        status: "approved",
        approvedBy: actorUserId,
        approvedAt: new Date(),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
    await recordPayrollAudit("payroll_approved", { companyId, payrollId, actorUserId });
    return payroll;
  }

  async lock(payrollId: string, version: number, actorUserId: string, lock = true) {
    const companyId = this.requireCompanyId();
    if (lock) {
      await payrollValidationService.validateEditable(payrollId, companyId, version);
    } else {
      const payroll = await prisma.payroll.findFirst({ where: { id: payrollId, companyId } });
      if (!payroll || payroll.status !== "locked") throw new BusinessRuleError("Payroll is not locked");
    }

    const payroll = await prisma.payroll.update({
      where: { id: payrollId, version },
      data: lock
        ? { status: "locked", lockedBy: actorUserId, lockedAt: new Date(), updatedBy: actorUserId, version: { increment: 1 } }
        : { status: "approved", lockedBy: null, lockedAt: null, updatedBy: actorUserId, version: { increment: 1 } },
    });

    await recordPayrollAudit(lock ? "payroll_locked" : "payroll_unlocked", { companyId, payrollId, actorUserId });
    return payroll;
  }

  async softDelete(payrollId: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await payrollValidationService.validateEditable(payrollId, companyId, version);
    const payroll = await prisma.payroll.update({
      where: { id: payrollId, version },
      data: { status: "cancelled", deletedAt: new Date(), deletedBy: actorUserId, updatedBy: actorUserId, version: { increment: 1 } },
    });
    await recordPayrollAudit("payroll_deleted", { companyId, payrollId, actorUserId });
    return payroll;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollPeriodService(companyId: string) {
  return new PayrollPeriodService(companyId);
}

export function createPayrollService(companyId: string) {
  return new PayrollService(companyId);
}

export function getPayrollServices(companyId: string) {
  return {
    payroll: createPayrollService(companyId),
    period: createPayrollPeriodService(companyId),
    calculation: createPayrollCalculationService(companyId),
    generation: createPayrollGenerationService(companyId),
    preview: createPayrollPreviewService(companyId),
  };
}
