import { salaryFormulaEngine } from "@/modules/payroll/application/salary-formula.service";
import type { EmployeeScope, RuleLike } from "@/modules/earnings/domain/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function isRuleEffective(rule: { effectiveFrom: Date; effectiveTo: Date | null }, date: Date) {
  const d = date.getTime();
  return d >= rule.effectiveFrom.getTime() && (!rule.effectiveTo || d <= rule.effectiveTo.getTime());
}

export function matchesScope(
  rule: {
    scope: string;
    branchId?: string | null;
    departmentId?: string | null;
    designationId?: string | null;
    employeeId?: string | null;
  },
  employee: EmployeeScope,
) {
  switch (rule.scope) {
    case "employee":
      return rule.employeeId === employee.employeeId;
    case "designation":
      return rule.designationId === employee.designationId;
    case "department":
      return rule.departmentId === employee.departmentId;
    case "branch":
      return rule.branchId === employee.branchId;
    case "company":
    default:
      return true;
  }
}

export function scopePriority(scope: string) {
  const order: Record<string, number> = { employee: 5, designation: 4, department: 3, branch: 2, company: 1 };
  return order[scope] ?? 0;
}

export function calculateRuleAmount(rule: RuleLike, context: Record<string, number>, actualValue?: number) {
  switch (rule.calculationMode) {
    case "fixed":
      return round2(Number(rule.amount));
    case "percentage": {
      const base = context[(rule.percentageOf ?? "BASIC").toUpperCase()] ?? context.BASIC ?? 0;
      return round2(base * (Number(rule.percentageValue ?? 0) / 100));
    }
    case "slab": {
      const value = actualValue ?? context.GROSS ?? 0;
      const slabs = (rule.slabs as Array<{ from: number; to: number | null; rate?: number; amount?: number }>) ?? [];
      const slab = slabs.find((s) => value >= s.from && (s.to === null || value <= s.to));
      if (!slab) return 0;
      if (slab.amount != null) return round2(slab.amount);
      return round2((value * (slab.rate ?? 0)) / 100);
    }
    case "formula":
      return rule.formulaExpression ? round2(salaryFormulaEngine.evaluate(rule.formulaExpression, context)) : 0;
    case "conditional":
    default:
      return round2(Number(rule.amount));
  }
}
