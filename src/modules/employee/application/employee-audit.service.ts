import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";

export type EmployeeAuditEvent =
  | "employee_created"
  | "employee_updated"
  | "employee_deleted"
  | "employee_restored"
  | "employee_deactivated"
  | "employee_reactivated"
  | "employee_status_changed"
  | "employee_department_changed"
  | "employee_exported";

export async function recordEmployeeAudit(
  event: EmployeeAuditEvent,
  params: {
    companyId?: string | null;
    actorUserId?: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
) {
  const action = event.includes("created")
    ? "create"
    : event.includes("deleted") || event.includes("deactivated")
      ? "delete"
      : event.includes("exported")
        ? "export"
        : "update";

  await auditLogger.log({
    companyId: params.companyId ?? undefined,
    userId: params.actorUserId,
    action,
    entityType: "employee",
    entityId: params.entityId,
    oldValues: params.oldValues,
    newValues: params.newValues,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: { event, ...params.metadata },
  });

  await prisma.activityLog.create({
    data: {
      companyId: params.companyId ?? undefined,
      userId: params.actorUserId,
      action: event,
      entityType: "employee",
      entityId: params.entityId,
      metadata: (params.metadata ?? {}) as object,
    },
  });
}

export async function getActorMeta() {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}
