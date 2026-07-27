import type { SalaryComponent } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createPayrollAttendanceIntegrationService } from "@/modules/payroll/application/payroll-attendance-integration.service";
import { createPayrollEarningsIntegrationService } from "@/modules/payroll/application/payroll-earnings-integration.service";
import { createPayrollLeaveIntegrationService } from "@/modules/payroll/application/payroll-leave-integration.service";
import { createPayrollLoanRecoveryIntegrationService } from "@/modules/payroll/application/payroll-loan-recovery-integration.service";
import { createPayrollStatutoryIntegrationService } from "@/modules/payroll/application/payroll-statutory-integration.service";
import { payrollValidationService } from "@/modules/payroll/application/payroll-validation.service";
import { salaryFormulaEngine } from "@/modules/payroll/application/salary-formula.service";
import type { PayrollCalculationResult } from "@/modules/payroll/domain/types";
import { PLACEHOLDER_COMPONENT_CODES } from "@/modules/payroll/domain/types";
import { EARNINGS_CODE_ALIASES, EARNINGS_COMPONENT_CODES } from "@/modules/earnings/domain/types";
import type { EarningsCalculationResult } from "@/modules/earnings/domain/types";
import { STATUTORY_CODE_ALIASES, STATUTORY_COMPONENT_CODES } from "@/modules/statutory/domain/types";
import type { StatutoryCalculationResult } from "@/modules/statutory/domain/types";
import type { RecoveryCalculationResult } from "@/modules/loan-recovery/domain/types";
import {
  LOAN_RECOVERY_CODE_ALIASES,
  LOAN_RECOVERY_COMPONENT_CODES,
} from "@/modules/loan-recovery/domain/types";
import { NotFoundError } from "@/shared/errors";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export class PayrollCalculationService extends BaseRepository {
  async calculateEmployee(params: {
    employeeId: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<PayrollCalculationResult & { statutory?: StatutoryCalculationResult; earnings?: EarningsCalculationResult; recovery?: RecoveryCalculationResult }> {
    const companyId = this.requireCompanyId();

    const employee = await prisma.employee.findFirst({
      where: { id: params.employeeId, companyId, deletedAt: null },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });
    if (!employee) throw new NotFoundError("Employee", params.employeeId);

    const employeeSalary = await prisma.employeeSalary.findFirst({
      where: {
        employeeId: params.employeeId,
        companyId,
        deletedAt: null,
        approvalStatus: "approved",
        effectiveFrom: { lte: params.periodEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: params.periodStart } }],
      },
      include: {
        salaryStructure: {
          include: {
            salaryComponents: { where: { deletedAt: null, status: "active" }, orderBy: { sortOrder: "asc" } },
          },
        },
      },
      orderBy: { effectiveFrom: "desc" },
    });

    const warnings: string[] = [];
    if (!employeeSalary) {
      warnings.push("Missing approved salary structure");
      return {
        employeeId: employee.id,
        employeeName: [employee.firstName, employee.lastName].filter(Boolean).join(" "),
        employeeCode: employee.employeeCode,
        components: [],
        attendance: {},
        leave: {},
        gross: 0,
        deductions: 0,
        net: 0,
        warnings,
        paidDays: 0,
        workingDays: 0,
      };
    }

    const attendance = await createPayrollAttendanceIntegrationService(companyId).getSummary(
      params.employeeId,
      params.periodStart,
      params.periodEnd,
    );
    const leave = await createPayrollLeaveIntegrationService(companyId).getSummary(
      params.employeeId,
      params.periodStart,
      params.periodEnd,
    );

    const workingDays = attendance.workingDays;
    const paidDays = Math.max(0, attendance.paidDays + leave.paidLeaveDays - leave.lwpDays);
    const baseSalary = Number(employeeSalary.baseSalary);
    const perDayRate = baseSalary / workingDays;
    const adjustedBasic = round2(perDayRate * paidDays);

    const context: Record<string, number> = {
      BASIC: adjustedBasic,
      BASE: adjustedBasic,
      BASE_SALARY: adjustedBasic,
      GROSS: 0,
      CTC: Number(employeeSalary.monthlyCtc),
      PAID_DAYS: paidDays,
      WORKING_DAYS: workingDays,
      LWP_DAYS: leave.lwpDays,
      LATE_COUNT: attendance.lateCount,
      OVERTIME_HOURS: attendance.overtimeHours,
    };

    const components = employeeSalary.salaryStructure.salaryComponents;
    const earningComponents = components.filter((c) => c.componentType === "earning");
    const deductionComponents = components.filter((c) => c.componentType === "deduction");
    const computed: PayrollCalculationResult["components"] = [];

    for (const comp of earningComponents) {
      const result = this.computeComponent(comp, context, perDayRate, leave.lwpDays, warnings, {}, {});
      computed.push(result);
      context[comp.code.toUpperCase()] = result.amount;
      if (comp.affectsGross) context.GROSS = round2((context.GROSS ?? 0) + result.amount);
    }

    for (let i = 0; i < earningComponents.length; i++) {
      const comp = earningComponents[i]!;
      if (comp.calculationType !== "formula" || !comp.formulaExpression) continue;
      const amount = this.evaluateFormula(comp.formulaExpression, context, warnings, comp.code);
      const idx = computed.findIndex((c) => c.code === comp.code.toUpperCase());
      if (idx >= 0) computed[idx] = { ...computed[idx]!, amount };
      context[comp.code.toUpperCase()] = amount;
    }

    context.GROSS = round2(computed.filter((c) => c.type === "earning").reduce((s, c) => s + c.amount, 0));

    const earnings = await createPayrollEarningsIntegrationService(companyId).calculate({
      employeeId: params.employeeId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      basic: adjustedBasic,
      gross: context.GROSS,
      workingDays,
      overtimeHours: attendance.overtimeHours,
    });
    warnings.push(...earnings.warnings);
    Object.assign(context, earnings.context);

    for (const e of earnings.components) {
      const existingIdx = computed.findIndex((c) => c.code === e.code);
      const entry = { code: e.code, name: e.name, type: "earning" as const, amount: e.amount, isPlaceholder: false };
      if (existingIdx >= 0) computed[existingIdx] = entry;
      else computed.push(entry);
      context[e.code] = e.amount;
    }

    for (const comp of earningComponents) {
      const code = comp.code.toUpperCase();
      if (!EARNINGS_COMPONENT_CODES.has(code)) continue;
      const idx = computed.findIndex((c) => c.code === code);
      const result = this.computeComponent(comp, context, perDayRate, leave.lwpDays, warnings, {}, earnings.breakdown);
      if (idx >= 0) computed[idx] = result;
      else if (result.amount > 0) computed.push(result);
      context[code] = result.amount;
    }

    context.GROSS = round2(computed.filter((c) => c.type === "earning").reduce((s, c) => s + c.amount, 0));

    const statutory = await createPayrollStatutoryIntegrationService(companyId).calculate({
      employeeId: params.employeeId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      basic: adjustedBasic,
      gross: context.GROSS,
      ctc: Number(employeeSalary.monthlyCtc),
    });
    warnings.push(...statutory.warnings);
    Object.assign(context, statutory.context);

    const recovery = await createPayrollLoanRecoveryIntegrationService(companyId).calculate({
      employeeId: params.employeeId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    });
    warnings.push(...recovery.warnings);
    Object.assign(context, recovery.context);

    for (const comp of deductionComponents) {
      const result = this.computeComponent(comp, context, perDayRate, leave.lwpDays, warnings, statutory.deductions, earnings.breakdown, recovery.breakdown);
      computed.push(result);
      context[comp.code.toUpperCase()] = result.amount;
    }

    for (let i = 0; i < deductionComponents.length; i++) {
      const comp = deductionComponents[i]!;
      if (comp.calculationType !== "formula" || !comp.formulaExpression) continue;
      const amount = this.evaluateFormula(comp.formulaExpression, context, warnings, comp.code);
      const idx = computed.findIndex((c) => c.code === comp.code.toUpperCase());
      if (idx >= 0) computed[idx] = { ...computed[idx]!, amount };
      context[comp.code.toUpperCase()] = amount;
    }

    const gross = context.GROSS;
    const deductions = round2(computed.filter((c) => c.type === "deduction").reduce((s, c) => s + c.amount, 0));

    if (attendance.lateCount > 0) {
      warnings.push(`Late attendance count: ${attendance.lateCount} (late deduction placeholder)`);
    }

    const net = round2(gross - deductions);
    payrollValidationService.validateNetSalary(net);

    return {
      employeeId: employee.id,
      employeeName: [employee.firstName, employee.lastName].filter(Boolean).join(" "),
      employeeCode: employee.employeeCode,
      components: computed,
      attendance: attendance as unknown as Record<string, number>,
      leave: leave as unknown as Record<string, number>,
      gross,
      deductions,
      net,
      warnings,
      paidDays,
      workingDays,
      employeeSalaryId: employeeSalary.id,
      salaryStructureId: employeeSalary.salaryStructureId,
      earnings,
      statutory,
      recovery,
    };
  }

  private computeComponent(
    comp: SalaryComponent,
    context: Record<string, number>,
    perDayRate: number,
    lwpDays: number,
    warnings: string[],
    statutoryDeductions: Partial<Record<string, number>>,
    earningsBreakdown: Partial<Record<string, number>>,
    recoveryBreakdown: Partial<Record<string, number>> = {},
  ) {
    const code = comp.code.toUpperCase();

    if (EARNINGS_COMPONENT_CODES.has(code)) {
      const key = EARNINGS_CODE_ALIASES[code];
      const amount = key ? earningsBreakdown[key] ?? context[code] ?? 0 : context[code] ?? 0;
      if (amount > 0) return { code, name: comp.name, type: comp.componentType, amount: round2(amount), isPlaceholder: false };
      return { code, name: comp.name, type: comp.componentType, amount: 0, isPlaceholder: true };
    }

    if (STATUTORY_COMPONENT_CODES.has(code)) {
      const key = STATUTORY_CODE_ALIASES[code];
      const amount = key ? statutoryDeductions[key] ?? context[code] ?? 0 : context[code] ?? 0;
      if (amount > 0) {
        return { code, name: comp.name, type: comp.componentType, amount: round2(amount), isPlaceholder: false };
      }
      warnings.push(`${code} statutory amount is zero or not configured`);
      return { code, name: comp.name, type: comp.componentType, amount: 0, isPlaceholder: true };
    }

    if (LOAN_RECOVERY_COMPONENT_CODES.has(code)) {
      const key = LOAN_RECOVERY_CODE_ALIASES[code];
      const amount = key ? recoveryBreakdown[key] ?? context[code] ?? 0 : context[code] ?? 0;
      if (amount > 0) {
        return { code, name: comp.name, type: comp.componentType, amount: round2(amount), isPlaceholder: false };
      }
      return { code, name: comp.name, type: comp.componentType, amount: 0, isPlaceholder: false };
    }

    if (PLACEHOLDER_COMPONENT_CODES.has(code)) {
      warnings.push(`${code} is a placeholder — calculated in a future module`);
      return { code, name: comp.name, type: comp.componentType, amount: 0, isPlaceholder: true };
    }

    let amount = 0;
    switch (comp.calculationType) {
      case "fixed":
        amount = Number(comp.amount);
        break;
      case "percentage": {
        const base = context[(comp.percentageOf ?? "BASIC").toUpperCase()] ?? context.BASIC ?? 0;
        amount = round2(base * (Number(comp.percentageValue ?? 0) / 100));
        break;
      }
      case "formula":
        amount = comp.formulaExpression
          ? this.evaluateFormula(comp.formulaExpression, context, warnings, comp.code)
          : 0;
        break;
      case "computed":
        if (code === "LWP" || comp.name.toUpperCase().includes("LWP")) {
          amount = round2(perDayRate * lwpDays);
        } else {
          amount = 0;
        }
        break;
      case "manual":
      default:
        amount = 0;
        break;
    }

    if (comp.isEmployerContribution) {
      warnings.push(`${code} employer contribution tracked via statutory engine`);
    }

    return { code, name: comp.name, type: comp.componentType, amount: round2(amount), isPlaceholder: false };
  }

  private evaluateFormula(expression: string, context: Record<string, number>, warnings: string[], code: string) {
    try {
      return salaryFormulaEngine.evaluate(expression, context);
    } catch {
      warnings.push(`Formula evaluation failed for ${code}`);
      return 0;
    }
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollCalculationService(companyId: string) {
  return new PayrollCalculationService(companyId);
}
