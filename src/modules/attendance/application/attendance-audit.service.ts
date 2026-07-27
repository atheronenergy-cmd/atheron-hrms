import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";

export type AttendanceAuditEvent =
  | "attendance_created"
  | "attendance_modified"
  | "correction_requested"
  | "correction_approved"
  | "manual_entry_created"
  | "punch_recorded";

export async function recordAttendanceAudit(
  event: AttendanceAuditEvent,
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
    action: event.includes("created") || event.includes("recorded") ? "create" : event.includes("requested") ? "create" : "update",
    entityType: "attendance",
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
      entityType: "attendance",
      entityId: params.entityId ?? params.employeeId,
      metadata: { employeeId: params.employeeId, ...(params.metadata ?? {}) } as object,
    },
  });
}

export async function getAttendanceActorMeta() {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}
