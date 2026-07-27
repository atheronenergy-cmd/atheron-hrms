import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { calculateRuleAmount, isRuleEffective, matchesScope, scopePriority } from "@/modules/earnings/application/rule-engine.helper";
import { createEarningsAuditService } from "@/modules/earnings/application/earnings-audit.service";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function getEmployeeScope(companyId: string, employeeId: string) {
  return prisma.employee.findFirst({
    where: { id: employeeId, companyId, deletedAt: null },
    select: { id: true, branchId: true, departmentId: true, designationId: true },
  });
}

export class BonusService extends BaseRepository {
  async calculateForPeriod(employeeId: string, periodStart: Date, periodEnd: Date, context: Record<string, number>) {
    const companyId = this.requireCompanyId();
    const employee = await getEmployeeScope(companyId, employeeId);
    if (!employee) return { amount: 0, warnings: [] as string[] };

    const approved = await prisma.employeeBonus.findMany({
      where: {
        companyId,
        employeeId,
        deletedAt: null,
        status: "approved",
        payrollCalculationId: null,
        bonusDate: { gte: periodStart, lte: periodEnd },
      },
    });
    const manualTotal = approved.reduce((s, b) => s + Number(b.amount), 0);

    const rules = await prisma.bonusRule.findMany({ where: { companyId, deletedAt: null, status: "active" } });
    const rule = rules
      .filter((r) => isRuleEffective(r, periodEnd))
      .filter((r) => matchesScope(r, { employeeId, ...employee }))
      .sort((a, b) => scopePriority(b.scope) - scopePriority(a.scope))[0];

    const ruleAmount = rule ? calculateRuleAmount(rule, context) : 0;
    return { amount: round2(manualTotal + ruleAmount), warnings: rule ? [] : manualTotal ? [] : ["No bonus rule matched"] };
  }

  async assignBonus(input: {
    employeeId: string;
    bonusType: string;
    amount: number;
    bonusDate: Date;
    bonusRuleId?: string;
    remarks?: string;
  }, userId?: string) {
    const companyId = this.requireCompanyId();
    const bonus = await prisma.employeeBonus.create({
      data: { companyId, ...input, status: "submitted", createdBy: userId },
    });
    await createEarningsAuditService(companyId).log("EmployeeBonus", bonus.id, "assigned", userId);
    return bonus;
  }

