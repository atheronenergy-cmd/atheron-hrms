import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createPayrollReportingAuditService } from "@/modules/payroll-reporting/application/payroll-reporting-audit.service";
import type { ExecutiveDashboardData, PayrollAnalyticsMetrics } from "@/modules/payroll-reporting/domain/types";
import type { analyticsQuerySchema } from "@/modules/payroll-reporting/validation/schemas";
import type { z } from "zod";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export class PayrollAnalyticsService extends BaseRepository {
  async computeMetrics(params: { payrollId?: string; periodStart?: Date; periodEnd?: Date }): Promise<PayrollAnalyticsMetrics> {
    const companyId = this.requireCompanyId();
    const calculations = await prisma.payrollCalculation.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(params.payrollId ? { payrollId: params.payrollId } : {}),
        ...(params.periodStart && params.periodEnd ? { createdAt: { gte: params.periodStart, lte: params.periodEnd } } : {}),
      },
      include: {
        employee: { include: { department: { select: { name: true } } } },
        componentValues: true,
        employerContribution: true,
      },
      take: 2000,
    });

    const nets = calculations.map((c) => Number(c.netSalary));
    const totalPayroll = round2(nets.reduce((s, n) => s + n, 0));
    const departmentCost = calculations.reduce<Record<string, number>>((acc, c) => {
      const dept = c.employee.department.name;
      acc[dept] = round2((acc[dept] ?? 0) + Number(c.netSalary));
      return acc;
    }, {});

    let overtimeCost = 0;
    let bonusCost = 0;
    let employerContribution = 0;
    for (const c of calculations) {
      overtimeCost += Number(c.componentValues.find((v) => ["OVERTIME", "OT"].includes(v.componentCode.toUpperCase()))?.amount ?? 0);
      bonusCost += Number(c.componentValues.find((v) => v.componentCode.toUpperCase() === "BONUS")?.amount ?? 0);
      employerContribution += Number(c.employerContribution?.pfEmployer ?? 0) + Number(c.employerContribution?.esiEmployer ?? 0);
    }

    const prior = await prisma.payrollAnalyticsSnapshot.findFirst({
      where: { companyId },
      orderBy: { snapshotDate: "desc" },
    });
    const priorTotal = prior ? Number((prior.metrics as { totalPayroll?: number }).totalPayroll ?? 0) : 0;
    const payrollGrowth = priorTotal > 0 ? round2(((totalPayroll - priorTotal) / priorTotal) * 100) : 0;

    return {
      totalPayroll,
      averageSalary: nets.length ? round2(totalPayroll / nets.length) : 0,
      highestSalary: nets.length ? Math.max(...nets) : 0,
      lowestSalary: nets.length ? Math.min(...nets) : 0,
      payrollGrowth,
      overtimeCost: round2(overtimeCost),
      bonusCost: round2(bonusCost),
      employerContribution: round2(employerContribution),
      departmentCost,
      headcount: calculations.length,
    };
  }

  async getExecutiveDashboard(input: z.infer<typeof analyticsQuerySchema>, actorUserId?: string): Promise<ExecutiveDashboardData> {
    const companyId = this.requireCompanyId();
    const periodStart = input.periodStart ? new Date(input.periodStart) : undefined;
    const periodEnd = input.periodEnd ? new Date(input.periodEnd) : undefined;
    const kpis = await this.computeMetrics({ payrollId: input.payrollId, periodStart, periodEnd });

    const payrolls = await prisma.payroll.findMany({
      where: { companyId, deletedAt: null, status: { notIn: ["cancelled"] } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { payrollPeriod: true },
    });

    const monthlyTrend = payrolls.map((p) => ({
      month: p.payrollPeriod?.name ?? p.payrollNumber,
      amount: Number(p.totalNet),
    }));

    const departmentCost = Object.entries(kpis.departmentCost).map(([department, amount]) => ({ department, amount }));
    const branchRows = await prisma.payrollCalculation.groupBy({
      by: ["payrollId"],
      where: { companyId, deletedAt: null },
      _sum: { netSalary: true },
      _count: true,
    });

    const charts = {
      monthlyTrend,
      departmentCost,
      branchCost: [{ branch: "All Branches", amount: kpis.totalPayroll }],
      salaryDistribution: [
        { range: "< 25k", count: 0 },
        { range: "25k-50k", count: 0 },
        { range: "50k-100k", count: 0 },
        { range: "> 100k", count: 0 },
      ],
      overtimeTrend: monthlyTrend.map((m) => ({ month: m.month, amount: kpis.overtimeCost })),
      bonusTrend: monthlyTrend.map((m) => ({ month: m.month, amount: kpis.bonusCost })),
      headcountTrend: monthlyTrend.map((m) => ({ month: m.month, count: kpis.headcount })),
    };

    if (input.refresh) {
      await prisma.payrollAnalyticsSnapshot.create({
        data: {
          companyId,
          payrollId: input.payrollId ?? null,
          snapshotDate: new Date(),
          metrics: kpis as object,
          charts: charts as object,
          createdBy: actorUserId,
        },
      });
      await createPayrollReportingAuditService(companyId).record({
        entityType: "payroll_analytics",
        action: "analytics_viewed",
        actorUserId,
      });
    }

    return {
      kpis,
      charts,
      forecast: {
        nextMonthEstimate: round2(kpis.totalPayroll * (1 + kpis.payrollGrowth / 100)),
        growthRate: kpis.payrollGrowth,
      },
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollAnalyticsService(companyId: string) {
  return new PayrollAnalyticsService(companyId);
}
