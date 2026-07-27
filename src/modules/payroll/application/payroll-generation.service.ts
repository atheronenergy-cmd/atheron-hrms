import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { recordPayrollAudit } from "@/modules/payroll/application/payroll-audit.service";
import { createPayrollCalculationService } from "@/modules/payroll/application/payroll-calculation.service";
import { persistStatutoryResults } from "@/modules/payroll/application/payroll-statutory-integration.service";
import { persistEarningsResults } from "@/modules/payroll/application/payroll-earnings-integration.service";
import { persistRecoveryResults } from "@/modules/payroll/application/payroll-loan-recovery-integration.service";
import { payrollValidationService } from "@/modules/payroll/application/payroll-validation.service";
import type { PayrollPreviewResult } from "@/modules/payroll/domain/types";
import type { PayrollGenerateInput } from "@/modules/payroll/validation/schemas";
import { BusinessRuleError } from "@/shared/errors";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export class PayrollPreviewService extends BaseRepository {
  async preview(input: PayrollGenerateInput): Promise<{ previews: PayrollPreviewResult[]; warnings: string[] }> {
    const companyId = this.requireCompanyId();
    const employeeIds = await this.resolveEmployeeIds(input);
    await payrollValidationService.validateGeneration(companyId, input.payrollPeriodId, employeeIds);

    const period = await prisma.payrollPeriod.findFirst({ where: { id: input.payrollPeriodId, companyId } });
    if (!period) throw new BusinessRuleError("Payroll period not found");

    const calc = createPayrollCalculationService(companyId);
    const previews: PayrollPreviewResult[] = [];
    const allWarnings: string[] = [];

    for (const employeeId of employeeIds) {
      const result = await calc.calculateEmployee({
        employeeId,
        periodStart: period.startDate,
        periodEnd: period.endDate,
      });
      previews.push(result);
      allWarnings.push(...result.warnings.map((w) => `${result.employeeCode}: ${w}`));
    }

    return { previews, warnings: allWarnings };
  }

  private async resolveEmployeeIds(input: PayrollGenerateInput) {
    const companyId = this.requireCompanyId();
    const where = {
      companyId,
      deletedAt: null,
      employmentStatus: "active" as const,
      ...(input.scope === "employee" && input.employeeId ? { id: input.employeeId } : {}),
      ...(input.scope === "department" && input.departmentId ? { departmentId: input.departmentId } : {}),
      ...(input.scope === "branch" && input.branchId ? { branchId: input.branchId } : {}),
    };
    const employees = await prisma.employee.findMany({ where, select: { id: true } });
    return employees.map((e) => e.id);
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export class PayrollGenerationService extends BaseRepository {
  async generate(input: PayrollGenerateInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const previewSvc = createPayrollPreviewService(companyId);
    const { previews, warnings } = await previewSvc.preview(input);

    if (input.previewOnly) {
      return { preview: true, previews, warnings };
    }

    const period = await prisma.payrollPeriod.findFirst({ where: { id: input.payrollPeriodId, companyId } });
    if (!period) throw new BusinessRuleError("Payroll period not found");

    const payrollNumber =
      input.payrollNumber ?? `PAY-${period.payrollYear}-${String(period.payrollMonth ?? 0).padStart(2, "0")}-${Date.now().toString().slice(-5)}`;

    const payroll = await prisma.payroll.create({
      data: {
        companyId,
        payrollPeriodId: input.payrollPeriodId,
        payrollNumber,
        scope: input.scope,
        branchId: input.branchId,
        departmentId: input.departmentId,
        status: "draft",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await recordPayrollAudit("payroll_generated", { companyId, payrollId: payroll.id, actorUserId, metadata: { scope: input.scope } });

    const calculated = await this.calculateAndPersist(payroll.id, previews, actorUserId, period.startDate, period.endDate);
    return { payroll: calculated, previews, warnings };
  }

  async calculateAndPersist(
    payrollId: string,
    previews: Awaited<ReturnType<PayrollPreviewService["preview"]>>["previews"],
    actorUserId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const companyId = this.requireCompanyId();
    await payrollValidationService.validateEditable(payrollId, companyId);

    await prisma.payrollCalculation.deleteMany({ where: { payrollId } });

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let errorCount = 0;

    for (const p of previews) {
      if (p.warnings.some((w) => w.includes("Missing approved salary"))) {
        errorCount += 1;
      }

      const calc = await prisma.payrollCalculation.create({
        data: {
          companyId,
          payrollId,
          employeeId: p.employeeId,
          employeeSalaryId: p.employeeSalaryId,
          salaryStructureId: p.salaryStructureId,
          status: "calculated",
          grossSalary: p.gross,
          totalDeductions: p.deductions,
          netSalary: p.net,
          paidDays: p.paidDays,
          workingDays: p.workingDays,
          attendanceSummary: p.attendance as object,
          leaveSummary: p.leave as object,
          calculationSnapshot: {
            components: p.components,
            periodStart,
            periodEnd,
            statutory: (p as { statutory?: unknown }).statutory,
            earnings: (p as { earnings?: unknown }).earnings,
            recovery: (p as { recovery?: unknown }).recovery,
          } as object,
          warnings: p.warnings as object,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });

      await prisma.payrollComponentValue.createMany({
        data: p.components.map((c, idx) => ({
          companyId,
          payrollCalculationId: calc.id,
          componentCode: c.code,
          componentName: c.name,
          componentType: c.type as "earning" | "deduction",
          calculationType: "fixed",
          amount: c.amount,
          isPlaceholder: c.isPlaceholder ?? false,
          sortOrder: idx,
        })),
      });

      const statutory = (p as { statutory?: Parameters<typeof persistStatutoryResults>[0]["statutory"] }).statutory;
      if (statutory) {
        await persistStatutoryResults({
          companyId,
          employeeId: p.employeeId,
          payrollCalculationId: calc.id,
          periodStart,
          periodEnd,
          statutory,
        });
      }

      const earnings = (p as { earnings?: Parameters<typeof persistEarningsResults>[0]["earnings"] }).earnings;
      if (earnings) {
        await persistEarningsResults({
          companyId,
          employeeId: p.employeeId,
          payrollCalculationId: calc.id,
          periodStart,
          periodEnd,
          earnings,
        });
      }

      const recovery = (p as { recovery?: Parameters<typeof persistRecoveryResults>[0]["recovery"] }).recovery;
      if (recovery && recovery.breakdown.total > 0) {
        await persistRecoveryResults({
          companyId,
          employeeId: p.employeeId,
          payrollCalculationId: calc.id,
          periodEnd,
          recovery,
          actorUserId,
        });
      }

      totalGross += p.gross;
      totalDeductions += p.deductions;
      totalNet += p.net;
    }

    const payroll = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: "calculated",
        totalGross,
        totalDeductions,
        totalNet,
        employeeCount: previews.length,
        errorCount,
        calculationVersion: { increment: 1 },
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    const existingSummary = await prisma.payrollSummary.findFirst({ where: { payrollId } });
    if (existingSummary) {
      await prisma.payrollSummary.update({
        where: { id: existingSummary.id },
        data: { totalGross, totalDeductions, totalNet, employeeCount: previews.length, errorCount },
      });
    } else {
      await prisma.payrollSummary.create({
        data: {
          companyId,
          payrollId,
          payrollPeriodId: payroll.payrollPeriodId,
          totalGross,
          totalDeductions,
          totalNet,
          employeeCount: previews.length,
          errorCount,
        },
      });
    }

    await prisma.payrollVersion.create({
      data: {
        companyId,
        payrollId,
        versionNumber: payroll.calculationVersion,
        snapshot: { totalGross, totalDeductions, totalNet, employeeCount: previews.length } as object,
        createdBy: actorUserId,
      },
    });

    await recordPayrollAudit("payroll_calculated", { companyId, payrollId, actorUserId });

    return payroll;
  }

  async recalculate(payrollId: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const payroll = await payrollValidationService.validateEditable(payrollId, companyId, version);
    const period = await prisma.payrollPeriod.findFirst({ where: { id: payroll.payrollPeriodId ?? "" } });
    if (!period) throw new BusinessRuleError("Payroll period not found");

    const calcs = await prisma.payrollCalculation.findMany({ where: { payrollId, deletedAt: null } });
    const calcSvc = createPayrollCalculationService(companyId);
    const previews = await Promise.all(
      calcs.map((c) =>
        calcSvc.calculateEmployee({ employeeId: c.employeeId, periodStart: period.startDate, periodEnd: period.endDate }),
      ),
    );

    const result = await this.calculateAndPersist(payrollId, previews, actorUserId, period.startDate, period.endDate);
    await recordPayrollAudit("payroll_recalculated", { companyId, payrollId, actorUserId });
    return result;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollPreviewService(companyId: string) {
  return new PayrollPreviewService(companyId);
}

export function createPayrollGenerationService(companyId: string) {
  return new PayrollGenerationService(companyId);
}
