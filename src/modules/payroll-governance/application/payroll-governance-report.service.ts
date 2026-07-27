import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { GovernanceReportType } from "@/modules/payroll-governance/domain/types";
import type { governanceReportSchema } from "@/modules/payroll-governance/validation/schemas";
import type { z } from "zod";

export class PayrollGovernanceReportService extends BaseRepository {
  async generate(input: z.infer<typeof governanceReportSchema>) {
    const companyId = this.requireCompanyId();
    switch (input.reportType) {
      case "approval_history":
        return this.approvalHistory(companyId, input.payrollId);
      case "locked_payroll":
        return this.lockedPayrollReport(companyId);
      case "version_history":
        return this.versionHistory(companyId, input.payrollId);
      case "retro_payroll":
        return this.retroReport(companyId);
      case "arrear_report":
        return this.arrearReport(companyId);
      case "financial_year_summary":
        return this.financialYearSummary(companyId, input.payrollYearId);
      case "compliance_snapshot":
        return this.complianceReport(companyId, input.payrollId);
      default:
        return { rows: [], reportType: input.reportType };
    }
  }

  private async approvalHistory(companyId: string, payrollId?: string) {
    const rows = await prisma.payrollApproval.findMany({
      where: { companyId, ...(payrollId ? { payrollId } : {}) },
      include: { steps: true, payroll: { select: { payrollNumber: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { reportType: "approval_history" as GovernanceReportType, rowCount: rows.length, rows };
  }

  private async lockedPayrollReport(companyId: string) {
    const rows = await prisma.payroll.findMany({
      where: { companyId, deletedAt: null, status: "locked" },
      include: { payrollLocks: { where: { isActive: true } } },
      orderBy: { lockedAt: "desc" },
    });
    return { reportType: "locked_payroll" as GovernanceReportType, rowCount: rows.length, rows };
  }

  private async versionHistory(companyId: string, payrollId?: string) {
    if (!payrollId) return { reportType: "version_history" as GovernanceReportType, rowCount: 0, rows: [] };
    const rows = await prisma.payrollVersion.findMany({ where: { companyId, payrollId }, orderBy: { versionNumber: "desc" } });
    return { reportType: "version_history" as GovernanceReportType, rowCount: rows.length, rows };
  }

  private async retroReport(companyId: string) {
    const rows = await prisma.retroPayroll.findMany({
      where: { companyId },
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { reportType: "retro_payroll" as GovernanceReportType, rowCount: rows.length, rows };
  }

  private async arrearReport(companyId: string) {
    const rows = await prisma.payrollArrear.findMany({
      where: { companyId },
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { reportType: "arrear_report" as GovernanceReportType, rowCount: rows.length, rows };
  }

  private async financialYearSummary(companyId: string, payrollYearId?: string) {
    const rows = payrollYearId
      ? await prisma.payrollYear.findMany({ where: { companyId, id: payrollYearId } })
      : await prisma.payrollYear.findMany({ where: { companyId }, orderBy: { startDate: "desc" } });
    return { reportType: "financial_year_summary" as GovernanceReportType, rowCount: rows.length, rows };
  }

  private async complianceReport(companyId: string, payrollId?: string) {
    const rows = await prisma.payrollComplianceSnapshot.findMany({
      where: { companyId, ...(payrollId ? { payrollId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return { reportType: "compliance_snapshot" as GovernanceReportType, rowCount: rows.length, rows };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollGovernanceReportService(companyId: string) {
  return new PayrollGovernanceReportService(companyId);
}
