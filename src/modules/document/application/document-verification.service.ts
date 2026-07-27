import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { VerifyDocumentInput } from "@/modules/document/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class DocumentVerificationService extends BaseRepository {
  async verify(input: VerifyDocumentInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const doc = await prisma.employeeDocument.findFirst({
      where: { id: input.id, companyId, deletedAt: null },
    });
    if (!doc) throw new NotFoundError("Document", input.id);

    const verificationStatus = input.status === "verified" ? "verified" : "rejected";

    await prisma.$transaction([
      prisma.employeeDocument.update({
        where: { id: input.id, version: input.version },
        data: {
          verificationStatus,
          verified: input.status === "verified",
          verifiedBy: actorUserId,
          verifiedAt: new Date(),
          updatedBy: actorUserId,
          version: { increment: 1 },
        },
      }),
      prisma.documentVerification.create({
        data: {
          documentId: input.id,
          status: verificationStatus,
          notes: input.notes ?? null,
          reviewedBy: actorUserId,
        },
      }),
    ]);
  }

  async getHistory(documentId: string) {
    const companyId = this.requireCompanyId();
    const doc = await prisma.employeeDocument.findFirst({
      where: { id: documentId, companyId, deletedAt: null },
    });
    if (!doc) throw new NotFoundError("Document", documentId);

    return prisma.documentVerification.findMany({
      where: { documentId },
      orderBy: { reviewedAt: "desc" },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createDocumentVerificationService(companyId: string) {
  return new DocumentVerificationService(companyId);
}
