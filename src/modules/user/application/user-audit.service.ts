import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";

export type UserAuditEvent =
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "user_status_changed"
  | "user_role_assigned"
  | "user_role_removed"
  | "user_password_reset"
  | "user_invitation_sent"
  | "user_invitation_accepted"
  | "user_sessions_revoked";

export async function recordUserAudit(
  event: UserAuditEvent,
  params: {
    companyId?: string | null;
    actorUserId?: string;
    targetUserId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const action =
    event.includes("deleted") ? "delete" : event.includes("created") ? "create" : "update";

  await auditLogger.log({
    companyId: params.companyId ?? undefined,
    userId: params.actorUserId,
    action,
    entityType: "user",
    entityId: params.targetUserId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: { event, ...params.metadata },
  });

  await prisma.activityLog.create({
    data: {
      companyId: params.companyId ?? undefined,
      userId: params.actorUserId,
      action: event,
      entityType: "user",
      entityId: params.targetUserId,
      metadata: (params.metadata ?? {}) as object,
    },
  });
}
