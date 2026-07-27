import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";
import { auditService } from "@/modules/security/application/audit.service";

export type FinancialAuditEvent =
  | "bank_details_added"
  | "bank_details_changed"
  | "bank_verified"
  | "bank_rejected"
  | "family_member_added"
  | "family_member_changed"
  | "nominee_changed"
  | "statutory_changed"
  | "tax_updated"
  | "insurance_added"
  | "insurance_changed"
  | "sensitive_data_accessed";

export async function recordFinancialAudit(
  event: FinancialAuditEvent,
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
    action: event.includes("added") ? "create" : event.includes("accessed") ? "view" : "update",
    entityType: params.entityType ?? "employee_financial",
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
      entityType: params.entityType ?? "employee_financial",
      entityId: params.entityId ?? params.employeeId,
      metadata: { employeeId: params.employeeId, ...(params.metadata ?? {}) } as object,
    },
  });
}

export async function logSensitiveAccess(params: {
  companyId: string;
  employeeId: string;
  userId: string;
  entityType: string;
  entityId?: string;
  action: string;
  fieldName?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await prisma.employeeFinancialAccessLog.create({
    data: {
      companyId: params.companyId,
      employeeId: params.employeeId,
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      action: params.action,
      fieldName: params.fieldName ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });

  await auditService.logSensitiveView({
    userId: params.userId,
    companyId: params.companyId,
    entityType: params.entityType,
    entityId: params.entityId ?? params.employeeId,
    field: params.fieldName,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  await recordFinancialAudit("sensitive_data_accessed", {
    companyId: params.companyId,
    employeeId: params.employeeId,
    actorUserId: params.userId,
    entityId: params.entityId,
    entityType: params.entityType,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: { field: params.fieldName, action: params.action },
  });
}

export async function getFinancialActorMeta() {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}
