import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import {
  createAllowanceService,
  createBonusService,
  createCommissionService,
  createIncentiveService,
  createPerformanceRewardService,
  createProductionIncentiveService,
} from "@/modules/earnings/application/bonus.service";
import { createOvertimeCalculationService } from "@/modules/earnings/application/overtime-calculation.service";
import type { EarningsCalculationResult } from "@/modules/earnings/domain/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export class EarningsOrchestratorService extends BaseRepository {
  async calculateForEmployee(params: {
    employeeId: string;
    periodStart: Date;
    periodEnd: Date;
    basic: number;
    gross: number;
    workingDays: number;
    overtimeHours: number;
  }): Promise<EarningsCalculationResult> {
    const companyId = this.requireCompanyId();
    const context: Record<string, number> = {
      BASIC: params.basic,
      GROSS: params.gross,
      OVERTIME_HOURS: params.overtimeHours,
    };
    const warnings: string[] = [];

    const ot = await createOvertimeCalculationService(companyId).calculate({
      employeeId: params.employeeId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      basic: params.basic,
      workingDays: params.workingDays,
      overtimeHours: params.overtimeHours,
    });
    warnings.push(...ot.warnings);

    const bonusSvc = createBonusService(companyId);
    const incentiveSvc = createIncentiveService(companyId);
    const commissionSvc = createCommissionService(companyId);
    const allowanceSvc = createAllowanceService(companyId);
    const productionSvc = createProductionIncentiveService(companyId);
    const performanceSvc = createPerformanceRewardService(companyId);

    const [bonus, incentive, commission, allowance, production, performance] = await Promise.all([
      bonusSvc.calculateForPeriod(params.employeeId, params.periodStart, params.periodEnd, context),
      incentiveSvc.calculateForPeriod(params.employeeId, params.periodStart, params.periodEnd, context),
      commissionSvc.calculateForPeriod(params.employeeId, params.periodStart, params.periodEnd, context),
      allowanceSvc.calculateForPeriod(params.employeeId, params.periodStart, params.periodEnd, context),
      productionSvc.calculateForPeriod(params.employeeId, params.periodStart, params.periodEnd),
      performanceSvc.calculateForPeriod(params.employeeId, params.periodStart, params.periodEnd),
    ]);

    warnings.push(...bonus.warnings, ...incentive.warnings, ...commission.warnings, ...allowance.warnings, ...production.warnings, ...performance.warnings);

    const breakdown = {
      overtime: ot.amount,
      bonus: bonus.amount,
      incentive: incentive.amount,
      commission: commission.amount,
      allowance: allowance.amount,
      production: production.amount,
      performance: performance.amount,
      total: round2(
        ot.amount + bonus.amount + incentive.amount + commission.amount + allowance.amount + production.amount + performance.amount,
      ),
    };

    const earningsContext = {
      OVERTIME: breakdown.overtime,
      OT: breakdown.overtime,
      BONUS: breakdown.bonus,
      INCENTIVE: breakdown.incentive,
      COMMISSION: breakdown.commission,
      ALLOWANCE: breakdown.allowance,
      PRODUCTION_INCENTIVE: breakdown.production,
      PERFORMANCE_REWARD: breakdown.performance,
      OVERTIME_HOURS: ot.otHours,
    };

    const components = [
      { code: "OVERTIME", name: "Overtime Pay", amount: breakdown.overtime },
      { code: "BONUS", name: "Bonus", amount: breakdown.bonus },
      { code: "INCENTIVE", name: "Incentive", amount: breakdown.incentive },
      { code: "COMMISSION", name: "Commission", amount: breakdown.commission },
      { code: "ALLOWANCE", name: "Allowance", amount: breakdown.allowance },
      { code: "PRODUCTION_INCENTIVE", name: "Production Incentive", amount: breakdown.production },
      { code: "PERFORMANCE_REWARD", name: "Performance Reward", amount: breakdown.performance },
    ].filter((c) => c.amount > 0);

    return {
      breakdown,
      context: earningsContext,
      components,
      warnings,
      metadata: { overtimeHours: ot.otHours, holidayOtHours: ot.holidayOtHours, nightOtHours: ot.nightOtHours },
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createEarningsOrchestratorService(companyId: string) {
  return new EarningsOrchestratorService(companyId);
}
