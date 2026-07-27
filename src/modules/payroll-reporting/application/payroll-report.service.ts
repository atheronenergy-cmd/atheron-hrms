import type { PayrollReportType, Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createPayrollReportingAuditService } from "@/modules/payroll-reporting/application/payroll-reporting-audit.service";
import type { ReportFilters, SalaryRegisterRow } from "@/modules/payroll-reporting/domain/types";
import type { payrollReportSchema } from "@/modules/payroll-reporting/validation/schemas";
import type { z } from "zod";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export class PayrollReportService extends BaseRepository {
  private buildWhere(filters: ReportFilters, companyId: string): Prisma.PayrollCalculationWhereInput {
    return {
      companyId,
      deletedAt: null,
      ...(filters.payrollId ? { payrollId: filters.payrollId } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      employee: {
        deletedAt: null,
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.designationId ? { designationId: filters.designationId } : {}),
        ...(filters.employmentType ? { employmentType: filters.employmentType as never } : {}),
        ...(filters.costCenterId ? { costCenterId: filters.costCenterId } : {}),
      },
      ...(filters.payrollId
        ? {}
        : filters.periodStart && filters.periodEnd
          ? { createdAt: { gte: new Date(filters.periodStart), lte: new Date(filters.periodEnd) } }
          : {}),
    };
  }

  private async loadCalculations(filters: ReportFilters) {
    return prisma.payrollCalculation.findMany({
      where: this.buildWhere(filters, this.requireCompanyId()),
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            employmentType: true,
            department: { select: { name: true } },
            branch: { select: { name: true } },
            designation: { select: { name: true } },
            costCenter: { select: { code: true, name: true } },
          },
        },
        componentValues: true,
        employerContribution: true,
        payroll: { include: { payrollPeriod: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
  }

  private toRegisterRow(calc: Awaited<ReturnType<PayrollReportService["loadCalculations"]>>[number]): SalaryRegisterRow {
    const getComp = (type: string, codes: string[]) =>
      calc.componentValues
        .filter((c) => c.componentType === type && codes.includes(c.componentCode.toUpperCase()))
        .reduce((s, c) => s + Number(c.amount), 0);
    const basic = getComp("earning", ["BASIC", "BASE", "BASE_SALARY"]) || Number(calc.grossSalary) * 0.4;
    const allowances =
      Number(calc.grossSalary) -
      basic -
      calc.componentValues.filter((c) => c.componentType === "earning" && ["BASIC", "BASE"].includes(c.componentCode.toUpperCase())).length;
    const employerContributions = Number(calc.employerContribution?.pfEmployer ?? 0) + Number(calc.employerContribution?.esiEmployer ?? 0);

    return {
      employeeId: calc.employeeId,
      employeeCode: calc.employee.employeeCode,
      employeeName: [calc.employee.firstName, calc.employee.lastName].filter(Boolean).join(" "),
      department: calc.employee.department.name,
      designation: calc.employee.designation.name,
      costCenter: calc.employee.costCenter?.name,
      basic: round2(basic),
      allowances: round2(Math.max(0, allowances)),
      gross: Number(calc.grossSalary),
      deductions: Number(calc.totalDeductions),
      employerContributions: round2(employerContributions),
      netSalary: Number(calc.netSalary),
      paymentStatus: "pending",
    };
  }

  async buildReport(input: z.infer<typeof payrollReportSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const filters: ReportFilters = {
      ...input.filters,
      payrollId: input.payrollId,
      payrollPeriodId: input.payrollPeriodId,
    };
    const calculations = await this.loadCalculations(filters);
    const rows = calculations.map((c) => this.toRegisterRow(c));

    let resultRows: unknown[] = rows;
    const summary: Record<string, number> = {
      count: rows.length,
      totalGross: round2(rows.reduce((s, r) => s + r.gross, 0)),
      totalNet: round2(rows.reduce((s, r) => s + r.netSalary, 0)),
      totalDeductions: round2(rows.reduce((s, r) => s + r.deductions, 0)),
    };

    switch (input.reportType as PayrollReportType) {
      case "department_payroll":
        resultRows = Object.entries(
          rows.reduce<Record<string, SalaryRegisterRow[]>>((acc, r) => {
            (acc[r.department] ??= []).push(r);
            return acc;
          }, {}),
        ).map(([department, items]) => ({
          department,
          count: items.length,
          gross: round2(items.reduce((s, i) => s + i.gross, 0)),
          net: round2(items.reduce((s, i) => s + i.netSalary, 0)),
        }));
        break;
      case "branch_payroll":
        resultRows = calculations.reduce<Array<{ branch: string; count: number; net: number }>>((acc, c) => {
          const branch = c.employee.branch.name;
          const existing = acc.find((a) => a.branch === branch);
          if (existing) {
            existing.count += 1;
            existing.net = round2(existing.net + Number(c.netSalary));
          } else acc.push({ branch, count: 1, net: Number(c.netSalary) });
          return acc;
        }, []);
        break;
      case "payroll_summary":
        resultRows = [{ ...summary, reportType: input.reportType }];
        break;
      case "payroll_variance":
      case "payroll_comparison":
        resultRows = rows.map((r) => ({ ...r, varianceNote: "Compare with prior period via analytics" }));
        break;
      default:
        break;
    }

    const report = await prisma.payrollReport.create({
      data: {
        companyId,
        payrollId: input.payrollId ?? null,
        payrollPeriodId: input.payrollPeriodId ?? null,
        reportType: input.reportType as PayrollReportType,
        title: `${input.reportType.replace(/_/g, " ")} report`,
        filters: filters as object,
        rowCount: Array.isArray(resultRows) ? resultRows.length : 1,
        summary: summary as object,
        generatedBy: actorUserId,
      },
    });

    await createPayrollReportingAuditService(companyId).record({
      entityType: "payroll_report",
      entityId: report.id,
      action: "report_generated",
      actorUserId,
      metadata: { reportType: input.reportType, rowCount: report.rowCount },
    });

    return { report, rows: resultRows, summary, metadata: { exportReady: true } };
  }

  async listReports(limit = 20) {
    return prisma.payrollReport.findMany({
      where: { companyId: this.requireCompanyId() },
      orderBy: { generatedAt: "desc" },
      take: limit,
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollReportService(companyId: string) {
  return new PayrollReportService(companyId);
}
