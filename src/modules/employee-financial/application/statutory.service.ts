import { prisma } from "@/infrastructure/database/prisma-client";
import { BaseRepository } from "@/infrastructure/database/base-repository";
import { encryptionService } from "@/modules/employee-financial/application/encryption.service";
import type { StatutoryDetailItem } from "@/modules/employee-financial/domain/types";
import type { StatutoryInput } from "@/modules/employee-financial/validation/schemas";
import { NotFoundError } from "@/shared/errors";

type ViewOptions = { canViewSensitive: boolean };

export class StatutoryService extends BaseRepository {
  async getByEmployee(employeeId: string, view: ViewOptions): Promise<StatutoryDetailItem | null> {
    const companyId = this.requireCompanyId();
    const row = await prisma.employeeStatutoryDetail.findFirst({
      where: { companyId, employeeId, status: "active" },
    });
    if (!row) return null;
    return this.toItem(row, view);
  }

  async upsert(input: StatutoryInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    const data = {
      pfNumberEnc: encryptionService.encrypt(input.pfNumber),
      uanNumberEnc: encryptionService.encrypt(input.uanNumber),
      esiNumberEnc: encryptionService.encrypt(input.esiNumber),
      esiEligible: input.esiEligible,
      pfJoiningDate: input.pfJoiningDate ?? null,
      pfContributionType: input.pfContributionType ?? null,
      professionalTaxApplicable: input.professionalTaxApplicable,
      lwfApplicable: input.lwfApplicable,
      updatedBy: actorUserId,
    };

    return prisma.employeeStatutoryDetail.upsert({
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
      pfNumberEnc: string | null;
      uanNumberEnc: string | null;
      esiNumberEnc: string | null;
      esiEligible: boolean;
      pfJoiningDate: Date | null;
      pfContributionType: string | null;
      professionalTaxApplicable: boolean;
      lwfApplicable: boolean;
      version: number;
    },
    view: ViewOptions,
  ): StatutoryDetailItem {
    return {
      id: r.id,
      employeeId: r.employeeId,
      pfNumber: this.present(r.pfNumberEnc, "generic", view),
      uanNumber: this.present(r.uanNumberEnc, "generic", view),
      esiNumber: this.present(r.esiNumberEnc, "generic", view),
      esiEligible: r.esiEligible,
      pfJoiningDate: r.pfJoiningDate?.toISOString().slice(0, 10) ?? null,
      pfContributionType: r.pfContributionType,
      professionalTaxApplicable: r.professionalTaxApplicable,
      lwfApplicable: r.lwfApplicable,
      version: r.version,
    };
  }

  private present(ciphertext: string | null, field: "generic", view: ViewOptions) {
    if (!ciphertext) return null;
    const plain = encryptionService.decrypt(ciphertext, view.canViewSensitive);
    return plain ?? encryptionService.mask("********", field, false);
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

export function createStatutoryService(companyId: string) {
  return new StatutoryService(companyId);
}
