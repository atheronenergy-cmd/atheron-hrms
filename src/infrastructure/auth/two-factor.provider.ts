import Credentials from "next-auth/providers/credentials";

import { recordAuthAudit, recordLoginHistory } from "@/infrastructure/auth/auth-audit.service";
import { parseUserAgent } from "@/infrastructure/auth/client-info";
import { prisma } from "@/infrastructure/database/prisma-client";
import { completeUserLogin } from "@/modules/security/application/login-completion.service";
import { twoFactorService } from "@/modules/security/application/two-factor.service";
import { otpVerificationSchema } from "@/modules/security/validation/schemas";
import { AuthenticationError } from "@/shared/errors";

export const twoFactorProvider = Credentials({
  id: "credentials-2fa",
  name: "Two Factor",
  credentials: {
    pendingToken: { label: "Pending Token", type: "text" },
    otp: { label: "OTP", type: "text" },
    useBackupCode: { label: "Use Backup Code", type: "checkbox" },
    rememberMe: { label: "Remember Me", type: "checkbox" },
  },
  async authorize(credentials, request) {
    const parsed = otpVerificationSchema.safeParse({
      pendingToken: credentials?.pendingToken,
      otp: credentials?.otp,
      useBackupCode:
        credentials?.useBackupCode === "true" || credentials?.useBackupCode === true,
      rememberMe: credentials?.rememberMe === "true" || credentials?.rememberMe === true,
    });

    if (!parsed.success) {
      throw new AuthenticationError("Invalid verification request");
    }

    const { pendingToken, otp, useBackupCode, rememberMe } = parsed.data;
    const ipAddress = request?.headers ? getClientIp(request.headers) : undefined;
    const userAgent = request?.headers?.get("user-agent") ?? undefined;
    const { browser, os, deviceLabel } = parseUserAgent(userAgent);

    const pending = await twoFactorService.consumePendingAuth(pendingToken);
    if (!pending) {
      throw new AuthenticationError("Verification session expired. Please sign in again.");
    }

    const user = await prisma.user.findUnique({
      where: { id: pending.userId },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new AuthenticationError("Two-factor verification is not available.");
    }

    const valid = await twoFactorService.verifyLoginOtp(user.id, otp, useBackupCode);
    if (!valid) {
      await recordLoginHistory({
        userId: user.id,
        email: user.email,
        success: false,
        failureReason: useBackupCode ? "invalid_backup_code" : "invalid_otp",
        ipAddress,
        userAgent,
        browser,
        os,
        deviceLabel,
      });
      throw new AuthenticationError(
        useBackupCode ? "Invalid backup code." : "Invalid verification code.",
      );
    }

    const { sessionToken, user: loggedInUser } = await completeUserLogin({
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      rememberMe: rememberMe || pending.rememberMe,
      ipAddress,
      userAgent,
    });

    await recordAuthAudit("login_success", {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      ipAddress,
      userAgent,
      metadata: { twoFactor: true, backupCode: useBackupCode },
    });

    return {
      id: loggedInUser.id,
      email: loggedInUser.email,
      name: loggedInUser.name,
      companyId: loggedInUser.companyId,
      emailVerified: loggedInUser.emailVerified,
      sessionToken,
    };
  },
});

function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    undefined
  );
}
