import type { DocumentAccessAction } from "@prisma/client";

import { prisma } from "@/infrastructure/database/prisma-client";
import { auditService } from "@/modules/security/application/audit.service";

import { recordDocumentAudit } from "./document-audit.service";

export class DocumentAccessService {
  async logAccess(params: {
    documentId?: string;
    fileId: string;
    userId: string;
    companyId: string;
    action: DocumentAccessAction;
    ipAddress?: string;
    userAgent?: string;
    sensitive?: boolean;
  }) {
    await prisma.documentAccessLog.create({
      data: {
        documentId: params.documentId ?? null,
        fileId: params.fileId,
        userId: params.userId,
        action: params.action,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });

    const event =
      params.action === "download"
        ? "document_downloaded"
        : params.action === "view" || params.action === "preview"
          ? "document_viewed"
          : "document_viewed";

    await recordDocumentAudit(event, {
      companyId: params.companyId,
      actorUserId: params.userId,
      entityId: params.documentId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { fileId: params.fileId, action: params.action },
    });

    if (params.sensitive) {
      await auditService.logSensitiveView({
        userId: params.userId,
        companyId: params.companyId,
        entityType: "employee_document",
        entityId: params.documentId ?? params.fileId,
        field: params.action,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    }
  }
}

export const documentAccessService = new DocumentAccessService();
