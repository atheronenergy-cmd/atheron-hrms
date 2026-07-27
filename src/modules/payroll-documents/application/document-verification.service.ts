import { createHash } from "crypto";

import QRCode from "qrcode";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { PayrollDocumentType } from "@prisma/client";

export class DocumentVerificationService extends BaseRepository {
  async create(params: {
    documentNumber: string;
    documentType: PayrollDocumentType;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }) {
    const companyId = this.requireCompanyId();
    const verificationHash = createHash("sha256")
      .update(`${params.documentNumber}:${params.entityId}:${JSON.stringify(params.payload)}`)
      .digest("hex");
    const qrCodeData = await QRCode.toDataURL(
      JSON.stringify({ documentNumber: params.documentNumber, hash: verificationHash, type: params.documentType }),
    );

    return prisma.payrollDocumentVerification.create({
      data: {
        companyId,
        documentNumber: params.documentNumber,
        documentType: params.documentType,
        entityType: params.entityType,
        entityId: params.entityId,
        verificationHash,
        qrCodeData,
      },
    });
  }

  async verify(documentNumber: string, verificationHash?: string) {
    const companyId = this.requireCompanyId();
    const row = await prisma.payrollDocumentVerification.findFirst({
      where: { companyId, documentNumber, isValid: true },
    });
    if (!row) return { valid: false, message: "Document not found" };
    if (verificationHash && row.verificationHash !== verificationHash) {
      return { valid: false, message: "Verification hash mismatch" };
    }
    await prisma.payrollDocumentVerification.update({
      where: { id: row.id },
      data: { verifiedAt: new Date() },
    });
    return {
      valid: true,
      documentType: row.documentType,
      entityType: row.entityType,
      entityId: row.entityId,
      verifiedAt: new Date().toISOString(),
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createDocumentVerificationService(companyId: string) {
  return new DocumentVerificationService(companyId);
}
