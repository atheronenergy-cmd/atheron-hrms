import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";

export type OrganizationAuditEvent =
  | "company_created"
  | "company_updated"
  | "branch_created"
  | "branch_updated"
  | "branch_deactivated"
  | "department_created"
  | "department_updated"
  | "department_deactivated"
  | "designation_created"
  | "designation_updated"
  | "designation_deactivated"
  | "holiday_created"
  | "holiday_updated"
  | "holiday_deleted"
  | "policy_created"
  | "policy_updated"
  | "schedule_created"
  | "schedule_updated"
  | "settings_updated";

export async function recordOrganizationAudit(
  event: OrganizationAuditEvent,
  params: {
    companyId?: string | null;
    actorUserId?: string;
    entityId?: string;
    entityType: string;
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
      : "update";

  await auditLogger.log({
    companyId: params.companyId ?? undefined,
    userId: params.actorUserId,
    action,
    entityType: params.entityType,
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
      entityType: params.entityType,
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
