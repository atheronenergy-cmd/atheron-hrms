import type {
  AllowanceRule,
  BonusRule,
  CommissionRule,
  IncentiveRule,
  OvertimeRule,
} from "@prisma/client";

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
import { createEarningsAuditService } from "@/modules/earnings/application/earnings-audit.service";
import { createEarningsOrchestratorService } from "@/modules/earnings/application/earnings-orchestrator.service";
import { createEarningsReportService } from "@/modules/earnings/application/earnings-report.service";
import { createOvertimeCalculationService } from "@/modules/earnings/application/overtime-calculation.service";
import { createOvertimeService } from "@/modules/earnings/application/overtime.service";

export class EarningsService extends BaseRepository {
  async listRules(type: "bonus"): Promise<BonusRule[]>;
  async listRules(type: "incentive"): Promise<IncentiveRule[]>;
  async listRules(type: "commission"): Promise<CommissionRule[]>;
  async listRules(type: "allowance"): Promise<AllowanceRule[]>;
  async listRules(type: "overtime"): Promise<OvertimeRule[]>;
  async listRules(type: "bonus" | "incentive" | "commission" | "allowance" | "overtime") {
    const companyId = this.requireCompanyId();
    switch (type) {
      case "bonus":
        return prisma.bonusRule.findMany({ where: { companyId, deletedAt: null }, orderBy: { updatedAt: "desc" } });
      case "incentive":
        return prisma.incentiveRule.findMany({ where: { companyId, deletedAt: null }, orderBy: { updatedAt: "desc" } });
      case "commission":
        return prisma.commissionRule.findMany({ where: { companyId, deletedAt: null }, orderBy: { updatedAt: "desc" } });
      case "allowance":
        return prisma.allowanceRule.findMany({ where: { companyId, deletedAt: null }, orderBy: { updatedAt: "desc" } });
      case "overtime":
        return prisma.overtimeRule.findMany({ where: { companyId, deletedAt: null }, orderBy: { updatedAt: "desc" } });
    }
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function getEarningsServices(companyId: string) {
  return {
    earnings: new EarningsService(companyId),
    overtime: createOvertimeService(companyId),
    overtimeCalculation: createOvertimeCalculationService(companyId),
    bonus: createBonusService(companyId),
    incentive: createIncentiveService(companyId),
    commission: createCommissionService(companyId),
    allowance: createAllowanceService(companyId),
    production: createProductionIncentiveService(companyId),
    performance: createPerformanceRewardService(companyId),
    orchestrator: createEarningsOrchestratorService(companyId),
    report: createEarningsReportService(companyId),
    audit: createEarningsAuditService(companyId),
  };
}
