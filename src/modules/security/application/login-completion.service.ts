import { v7 as uuidv7 } from "uuid";

import { recordAuthAudit, recordLoginHistory } from "@/infrastructure/auth/auth-audit.service";
import { parseUserAgent } from "@/infrastructure/auth/client-info";
import { prisma } from "@/infrastructure/database/prisma-client";
import { deviceService } from "@/modules/security/application/device.service";
import { createDeviceFingerprint } from "@/modules/security/application/encryption.service";
import { passwordPolicyService } from "@/modules/security/application/password-policy.service";
import { securityNotificationService } from "@/modules/security/application/security-notification.service";
import { sessionSecurityService } from "@/modules/security/application/session-security.service";

export type CompleteLoginParams = {
  userId: string;
  email: string;
  companyId: string | null;
  rememberMe: boolean;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
};

export type CompleteLoginResult = {
  sessionToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    companyId: string | null;
    emailVerified: Date | null;
  };
};

export async function completeUserLogin(params: CompleteLoginParams): Promise<CompleteLoginResult> {
  const policy = await passwordPolicyService.getPolicy(params.companyId);

  if (params.ipAddress && policy.ipAllowlist.length > 0) {
    const allowed = policy.ipAllowlist.some(
      (ip) => params.ipAddress === ip || params.ipAddress?.startsWith(ip),
    );
    if (!allowed) {
      await securityNotificationService.notify({
        userId: params.userId,
        companyId: params.companyId,
        eventType: "suspicious_activity",
        severity: "critical",
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: { reason: "ip_not_allowed" },
      });
      throw new Error("Login not permitted from this network location.");
    }
  }

  await sessionSecurityService.enforceConcurrentSessionLimit(
    params.userId,
    params.companyId,
    policy.maxConcurrentSessions,
  );

  const { browser, os, deviceLabel } = parseUserAgent(params.userAgent);
  const fingerprint = createDeviceFingerprint(params.userAgent, params.ipAddress);
  const existingDevices = await prisma.userDevice.findMany({
    where: { userId: params.userId },
    select: { fingerprint: true },
  });
  const isNewDevice = deviceService.isNewDevice(existingDevices, fingerprint);

  const device = await deviceService.registerOrUpdateDevice({
    userId: params.userId,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
    location: params.location,
  });

  const maxAgeSeconds = await sessionSecurityService.getSessionMaxAgeSeconds(
    params.companyId,
    params.rememberMe,
  );
  const sessionToken = uuidv7();
  const expires = new Date(Date.now() + maxAgeSeconds * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId: params.userId,
      expires,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      deviceLabel,
      deviceId: device.id,
      location: params.location,
      isTrusted: device.isTrusted,
      lastActivityAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      status: "active",
      lastLoginAt: new Date(),
    },
  });

  await recordLoginHistory({
    userId: params.userId,
    email: params.email,
    success: true,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    browser,
    os,
    deviceLabel,
    location: params.location,
  });

  await recordAuthAudit("login_success", {
    userId: params.userId,
    companyId: params.companyId,
    email: params.email,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: { deviceId: device.id, newDevice: isNewDevice },
  });

  await securityNotificationService.notify({
    userId: params.userId,
    companyId: params.companyId,
    eventType: isNewDevice ? "new_device" : "login_success",
    severity: isNewDevice ? "warning" : "info",
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    deviceId: device.id,
    metadata: { browser, os, deviceLabel },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: params.userId },
    select: {
      id: true,
      email: true,
      name: true,
      companyId: true,
      emailVerified: true,
    },
  });

  return { sessionToken, user };
}
