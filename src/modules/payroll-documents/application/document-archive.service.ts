import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createPayrollDocumentAuditService } from "@/modules/payroll-documents/application/payroll-document-audit.service";

export class DocumentArchiveService extends BaseRepository {
  async archive(params: {
    payrollId?: string;
    payslipId?: string;
    documentId?: string;
    archiveType: string;
    fileId: string;
    hash: string;
    versionNumber?: number;
    actorUserId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const companyId = this.requireCompanyId();
    const row = await prisma.payrollArchive.create({
      data: {
        companyId,
        payrollId: params.payrollId ?? null,
        payslipId: params.payslipId ?? null,
        documentId: params.documentId ?? null,
        archiveType: params.archiveType,
        fileId: params.fileId,
        hash: params.hash,
        versionNumber: params.versionNumber ?? 1,
        status: "immutable",
        archivedBy: params.actorUserId ?? null,
        metadata: (params.metadata ?? {}) as object,
      },
    });
    await createPayrollDocumentAuditService(companyId).record({
      entityType: "payroll_archive",
      entityId: row.id,
      action: "document_archived",
      actorUserId: params.actorUserId,
      metadata: { archiveType: params.archiveType, hash: params.hash },
    });
    return row;
  }

  async list(params?: { payrollId?: string; limit?: number }) {
    return prisma.payrollArchive.findMany({
      where: {
        companyId: this.requireCompanyId(),
        ...(params?.payrollId ? { payrollId: params.payrollId } : {}),
      },
      orderBy: { archivedAt: "desc" },
      take: params?.limit ?? 50,
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createDocumentArchiveService(companyId: string) {
  return new DocumentArchiveService(companyId);
}
