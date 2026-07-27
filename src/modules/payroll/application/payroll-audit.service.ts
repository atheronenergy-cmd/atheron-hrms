import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";

export type PayrollAuditEvent =
  | "payroll_generated"
  | "payroll_calculated"
  | "payroll_recalculated"
  | "payroll_approved"
  | "payroll_locked"
  | "payroll_unlocked"
  | "payroll_deleted";

export async function recordPayrollAudit(
  event: PayrollAuditEvent,
  params: {
    companyId: string;
    payrollId: string;
    actorUserId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await auditLogger.log({
    companyId: params.companyId,
    userId: params.actorUserId,
    action: event.includes("deleted") ? "delete" : event.includes("generated") ? "create" : "update",
    entityType: "payroll",
    entityId: params.payrollId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: { event, ...params.metadata },
  });

  await prisma.payrollCalculationLog.create({
    data: {
      companyId: params.companyId,
      payrollId: params.payrollId,
      action: event,
      actorUserId: params.actorUserId,
      metadata: (params.metadata ?? {}) as object,
    },
  });

  await prisma.activityLog.create({
    data: {
      companyId: params.companyId,
      userId: params.actorUserId,
      action: event,
      entityType: "payroll",
      entityId: params.payrollId,
      metadata: (params.metadata ?? {}) as object,
    },
  });
}

export async function getPayrollActorMeta() {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}
