import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";

export type GpsAuditEvent =
  | "gps_attendance_created"
  | "gps_attendance_invalid"
  | "gps_override_used"
  | "location_viewed";

export async function recordGpsAudit(
  event: GpsAuditEvent,
  params: {
    companyId: string;
    employeeId: string;
    actorUserId?: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await auditLogger.log({
    companyId: params.companyId,
    userId: params.actorUserId,
    action: event.includes("created") ? "create" : event.includes("viewed") ? "view" : "update",
    entityType: "gps_attendance",
    entityId: params.entityId ?? params.employeeId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: { event, employeeId: params.employeeId, ...params.metadata },
  });

  await prisma.activityLog.create({
    data: {
      companyId: params.companyId,
      userId: params.actorUserId,
      action: event,
      entityType: "gps_attendance",
      entityId: params.entityId ?? params.employeeId,
      metadata: { employeeId: params.employeeId, ...(params.metadata ?? {}) } as object,
    },
  });
}

export async function getGpsActorMeta() {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}
