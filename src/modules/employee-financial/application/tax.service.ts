import { prisma } from "@/infrastructure/database/prisma-client";
import { BaseRepository } from "@/infrastructure/database/base-repository";
import { encryptionService } from "@/modules/employee-financial/application/encryption.service";
import type { TaxProfileItem } from "@/modules/employee-financial/domain/types";
import type { TaxInput } from "@/modules/employee-financial/validation/schemas";
import { NotFoundError } from "@/shared/errors";

type ViewOptions = { canViewSensitive: boolean };

export class TaxService extends BaseRepository {
  async getByEmployee(employeeId: string, view: ViewOptions): Promise<TaxProfileItem | null> {
    const companyId = this.requireCompanyId();
    const row = await prisma.employeeTaxProfile.findFirst({
      where: { companyId, employeeId, status: "active" },
    });
    if (!row) return null;
    return this.toItem(row, view);
  }

  async upsert(input: TaxInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    const data = {
      panNumberEnc: encryptionService.encrypt(input.panNumber?.toUpperCase()),
      taxRegime: input.taxRegime ?? null,
      financialYear: input.financialYear ?? null,
      taxDeclaration: (input.taxDeclaration ?? {}) as object,
      investmentDeclaration: (input.investmentDeclaration ?? {}) as object,
      previousEmployer: (input.previousEmployer ?? {}) as object,
      updatedBy: actorUserId,
    };

    return prisma.employeeTaxProfile.upsert({
      where: { employeeId: input.employeeId },
      create: {
        companyId,
        employeeId: input.employeeId,
        ...data,
        createdBy: actorUserId,
      },
      update: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  private toItem(
    r: {
      id: string;
      employeeId: string;
      panNumberEnc: string | null;
      taxRegime: string | null;
      financialYear: string | null;
      taxDeclaration: unknown;
      investmentDeclaration: unknown;
      previousEmployer: unknown;
      version: number;
    },
    view: ViewOptions,
  ): TaxProfileItem {
    const panPlain = encryptionService.decrypt(r.panNumberEnc, view.canViewSensitive);
    return {
      id: r.id,
      employeeId: r.employeeId,
      panNumber: panPlain ?? (r.panNumberEnc ? encryptionService.mask("ABCDE1234F", "pan", false) : null),
      taxRegime: r.taxRegime,
      financialYear: r.financialYear,
      taxDeclaration: (r.taxDeclaration as Record<string, unknown>) ?? {},
      investmentDeclaration: (r.investmentDeclaration as Record<string, unknown>) ?? {},
      previousEmployer: (r.previousEmployer as Record<string, unknown>) ?? {},
      version: r.version,
    };
  }

  private async assertEmployee(employeeId: string, companyId: string) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
    if (!employee) throw new NotFoundError("Employee", employeeId);
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createTaxService(companyId: string) {
  return new TaxService(companyId);
}
