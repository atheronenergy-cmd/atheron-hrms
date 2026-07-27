import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";

export type RbacAuditEvent =
  | "role_created"
  | "role_updated"
  | "role_deleted"
  | "role_cloned"
  | "permission_changed"
  | "role_assigned"
  | "role_removed";

export async function recordRbacAudit(
  event: RbacAuditEvent,
  params: {
    companyId?: string | null;
    userId?: string;
    roleId?: string;
    targetUserId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const action =
    event.includes("assigned") || event.includes("removed")
      ? "update"
      : event.includes("deleted")
        ? "delete"
        : "create";

  await auditLogger.log({
    companyId: params.companyId ?? undefined,
    userId: params.userId,
    action,
    entityType: "rbac",
    entityId: params.roleId ?? params.targetUserId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: { event, ...params.metadata },
  });

  await prisma.activityLog.create({
    data: {
      companyId: params.companyId ?? undefined,
      userId: params.userId,
      action: event,
      entityType: "rbac",
      entityId: params.roleId ?? params.targetUserId,
      metadata: (params.metadata ?? {}) as object,
    },
  });
}