  async approve(bonusId: string, userId: string) {
    const companyId = this.requireCompanyId();
    const bonus = await prisma.employeeBonus.update({
      where: { id: bonusId, companyId },
      data: { status: "approved", approvedBy: userId, approvedAt: new Date(), updatedBy: userId },
    });
    await createEarningsAuditService(companyId).log("EmployeeBonus", bonusId, "approved", userId);
    return bonus;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export class IncentiveService extends BaseRepository {
  async calculateForPeriod(employeeId: string, periodStart: Date, periodEnd: Date, context: Record<string, number>) {
    const companyId = this.requireCompanyId();
    const employee = await getEmployeeScope(companyId, employeeId);
    if (!employee) return { amount: 0, warnings: [] as string[] };

    const approved = await prisma.employeeIncentive.findMany({
      where: {
        companyId,
        employeeId,
        deletedAt: null,
        status: "approved",
        payrollCalculationId: null,
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
    });
    const manualTotal = approved.reduce((s, i) => s + Number(i.amount), 0);

    const rules = await prisma.incentiveRule.findMany({ where: { companyId, deletedAt: null, status: "active" } });
    const rule = rules
      .filter((r) => isRuleEffective(r, periodEnd))
      .filter((r) => matchesScope(r, { employeeId, ...employee }))
      .sort((a, b) => scopePriority(b.scope) - scopePriority(a.scope))[0];

    return { amount: round2(manualTotal + (rule ? calculateRuleAmount(rule, context) : 0)), warnings: [] };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export class CommissionService extends BaseRepository {
  async calculateForPeriod(employeeId: string, periodStart: Date, periodEnd: Date, context: Record<string, number>, salesAmount = 0) {
    const companyId = this.requireCompanyId();
    const employee = await getEmployeeScope(companyId, employeeId);
    if (!employee) return { amount: 0, warnings: [] as string[] };

    const approved = await prisma.employeeCommission.findMany({
      where: {
        companyId,
        employeeId,
        deletedAt: null,
        status: "approved",
        payrollCalculationId: null,
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
    });
    const manualTotal = approved.reduce((s, c) => s + Number(c.amount), 0);

    const rules = await prisma.commissionRule.findMany({ where: { companyId, deletedAt: null, status: "active" } });
    const rule = rules
      .filter((r) => isRuleEffective(r, periodEnd))
      .filter((r) => matchesScope(r, { employeeId, ...employee }))
      .sort((a, b) => scopePriority(b.scope) - scopePriority(a.scope))[0];

    const ruleAmount = rule ? calculateRuleAmount(rule, { ...context, SALES: salesAmount }, salesAmount) : 0;
    return { amount: round2(manualTotal + ruleAmount), warnings: [] };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export class AllowanceService extends BaseRepository {
  async calculateForPeriod(employeeId: string, periodStart: Date, periodEnd: Date, context: Record<string, number>) {
    const companyId = this.requireCompanyId();
    const employee = await getEmployeeScope(companyId, employeeId);
    if (!employee) return { amount: 0, warnings: [] as string[] };

    const approved = await prisma.employeeAllowance.findMany({
      where: {
        companyId,
        employeeId,
        deletedAt: null,
        status: { in: ["approved", "finance_approved"] },
        payrollCalculationId: null,
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
    });
    const manualTotal = approved.reduce((s, a) => s + Number(a.amount), 0);

    const rules = await prisma.allowanceRule.findMany({ where: { companyId, deletedAt: null, status: "active" } });
    const ruleAmount = rules
      .filter((r) => isRuleEffective(r, periodEnd))
      .filter((r) => matchesScope(r, { employeeId, ...employee }))
      .reduce((s, r) => s + calculateRuleAmount(r, context), 0);

    return { amount: round2(manualTotal + ruleAmount), warnings: [] };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export class ProductionIncentiveService extends BaseRepository {
  async calculateForPeriod(employeeId: string, periodStart: Date, periodEnd: Date) {
    const companyId = this.requireCompanyId();
    const metrics = await prisma.productionMetric.findMany({
      where: { companyId, employeeId, metricDate: { gte: periodStart, lte: periodEnd } },
    });
    let amount = 0;
    const warnings: string[] = [];
    for (const m of metrics) {
      const target = Number(m.targetValue);
      const actual = Number(m.actualValue);
      if (target <= 0) continue;
      const achievement = actual / target;
      let reward = 0;
      if (achievement >= 1) reward = round2(achievement * 100);
      if (m.efficiencyScore) reward += round2(Number(m.efficiencyScore));
      if (m.qualityScore && Number(m.qualityScore) >= 95) reward += 50;
      if (m.rejectPercent && Number(m.rejectPercent) > 5) warnings.push(`High reject % on ${m.kpiCode}`);
      amount += reward;
    }
    return { amount: round2(amount), warnings };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export class PerformanceRewardService extends BaseRepository {
  async calculateForPeriod(employeeId: string, periodStart: Date, periodEnd: Date) {
    const companyId = this.requireCompanyId();
    const metrics = await prisma.performanceMetric.findMany({
      where: { companyId, employeeId, metricDate: { gte: periodStart, lte: periodEnd } },
    });
    const amount = metrics.reduce((s, m) => {
      const target = Number(m.targetScore ?? 0);
      const score = Number(m.score);
      const configured = Number(m.rewardAmount);
      if (configured > 0) return s + configured;
      if (target > 0 && score >= target) return s + round2(score * 10);
      return s;
    }, 0);
    return { amount: round2(amount), warnings: [] as string[] };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createBonusService(companyId: string) { return new BonusService(companyId); }
export function createIncentiveService(companyId: string) { return new IncentiveService(companyId); }
export function createCommissionService(companyId: string) { return new CommissionService(companyId); }
export function createAllowanceService(companyId: string) { return new AllowanceService(companyId); }
export function createProductionIncentiveService(companyId: string) { return new ProductionIncentiveService(companyId); }
export function createPerformanceRewardService(companyId: string) { return new PerformanceRewardService(companyId); }
