import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { StatutoryExportPayload, StatutoryReportType } from "@/modules/statutory/domain/types";

export class StatutoryReportService extends BaseRepository {
  async buildReport(params: {
    reportType: StatutoryReportType;
    financialYearId?: string;
    periodStart?: Date;
    periodEnd?: Date;
  }): Promise<StatutoryExportPayload> {
    const companyId = this.requireCompanyId();
    const fy = params.financialYearId
      ? await prisma.financialYear.findFirst({ where: { id: params.financialYearId, companyId } })
      : await prisma.financialYear.findFirst({ where: { companyId, isCurrent: true, deletedAt: null } });

    const periodStart = params.periodStart ?? fy?.startDate ?? new Date();
    const periodEnd = params.periodEnd ?? fy?.endDate ?? new Date();

    const calculations = await prisma.payrollCalculation.findMany({
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      include: {
        employee: { select: { employeeCode: true, firstName: true, lastName: true } },
        componentValues: true,
        taxComputation: true,
        employerContribution: true,
      },
      take: 500,
    });

    const rows = calculations.map((calc) => {
      const getComp = (code: string) =>
        Number(calc.componentValues.find((c) => c.componentCode.toUpperCase() === code)?.amount ?? 0);
      const base = {
        employeeCode: calc.employee.employeeCode,
        employeeName: [calc.employee.firstName, calc.employee.lastName].filter(Boolean).join(" "),
        grossSalary: Number(calc.grossSalary),
        netSalary: Number(calc.netSalary),
        periodStart: periodStart.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
      };

      switch (params.reportType) {
        case "pf":
          return {
            ...base,
            pfEmployee: getComp("PF"),
            vpf: getComp("VPF"),
            pfEmployer: Number(calc.employerContribution?.pfEmployer ?? 0),
            eps: Number(calc.employerContribution?.eps ?? 0),
            adminCharges: Number(calc.employerContribution?.pfAdminCharges ?? 0),
          };
        case "esi":
          return {
            ...base,
            esiEmployee: getComp("ESI"),
            esiEmployer: Number(calc.employerContribution?.esiEmployer ?? 0),
          };
        case "pt":
          return { ...base, professionalTax: getComp("PT") || getComp("PROFESSIONAL_TAX") };
        case "tds":
          return {
            ...base,
            monthlyTds: getComp("TDS") || getComp("TAX") || getComp("INCOME_TAX"),
            annualTax: Number(calc.taxComputation?.annualTax ?? 0),
            taxRegime: calc.taxComputation?.taxRegime ?? null,
          };
        case "employer":
          return {
            ...base,
            pfEmployer: Number(calc.employerContribution?.pfEmployer ?? 0),
            eps: Number(calc.employerContribution?.eps ?? 0),
            pfAdmin: Number(calc.employerContribution?.pfAdminCharges ?? 0),
            edli: Number(calc.employerContribution?.edli ?? 0),
            esiEmployer: Number(calc.employerContribution?.esiEmployer ?? 0),
            bonusPlaceholder: Number(calc.employerContribution?.bonusPlaceholder ?? 0),
            gratuityPlaceholder: Number(calc.employerContribution?.gratuityPlaceholder ?? 0),
          };
        default:
          return base;
      }
    });

    return {
      reportType: params.reportType,
      financialYearCode: fy?.code ?? "UNKNOWN",
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
      rows,
      metadata: { rowCount: rows.length, exportReady: true },
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createStatutoryReportService(companyId: string) {
  return new StatutoryReportService(companyId);
}
