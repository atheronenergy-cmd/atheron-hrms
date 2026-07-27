import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";
import { DEFAULT_DOCUMENT_CATEGORIES } from "@/shared/constants/files";

export type DocumentAuditEvent =
  | "document_uploaded"
  | "document_viewed"
  | "document_downloaded"
  | "document_verified"
  | "document_rejected"
  | "document_deleted"
  | "photo_uploaded"
  | "photo_deleted";

export async function recordDocumentAudit(
  event: DocumentAuditEvent,
  params: {
    companyId?: string | null;
    actorUserId?: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const action = event.includes("uploaded")
    ? "create"
    : event.includes("deleted")
      ? "delete"
      : event.includes("downloaded")
        ? "export"
        : event.includes("viewed")
          ? "view"
          : "update";

  await auditLogger.log({
    companyId: params.companyId ?? undefined,
    userId: params.actorUserId,
    action,
    entityType: "employee_document",
    entityId: params.entityId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: { event, ...params.metadata },
  });

  await prisma.activityLog.create({
    data: {
      companyId: params.companyId ?? undefined,
      userId: params.actorUserId,
      action: event,
      entityType: "employee_document",
      entityId: params.entityId,
      metadata: (params.metadata ?? {}) as object,
    },
  });
}

export async function getDocumentActorMeta() {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}

export async function ensureDefaultDocumentCategories(companyId: string) {
  const existing = await prisma.documentCategory.count({
    where: { OR: [{ companyId }, { companyId: null, isSystem: true }] },
  });
  if (existing >= DEFAULT_DOCUMENT_CATEGORIES.length) return;

  for (const cat of DEFAULT_DOCUMENT_CATEGORIES) {
    const found = await prisma.documentCategory.findFirst({
      where: { OR: [{ companyId, code: cat.code }, { companyId: null, code: cat.code, isSystem: true }] },
    });
    if (!found) {
      await prisma.documentCategory.create({
        data: {
          companyId,
          code: cat.code,
          name: cat.name,
          sortOrder: cat.sortOrder,
          isSystem: false,
        },
      });
    }
  }
}
