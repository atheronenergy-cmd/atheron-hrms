import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { DEFAULT_QR_POLICY } from "@/modules/attendance/qr/domain/types";
import type { QrPolicyInput } from "@/modules/attendance/qr/validation/schemas";

export class QRCodePolicyService extends BaseRepository {
  async getDefault(branchId?: string) {
    const companyId = this.requireCompanyId();
    const policy = await prisma.qrPolicy.findFirst({
      where: {
        companyId,
        status: "active",
        ...(branchId ? { branchId } : { isDefault: true }),
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    if (!policy) return { ...DEFAULT_QR_POLICY, id: null as string | null };
    return {
      id: policy.id,
      validationMode: policy.validationMode,
      defaultExpirySeconds: policy.defaultExpirySeconds,
      requireBranchMatch: policy.requireBranchMatch,
      requireShiftMatch: policy.requireShiftMatch,
      requireDepartmentMatch: policy.requireDepartmentMatch,
      singleUse: policy.singleUse,
      maxScansPerEmployee: policy.maxScansPerEmployee,
    };
  }

  async create(input: QrPolicyInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    if (input.isDefault) {
      await prisma.qrPolicy.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false, updatedBy: actorUserId },
      });
    }
    return prisma.qrPolicy.create({
      data: {
        companyId,
        branchId: input.branchId ?? null,
        name: input.name,
        validationMode: input.validationMode,
        defaultExpirySeconds: input.defaultExpirySeconds,
        requireBranchMatch: input.requireBranchMatch,
        requireShiftMatch: input.requireShiftMatch,
        requireDepartmentMatch: input.requireDepartmentMatch,
        singleUse: input.singleUse,
        maxScansPerEmployee: input.maxScansPerEmployee ?? null,
        isDefault: input.isDefault,
        createdBy: actorUserId,
      },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createQRCodePolicyService(companyId: string) {
  return new QRCodePolicyService(companyId);
}
