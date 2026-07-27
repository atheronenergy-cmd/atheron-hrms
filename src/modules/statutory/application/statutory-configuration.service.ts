import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type {
  ESIConfigInput,
  IncomeTaxConfigInput,
  PFConfigInput,
  PTConfigInput,
  StatutoryDashboardStats,
} from "@/modules/statutory/domain/types";
import type {
  ESIConfigurationInput,
  FinancialYearInput,
  IncomeTaxConfigurationInput,
  PFConfigurationInput,
  ProfessionalTaxConfigurationInput,
} from "@/modules/statutory/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import { createStatutoryAuditService } from "@/modules/statutory/application/statutory-audit.service";

function toNum(v: unknown) {
  return Number(v);
}

export class StatutoryConfigurationService extends BaseRepository {
  async listFinancialYears() {
    return prisma.financialYear.findMany({
      where: { companyId: this.requireCompanyId(), deletedAt: null },
      orderBy: { startDate: "desc" },
    });
  }

  async getFinancialYearForDate(date: Date) {
    return prisma.financialYear.findFirst({
      where: {
        companyId: this.requireCompanyId(),
        deletedAt: null,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { startDate: "desc" },
    });
  }

  async createFinancialYear(input: FinancialYearInput, userId?: string) {
    const companyId = this.requireCompanyId();
    if (input.isCurrent) {
      await prisma.financialYear.updateMany({
        where: { companyId, deletedAt: null },
        data: { isCurrent: false },
      });
    }
    const fy = await prisma.financialYear.create({
      data: {
        companyId,
        code: input.code,
        label: input.label,
        startDate: input.startDate,
        endDate: input.endDate,
        isCurrent: input.isCurrent ?? false,
        remarks: input.remarks,
        createdBy: userId,
      },
    });
    await createStatutoryAuditService(companyId).log("FinancialYear", fy.id, "created", userId, { code: fy.code });
    return fy;
  }

  private async ensureRule(ruleType: "pf" | "esi" | "professional_tax" | "income_tax", code: string, name: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.statutoryRule.findFirst({
      where: { companyId, code, deletedAt: null },
    });
    if (existing) return existing;
    return prisma.statutoryRule.create({
      data: { companyId, ruleType, code, name, status: "active" },
    });
  }

  private async activateVersion(statutoryRuleId: string, financialYearId: string, effectiveFrom: Date) {
    const companyId = this.requireCompanyId();
    await prisma.statutoryVersion.updateMany({
      where: { companyId, statutoryRuleId, financialYearId, status: "active", deletedAt: null },
      data: { status: "archived", effectiveTo: effectiveFrom },
    });
    const last = await prisma.statutoryVersion.findFirst({
      where: { companyId, statutoryRuleId, financialYearId, deletedAt: null },
      orderBy: { versionNumber: "desc" },
    });
    return (last?.versionNumber ?? 0) + 1;
  }

  async upsertPFConfig(input: PFConfigurationInput, userId?: string) {
    const companyId = this.requireCompanyId();
    const rule = await this.ensureRule("pf", "PF", "Provident Fund");
    const versionNumber = await this.activateVersion(rule.id, input.financialYearId, new Date());
    const fy = await prisma.financialYear.findFirst({ where: { id: input.financialYearId, companyId } });
    if (!fy) throw new NotFoundError("FinancialYear", input.financialYearId);

    const version = await prisma.statutoryVersion.create({
      data: {
        companyId,
        statutoryRuleId: rule.id,
        financialYearId: input.financialYearId,
        versionNumber,
        effectiveFrom: fy.startDate,
        status: "active",
        createdBy: userId,
        pfConfig: {
          create: {
            companyId,
            employeeContributionRate: input.employeeContributionRate,
            employerContributionRate: input.employerContributionRate,
            epsRate: input.epsRate,
            adminChargeRate: input.adminChargeRate,
            edliRate: input.edliRate ?? 0,
            edliAdminRate: input.edliAdminRate ?? 0,
            wageCeiling: input.wageCeiling,
            vpfAllowed: input.vpfAllowed ?? true,
            exemptions: (input.exemptions ?? []) as object,
          },
        },
      },
      include: { pfConfig: true },
    });
    await createStatutoryAuditService(companyId).log("PFConfiguration", version.id, "updated", userId);
    return version;
  }

  async upsertESIConfig(input: ESIConfigurationInput, userId?: string) {
    const companyId = this.requireCompanyId();
    const rule = await this.ensureRule("esi", "ESI", "Employee State Insurance");
    const versionNumber = await this.activateVersion(rule.id, input.financialYearId, new Date());
    const fy = await prisma.financialYear.findFirst({ where: { id: input.financialYearId, companyId } });
    if (!fy) throw new NotFoundError("FinancialYear", input.financialYearId);

    const version = await prisma.statutoryVersion.create({
      data: {
        companyId,
        statutoryRuleId: rule.id,
        financialYearId: input.financialYearId,
        versionNumber,
        effectiveFrom: fy.startDate,
        status: "active",
        createdBy: userId,
        esiConfig: {
          create: {
            companyId,
            employeeRate: input.employeeRate,
            employerRate: input.employerRate,
            eligibilityCeiling: input.eligibilityCeiling,
            exemptions: (input.exemptions ?? []) as object,
          },
        },
      },
      include: { esiConfig: true },
    });
    await createStatutoryAuditService(companyId).log("ESIConfiguration", version.id, "updated", userId);
    return version;
  }

  async upsertPTConfig(input: ProfessionalTaxConfigurationInput, userId?: string) {
    const companyId = this.requireCompanyId();
    const rule = await this.ensureRule("professional_tax", `PT_${input.stateCode}`, `Professional Tax ${input.stateName}`);
    const versionNumber = await this.activateVersion(rule.id, input.financialYearId, new Date());
    const fy = await prisma.financialYear.findFirst({ where: { id: input.financialYearId, companyId } });
    if (!fy) throw new NotFoundError("FinancialYear", input.financialYearId);

    const version = await prisma.statutoryVersion.create({
      data: {
        companyId,
        statutoryRuleId: rule.id,
        financialYearId: input.financialYearId,
        versionNumber,
        effectiveFrom: fy.startDate,
        status: "active",
        createdBy: userId,
        ptConfig: {
          create: {
            companyId,
            stateCode: input.stateCode,
            stateName: input.stateName,
            slabs: input.slabs as object,
            maxAmount: input.maxAmount ?? 0,
            exemptions: (input.exemptions ?? []) as object,
          },
        },
      },
      include: { ptConfig: true },
    });
    await createStatutoryAuditService(companyId).log("ProfessionalTaxConfiguration", version.id, "updated", userId);
    return version;
  }

  async upsertIncomeTaxConfig(input: IncomeTaxConfigurationInput, userId?: string) {
    const companyId = this.requireCompanyId();
    const rule = await this.ensureRule("income_tax", `IT_${input.regime.toUpperCase()}`, `Income Tax ${input.regime}`);
    const versionNumber = await this.activateVersion(rule.id, input.financialYearId, new Date());
    const fy = await prisma.financialYear.findFirst({ where: { id: input.financialYearId, companyId } });
    if (!fy) throw new NotFoundError("FinancialYear", input.financialYearId);

    const version = await prisma.statutoryVersion.create({
      data: {
        companyId,
        statutoryRuleId: rule.id,
        financialYearId: input.financialYearId,
        versionNumber,
        effectiveFrom: fy.startDate,
        status: "active",
        createdBy: userId,
        incomeTaxConfig: {
          create: {
            companyId,
            regime: input.regime,
            slabs: input.slabs as object,
            standardDeduction: input.standardDeduction,
            rebateLimit: input.rebateLimit ?? 0,
            rebateAmount: input.rebateAmount ?? 0,
            surchargeSlabs: input.surchargeSlabs ?? [],
            cessRate: input.cessRate,
          },
        },
      },
      include: { incomeTaxConfig: true },
    });
    await createStatutoryAuditService(companyId).log("IncomeTaxConfiguration", version.id, "updated", userId);
    return version;
  }

  async getActiveConfigs(financialYearId: string, stateCode?: string) {
    const companyId = this.requireCompanyId();
    const versions = await prisma.statutoryVersion.findMany({
      where: { companyId, financialYearId, status: "active", deletedAt: null },
      include: { pfConfig: true, esiConfig: true, ptConfig: true, incomeTaxConfig: true, statutoryRule: true },
    });

    const pfVersion = versions.find((v) => v.statutoryRule.ruleType === "pf");
    const esiVersion = versions.find((v) => v.statutoryRule.ruleType === "esi");
    const ptVersion = versions.find(
      (v) => v.statutoryRule.ruleType === "professional_tax" && (!stateCode || v.ptConfig?.stateCode === stateCode),
    );
    const itOld = versions.find((v) => v.incomeTaxConfig?.regime === "old");
    const itNew = versions.find((v) => v.incomeTaxConfig?.regime === "new");

    const mapPf = (cfg: NonNullable<typeof pfVersion>["pfConfig"]): PFConfigInput | null =>
      cfg
        ? {
            employeeContributionRate: toNum(cfg.employeeContributionRate),
            employerContributionRate: toNum(cfg.employerContributionRate),
            epsRate: toNum(cfg.epsRate),
            adminChargeRate: toNum(cfg.adminChargeRate),
            edliRate: toNum(cfg.edliRate),
            edliAdminRate: toNum(cfg.edliAdminRate),
            wageCeiling: toNum(cfg.wageCeiling),
            vpfAllowed: cfg.vpfAllowed,
          }
        : null;

    const mapEsi = (cfg: NonNullable<typeof esiVersion>["esiConfig"]): ESIConfigInput | null =>
      cfg
        ? {
            employeeRate: toNum(cfg.employeeRate),
            employerRate: toNum(cfg.employerRate),
            eligibilityCeiling: toNum(cfg.eligibilityCeiling),
          }
        : null;

    const mapPt = (cfg: NonNullable<typeof ptVersion>["ptConfig"]): PTConfigInput | null =>
      cfg
        ? {
            stateCode: cfg.stateCode,
            stateName: cfg.stateName,
            slabs: cfg.slabs as PTConfigInput["slabs"],
            maxAmount: toNum(cfg.maxAmount),
          }
        : null;

    const mapIt = (cfg: NonNullable<typeof itOld>["incomeTaxConfig"]): IncomeTaxConfigInput | null =>
      cfg
        ? {
            regime: cfg.regime,
            slabs: cfg.slabs as IncomeTaxConfigInput["slabs"],
            standardDeduction: toNum(cfg.standardDeduction),
            rebateLimit: toNum(cfg.rebateLimit),
            rebateAmount: toNum(cfg.rebateAmount),
            surchargeSlabs: cfg.surchargeSlabs as IncomeTaxConfigInput["surchargeSlabs"],
            cessRate: toNum(cfg.cessRate),
          }
        : null;

    return {
      pf: pfVersion?.pfConfig ? mapPf(pfVersion.pfConfig) : null,
      esi: esiVersion?.esiConfig ? mapEsi(esiVersion.esiConfig) : null,
      pt: ptVersion?.ptConfig ? mapPt(ptVersion.ptConfig) : null,
      incomeTaxOld: itOld?.incomeTaxConfig ? mapIt(itOld.incomeTaxConfig) : null,
      incomeTaxNew: itNew?.incomeTaxConfig ? mapIt(itNew.incomeTaxConfig) : null,
    };
  }

  async getDashboardStats(): Promise<StatutoryDashboardStats> {
    const companyId = this.requireCompanyId();
    const [currentFy, profiles, pending] = await Promise.all([
      prisma.financialYear.findFirst({ where: { companyId, isCurrent: true, deletedAt: null } }),
      prisma.employeeStatutoryProfile.count({ where: { companyId, status: "active" } }),
      prisma.investmentDeclaration.count({
        where: { companyId, declarationStatus: { in: ["draft", "submitted"] }, deletedAt: null },
      }),
    ]);
    const configs = currentFy ? await this.getActiveConfigs(currentFy.id) : null;
    return {
      activeFinancialYear: currentFy?.code ?? null,
      pfConfigured: !!configs?.pf,
      esiConfigured: !!configs?.esi,
      ptConfigured: !!configs?.pt,
      tdsConfigured: !!(configs?.incomeTaxOld || configs?.incomeTaxNew),
      pendingDeclarations: pending,
      employeesWithProfile: profiles,
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createStatutoryConfigurationService(companyId: string) {
  return new StatutoryConfigurationService(companyId);
}
