import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { calculateRuleAmount, isRuleEffective, matchesScope, scopePriority } from "@/modules/earnings/application/rule-engine.helper";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type OvertimeCalcInput = {
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  basic: number;
  workingDays: number;
  overtimeHours: number;
  holidayOtHours?: number;
  nightOtHours?: number;
};

export type OvertimeCalcResult = {
  amount: number;
  otHours: number;
  holidayOtHours: number;
  nightOtHours: number;
  hourlyRate: number;
  multiplier: number;
  ruleId?: string;
  warnings: string[];
};

export class OvertimeCalculationService extends BaseRepository {
  async calculate(input: OvertimeCalcInput): Promise<OvertimeCalcResult> {
    const companyId = this.requireCompanyId();
    const warnings: string[] = [];
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId, deletedAt: null },
      select: { branchId: true, departmentId: true, designationId: true },
    });
    if (!employee) return { amount: 0, otHours: 0, holidayOtHours: 0, nightOtHours: 0, hourlyRate: 0, multiplier: 1, warnings: ["Employee not found"] };

    const rules = await prisma.overtimeRule.findMany({
      where: { companyId, deletedAt: null, status: "active", autoCalculation: true },
      orderBy: { versionNumber: "desc" },
    });

    const applicable = rules
      .filter((r) => isRuleEffective(r, input.periodEnd))
      .filter((r) => matchesScope(r, { employeeId: input.employeeId, ...employee }))
      .sort((a, b) => scopePriority(b.scope) - scopePriority(a.scope))[0];

    const otHours = input.overtimeHours;
    const holidayOtHours = input.holidayOtHours ?? 0;
    const nightOtHours = input.nightOtHours ?? 0;
    if (otHours + holidayOtHours + nightOtHours <= 0) {
      return { amount: 0, otHours, holidayOtHours, nightOtHours, hourlyRate: 0, multiplier: 1, warnings };
    }

    const defaultHourly = round2(input.basic / Math.max(1, input.workingDays) / 8);
    const hourlyRate = applicable?.hourlyRate ? Number(applicable.hourlyRate) : defaultHourly;
    let multiplier = applicable ? Number(applicable.multiplier) : 1.5;

    if (applicable?.overtimeType === "double") multiplier = 2;
    if (applicable?.overtimeType === "triple") multiplier = 3;
    if (applicable?.overtimeType === "holiday") multiplier = Math.max(multiplier, 2);
    if (applicable?.overtimeType === "night_shift") multiplier = Math.max(multiplier, 1.25);

    let hours = otHours;
    if (applicable?.minHours && hours < Number(applicable.minHours)) {
      warnings.push(`OT hours below minimum ${applicable.minHours}`);
      hours = 0;
    }
    if (applicable?.maxHours && hours > Number(applicable.maxHours)) {
      warnings.push(`OT hours capped at ${applicable.maxHours}`);
      hours = Number(applicable.maxHours);
    }

    const context = { BASIC: input.basic, OVERTIME_HOURS: hours, HOURLY_RATE: hourlyRate, MULTIPLIER: multiplier };
    let amount = round2(hours * hourlyRate * multiplier);
    amount += round2(holidayOtHours * hourlyRate * Math.max(multiplier, 2));
    amount += round2(nightOtHours * hourlyRate * Math.max(multiplier, 1.25));

    if (applicable?.calculationMode === "formula" && applicable.formulaExpression) {
      amount = calculateRuleAmount(applicable, context);
    }

    return { amount: round2(amount), otHours: hours, holidayOtHours, nightOtHours, hourlyRate, multiplier, ruleId: applicable?.id, warnings };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createOvertimeCalculationService(companyId: string) {
  return new OvertimeCalculationService(companyId);
}
