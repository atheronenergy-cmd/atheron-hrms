import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { EarningsDashboardStats, EarningsReportType } from "@/modules/earnings/domain/types";

export class EarningsReportService extends BaseRepository {
  async getDashboardStats(): Promise<EarningsDashboardStats> {
    const companyId = this.requireCompanyId();
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

    const [pendingOt, approvedOt, bonuses, incentives, commissions, allowances, production] = await Promise.all([
      prisma.overtimeRecord.count({ where: { companyId, deletedAt: null, status: { in: ["draft", "submitted"] } } }),
      prisma.overtimeRecord.count({ where: { companyId, deletedAt: null, status: "approved" } }),
      prisma.employeeBonus.aggregate({ where: { companyId, deletedAt: null, bonusDate: { gte: monthStart, lte: monthEnd }, status: "approved" }, _sum: { amount: true } }),
      prisma.employeeIncentive.aggregate({ where: { companyId, deletedAt: null, periodStart: { lte: monthEnd }, periodEnd: { gte: monthStart }, status: "approved" }, _sum: { amount: true } }),
      prisma.employeeCommission.aggregate({ where: { companyId, deletedAt: null, periodStart: { lte: monthEnd }, periodEnd: { gte: monthStart }, status: "approved" }, _sum: { amount: true } }),
      prisma.employeeAllowance.aggregate({ where: { companyId, deletedAt: null, periodStart: { lte: monthEnd }, periodEnd: { gte: monthStart }, status: { in: ["approved", "finance_approved"] } }, _sum: { amount: true } }),
      prisma.productionMetric.aggregate({ where: { companyId, metricDate: { gte: monthStart, lte: monthEnd } }, _count: true }),
    ]);

    return {
      pendingOt,
      approvedOt,
      monthlyBonus: Number(bonuses._sum.amount ?? 0),
      monthlyIncentives: Number(incentives._sum.amount ?? 0),
      totalCommission: Number(commissions._sum.amount ?? 0),
      totalAllowances: Number(allowances._sum.amount ?? 0),
      productionRewards: production._count,
    };
  }

  async buildReport(params: { reportType: EarningsReportType; periodStart?: Date; periodEnd?: Date }) {
    const companyId = this.requireCompanyId();
    const periodStart = params.periodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd = params.periodEnd ?? new Date();

    const rows: Record<string, string | number | null>[] = [];
    switch (params.reportType) {
      case "overtime": {
        const items = await prisma.overtimeRecord.findMany({
          where: { companyId, deletedAt: null, periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } },
          include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
        });
        for (const i of items) {
          rows.push({
            employeeCode: i.employee.employeeCode,
            employeeName: [i.employee.firstName, i.employee.lastName].filter(Boolean).join(" "),
            otHours: Number(i.otHours),
            amount: Number(i.amount),
            status: i.status,
          });
        }
        break;
      }
      case "bonus": {
        const items = await prisma.employeeBonus.findMany({ where: { companyId, deletedAt: null, bonusDate: { gte: periodStart, lte: periodEnd } }, include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } } });
        for (const i of items) rows.push({ employeeCode: i.employee.employeeCode, bonusType: i.bonusType, amount: Number(i.amount), status: i.status });
        break;
      }
      default:
        break;
    }

    return { reportType: params.reportType, periodStart: periodStart.toISOString().slice(0, 10), periodEnd: periodEnd.toISOString().slice(0, 10), rows, metadata: { exportReady: true } };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createEarningsReportService(companyId: string) {
  return new EarningsReportService(companyId);
}
