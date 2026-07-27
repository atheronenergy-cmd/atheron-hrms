import { prisma } from "@/infrastructure/database/prisma-client";
import { auditLogger } from "@/shared/audit";

export type AuthAuditEvent =
  | "login_success"
  | "login_failure"
  | "logout"
  | "logout_all"
  | "password_reset_requested"
  | "password_reset_completed"
  | "password_changed"
  | "verification_sent"
  | "verification_completed";

export async function recordLoginHistory(params: {
  userId?: string;
  email: string;
  success: boolean;
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  deviceLabel?: string;
  location?: string;
}) {
  await prisma.loginHistory.create({
    data: {
      userId: params.userId,
      email: params.email.toLowerCase(),
      success: params.success,
      failureReason: params.failureReason,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      browser: params.browser,
      os: params.os,
      deviceLabel: params.deviceLabel,
      location: params.location,
    },
  });
}

export async function recordAuthAudit(
  event: AuthAuditEvent,
  params: {
    userId?: string;
    companyId?: string | null;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await auditLogger.log({
    companyId: params.companyId ?? undefined,
    userId: params.userId,
    action: event.includes("login") ? "login" : event.includes("logout") ? "logout" : "update",
    entityType: "auth",
    entityId: params.userId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: { event, email: params.email, ...params.metadata },
  });

  await prisma.activityLog.create({
    data: {
      companyId: params.companyId ?? undefined,
      userId: params.userId,
      action: event,
      entityType: "auth",
      entityId: params.userId,
      metadata: { email: params.email, ...params.metadata },
    },
  });
}
