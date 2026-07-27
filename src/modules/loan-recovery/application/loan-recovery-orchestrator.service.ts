import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createRecoveryService } from "@/modules/loan-recovery/application/recovery.service";
import type { LoanDashboardStats, LoanReportType } from "@/modules/loan-recovery/domain/types";

export class LoanRecoveryOrchestratorService extends BaseRepository {
  async calculateForEmployee(params: { employeeId: string; periodStart: Date; periodEnd: Date }) {
    return createRecoveryService(this.requireCompanyId()).calculateForPayroll(params);
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export class LoanReportService extends BaseRepository {
  async getDashboardStats(): Promise<LoanDashboardStats> {
    const companyId = this.requireCompanyId();
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

    const [activeLoans, pendingApprovals, loanAgg, monthlyRecovery, activeAdvances, overdueEmis] = await Promise.all([
      prisma.employeeLoan.count({ where: { companyId, deletedAt: null, status: "active" } }),
      prisma.employeeLoan.count({
        where: { companyId, deletedAt: null, status: { in: ["submitted", "manager_approved", "hr_approved", "finance_approved"] } },
      }),
      prisma.employeeLoan.aggregate({
        where: { companyId, deletedAt: null, status: { in: ["active", "approved"] } },
        _sum: { outstandingBalance: true },
      }),
      prisma.loanRecovery.aggregate({
        where: { companyId, recoveredAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.salaryAdvance.count({ where: { companyId, deletedAt: null, status: "active" } }),
      prisma.loanEMISchedule.count({
        where: { companyId, status: "overdue", employeeLoan: { status: "active", deletedAt: null } },
      }),
    ]);

    return {
      activeLoans,
      pendingApprovals,
      outstandingBalance: Number(loanAgg._sum.outstandingBalance ?? 0),
      monthlyEmiCollection: Number(monthlyRecovery._sum.amount ?? 0),
      salaryAdvances: activeAdvances,
      overdueRecoveries: overdueEmis,
    };
  }

  async buildReport(params: { reportType: LoanReportType; periodStart?: string; periodEnd?: string; departmentId?: string }) {
    const companyId = this.requireCompanyId();
    const periodStart = params.periodStart ? new Date(params.periodStart) : undefined;
    const periodEnd = params.periodEnd ? new Date(params.periodEnd) : undefined;

    switch (params.reportType) {
      case "loan_register":
        return prisma.employeeLoan.findMany({
          where: { companyId, deletedAt: null },
          include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } }, loanType: true },
          orderBy: { createdAt: "desc" },
        });
      case "outstanding":
        return prisma.employeeLoan.findMany({
          where: { companyId, deletedAt: null, outstandingBalance: { gt: 0 } },
          include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
        });
      case "recovery":
        return prisma.recoveryHistory.findMany({
          where: {
            companyId,
            ...(periodStart && periodEnd ? { createdAt: { gte: periodStart, lte: periodEnd } } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
      case "advance":
        return prisma.salaryAdvance.findMany({
          where: { companyId, deletedAt: null },
          include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
        });
      case "emi":
        return prisma.loanEMISchedule.findMany({
          where: {
            companyId,
            ...(periodStart && periodEnd ? { dueDate: { gte: periodStart, lte: periodEnd } } : {}),
          },
          include: { employeeLoan: { select: { loanNumber: true, employeeId: true } } },
          orderBy: { dueDate: "asc" },
        });
      case "foreclosure":
        return prisma.loanForeclosure.findMany({
          where: {
            companyId,
            ...(periodStart && periodEnd ? { processedAt: { gte: periodStart, lte: periodEnd } } : {}),
          },
          include: { employeeLoan: { select: { loanNumber: true, employeeId: true } } },
        });
      case "department_loan":
        return prisma.employeeLoan.findMany({
          where: {
            companyId,
            deletedAt: null,
            ...(params.departmentId ? { employee: { departmentId: params.departmentId } } : {}),
          },
          include: {
            employee: { select: { employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } } },
            loanType: true,
          },
        });
      default:
        return [];
    }
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLoanRecoveryOrchestratorService(companyId: string) {
  return new LoanRecoveryOrchestratorService(companyId);
}

export function createLoanReportService(companyId: string) {
  return new LoanReportService(companyId);
}
