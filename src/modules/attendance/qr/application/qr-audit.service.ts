import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";

export type QrAuditEvent =
  | "qr_generated"
  | "qr_scanned"
  | "qr_revoked"
  | "qr_invalid_scan"
  | "qr_fraud_attempt";

export async function recordQrAudit(
  event: QrAuditEvent,
  params: {
    companyId: string;
    actorUserId?: string;
    employeeId?: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await auditLogger.log({
    companyId: params.companyId,
    userId: params.actorUserId,
    action: event.includes("generated") || event.includes("scanned") ? "create" : event.includes("invalid") || event.includes("fraud") ? "update" : "delete",
    entityType: "qr_attendance",
    entityId: params.entityId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: { event, employeeId: params.employeeId, ...params.metadata },
  });

  await prisma.activityLog.create({
    data: {
      companyId: params.companyId,
      userId: params.actorUserId,
      action: event,
      entityType: "qr_attendance",
      entityId: params.entityId,
      metadata: { employeeId: params.employeeId, ...(params.metadata ?? {}) } as object,
    },
  });
}

export async function getQrActorMeta() {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}
