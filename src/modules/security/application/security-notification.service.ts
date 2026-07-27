import type { Prisma, SecurityEventSeverity } from "@prisma/client";

import { prisma } from "@/infrastructure/database/prisma-client";

export type SecurityEventType =
  | "login_success"
  | "login_failure"
  | "new_device"
  | "password_changed"
  | "two_factor_enabled"
  | "two_factor_disabled"
  | "account_locked"
  | "suspicious_activity"
  | "session_revoked"
  | "policy_updated";

export class SecurityNotificationService {
  async notify(params: {
    userId?: string;
    companyId?: string | null;
    eventType: SecurityEventType;
    severity?: SecurityEventSeverity;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    metadata?: Record<string, unknown>;
  }) {
    await prisma.securityEvent.create({
      data: {
        userId: params.userId,
        companyId: params.companyId ?? undefined,
        eventType: params.eventType,
        severity: params.severity ?? "info",
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        deviceId: params.deviceId,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    if (process.env.NODE_ENV === "development") {
      console.info("[SECURITY]", params.eventType, params.metadata ?? {});
    }
  }
}

export const securityNotificationService = new SecurityNotificationService();
