import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";

export type LeaveAuditEvent =
  | "leave_applied"
  | "leave_approved"
  | "leave_rejected"
  | "leave_cancelled"
  | "leave_sent_back"
  | "leave_policy_changed"
  | "leave_balance_adjusted";

export async function recordLeaveAudit(
  event: LeaveAuditEvent,
  params: {
    companyId: string;
    employeeId?: string;
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
    action: event.includes("applied") ? "create" : event.includes("adjusted") || event.includes("changed") ? "update" : "update",
    entityType: "leave",
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
      entityType: "leave",
      entityId: params.entityId ?? params.employeeId,
      metadata: { employeeId: params.employeeId, ...(params.metadata ?? {}) } as object,
    },
  });
}

export async function recordLeaveHistory(params: {
  companyId: string;
  leaveId: string;
  employeeId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.leaveHistory.create({
    data: {
      companyId: params.companyId,
      leaveId: params.leaveId,
      employeeId: params.employeeId,
      action: params.action,
      fromStatus: params.fromStatus as never,
      toStatus: params.toStatus as never,
      actorUserId: params.actorUserId,
      metadata: (params.metadata ?? {}) as object,
    },
  });
}

export async function getLeaveActorMeta() {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}
