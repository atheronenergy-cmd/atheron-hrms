import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createStatutoryAuditService } from "@/modules/statutory/application/statutory-audit.service";
import { createStatutoryConfigurationService } from "@/modules/statutory/application/statutory-configuration.service";
import { createStatutoryOrchestratorService } from "@/modules/statutory/application/statutory-orchestrator.service";
import { createStatutoryReportService } from "@/modules/statutory/application/statutory-report.service";
import type { EmployeeStatutoryProfileInput, InvestmentDeclarationInput } from "@/modules/statutory/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class StatutoryService extends BaseRepository {
  async upsertEmployeeProfile(input: EmployeeStatutoryProfileInput, userId?: string) {
    const companyId = this.requireCompanyId();
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError("Employee", input.employeeId);

    const profile = await prisma.employeeStatutoryProfile.upsert({
      where: { employeeId: input.employeeId },
      create: {
        companyId,
        employeeId: input.employeeId,
        pfEnabled: input.pfEnabled ?? true,
        esiEnabled: input.esiEnabled ?? false,
        ptEnabled: input.ptEnabled ?? false,
        tdsEnabled: input.tdsEnabled ?? true,
        taxRegime: input.taxRegime,
        financialYearCode: input.financialYearCode,
        vpfPercentage: input.vpfPercentage,
        pfEmployeeRateOverride: input.pfEmployeeRateOverride,
        pfEmployerRateOverride: input.pfEmployerRateOverride,
        esiEmployeeRateOverride: input.esiEmployeeRateOverride,
        esiEmployerRateOverride: input.esiEmployerRateOverride,
        ptExempt: input.ptExempt ?? false,
        exemptions: (input.exemptions ?? []) as object,
        createdBy: userId,
      },
      update: {
        pfEnabled: input.pfEnabled,
        esiEnabled: input.esiEnabled,
        ptEnabled: input.ptEnabled,
        tdsEnabled: input.tdsEnabled,
        taxRegime: input.taxRegime,
        financialYearCode: input.financialYearCode,
        vpfPercentage: input.vpfPercentage,
        pfEmployeeRateOverride: input.pfEmployeeRateOverride,
        pfEmployerRateOverride: input.pfEmployerRateOverride,
        esiEmployeeRateOverride: input.esiEmployeeRateOverride,
        esiEmployerRateOverride: input.esiEmployerRateOverride,
        ptExempt: input.ptExempt,
        exemptions: input.exemptions ? (input.exemptions as object) : undefined,
        updatedBy: userId,
      },
    });
    await createStatutoryAuditService(companyId).log("EmployeeStatutoryProfile", profile.id, "updated", userId);
    return profile;
  }

  async upsertInvestmentDeclaration(input: InvestmentDeclarationInput, userId?: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.investmentDeclaration.findFirst({
      where: { employeeId: input.employeeId, financialYearId: input.financialYearId, deletedAt: null },
    });
    const data = {
      section80C: input.section80C ?? 0,
      section80D: input.section80D ?? 0,
      homeLoanInterest: input.homeLoanInterest ?? 0,
      nps: input.nps ?? 0,
      educationLoan: input.educationLoan ?? 0,
      otherDeductions: input.otherDeductions ?? {},
      proofDocuments: input.proofDocuments ?? [],
      remarks: input.remarks,
      updatedBy: userId,
    };
    const decl = existing
      ? await prisma.investmentDeclaration.update({ where: { id: existing.id }, data })
      : await prisma.investmentDeclaration.create({
          data: { companyId, employeeId: input.employeeId, financialYearId: input.financialYearId, ...data, createdBy: userId },
        });
    await createStatutoryAuditService(companyId).log("InvestmentDeclaration", decl.id, "updated", userId);
    return decl;
  }

  async listInvestmentDeclarations(financialYearId?: string) {
    return prisma.investmentDeclaration.findMany({
      where: {
        companyId: this.requireCompanyId(),
        deletedAt: null,
        ...(financialYearId ? { financialYearId } : {}),
      },
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function getStatutoryServices(companyId: string) {
  return {
    statutory: new StatutoryService(companyId),
    config: createStatutoryConfigurationService(companyId),
    orchestrator: createStatutoryOrchestratorService(companyId),
    report: createStatutoryReportService(companyId),
    audit: createStatutoryAuditService(companyId),
  };
}
