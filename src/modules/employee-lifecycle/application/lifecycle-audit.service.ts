import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";
import { createEmployeeTimelineService } from "@/modules/employee/application/employee-timeline.service";

export type LifecycleAuditEvent =
  | "joining_initiated"
  | "joining_completed"
  | "probation_started"
  | "probation_extended"
  | "confirmation_completed"
  | "promotion_created"
  | "transfer_approved"
  | "salary_history_changed"
  | "warning_issued"
  | "suspension_created"
  | "resignation_submitted"
  | "termination_completed"
  | "exit_clearance_completed"
  | "alumni_created";

export async function recordLifecycleAudit(
  event: LifecycleAuditEvent,
  params: {
    companyId: string;
    employeeId: string;
    actorUserId?: string;
    entityId?: string;
    entityType?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await auditLogger.log({
    companyId: params.companyId,
    userId: params.actorUserId,
    action: event.includes("submitted") || event.includes("created") || event.includes("initiated") ? "create" : "update",
    entityType: params.entityType ?? "employee_lifecycle",
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
      entityType: params.entityType ?? "employee_lifecycle",
      entityId: params.entityId ?? params.employeeId,
      metadata: { employeeId: params.employeeId, ...(params.metadata ?? {}) } as object,
    },
  });
}

export async function getLifecycleActorMeta() {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}

export async function recordJourneyAndTimeline(
  companyId: string | undefined,
  params: {
    employeeId: string;
    stage: string;
    eventType: string;
    title: string;
    description?: string;
    entityType?: string;
    entityId?: string;
    actorUserId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (!companyId) throw new Error("Company context required");

  await prisma.employeeJourneyEvent.create({
    data: {
      companyId,
      employeeId: params.employeeId,
      stage: params.stage as never,
      eventType: params.eventType,
      title: params.title,
      description: params.description ?? null,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      eventDate: new Date(),
      metadata: (params.metadata ?? {}) as object,
      createdBy: params.actorUserId ?? null,
    },
  });

  await createEmployeeTimelineService(companyId).record({
    employeeId: params.employeeId,
    eventType: params.eventType,
    title: params.title,
    description: params.description,
    actorUserId: params.actorUserId,
    metadata: params.metadata,
  });
}
