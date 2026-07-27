import Credentials from "next-auth/providers/credentials";

import { recordLoginHistory } from "@/infrastructure/auth/auth-audit.service";
import { checkAuthRateLimit } from "@/infrastructure/auth/auth-rate-limit";
import { getClientIp, parseUserAgent } from "@/infrastructure/auth/client-info";
import { verifyPassword } from "@/infrastructure/auth/password.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import { loginSchema } from "@/modules/auth/validation/schemas";
import { completeUserLogin } from "@/modules/security/application/login-completion.service";
import {
  applyProgressiveLoginDelay,
  clearFailureDelayKey,
  recordFailureDelayKey,
} from "@/modules/security/application/login-delay.service";
import { passwordPolicyService } from "@/modules/security/application/password-policy.service";
import { securityNotificationService } from "@/modules/security/application/security-notification.service";
import { twoFactorService } from "@/modules/security/application/two-factor.service";
import { AuthenticationError } from "@/shared/errors";

export const credentialsProvider = Credentials({
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
    rememberMe: { label: "Remember Me", type: "checkbox" },
  },
  async authorize(credentials, request) {
    const parsed = loginSchema.safeParse({
      email: credentials?.email,
      password: credentials?.password,
      rememberMe: credentials?.rememberMe === "true" || credentials?.rememberMe === true,
    });

    if (!parsed.success) {
      throw new AuthenticationError("Invalid credentials");
    }

    const { email, password, rememberMe } = parsed.data;
    const ipAddress = request?.headers ? getClientIp(request.headers) : undefined;
    const userAgent = request?.headers?.get("user-agent") ?? undefined;
    const { browser, os, deviceLabel } = parseUserAgent(userAgent);

    const rateLimitKey = `login:${ipAddress ?? email}`;
    const rateLimit = checkAuthRateLimit(rateLimitKey, "login");
    if (!rateLimit.allowed) {
      await recordLoginHistory({
        email,
        success: false,
        failureReason: "rate_limited",
        ipAddress,
        userAgent,
        browser,
        os,
        deviceLabel,
      });
      throw new AuthenticationError("Too many login attempts. Please try again later.");
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });

    const policy = await passwordPolicyService.getPolicy(user?.companyId);

    if (!user || !user.passwordHash) {
      const attempts = recordFailureDelayKey(rateLimitKey);
      await applyProgressiveLoginDelay(attempts);
      await recordLoginHistory({
        email,
        success: false,
        failureReason: "invalid_credentials",
        ipAddress,
        userAgent,
        browser,
        os,
        deviceLabel,
      });
      throw new AuthenticationError("Invalid email or password");
    }

    if (user.status === "locked" || (user.lockedUntil && user.lockedUntil > new Date())) {
      await recordLoginHistory({
        userId: user.id,
        email,
        success: false,
        failureReason: "account_locked",
        ipAddress,
        userAgent,
        browser,
        os,
        deviceLabel,
      });
      throw new AuthenticationError("Your account is locked. Please contact support.");
    }

    if (user.status === "inactive") {
      await recordLoginHistory({
        userId: user.id,
        email,
        success: false,
        failureReason: "account_inactive",
        ipAddress,
        userAgent,
        browser,
        os,
        deviceLabel,
      });
      throw new AuthenticationError("Your account is inactive.");
    }

    if (user.status === "suspended") {
      await recordLoginHistory({
        userId: user.id,
        email,
        success: false,
        failureReason: "account_suspended",
        ipAddress,
        userAgent,
        browser,
        os,
        deviceLabel,
      });
      throw new AuthenticationError("Your account has been suspended.");
    }

    if (user.status === "pending_verification") {
      await recordLoginHistory({
        userId: user.id,
        email,
        success: false,
        failureReason: "pending_verification",
        ipAddress,
        userAgent,
        browser,
        os,
        deviceLabel,
      });
      throw new AuthenticationError("Please accept your invitation or verify your email before signing in.");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= policy.maxLoginAttempts;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          ...(shouldLock
            ? {
                status: "locked",
                lockedUntil: new Date(Date.now() + policy.lockoutMinutes * 60 * 1000),
              }
            : {}),
        },
      });

      await applyProgressiveLoginDelay(attempts);

      await recordLoginHistory({
        userId: user.id,
        email,
        success: false,
        failureReason: shouldLock ? "account_locked" : "invalid_credentials",
        ipAddress,
        userAgent,
        browser,
        os,
        deviceLabel,
      });

      if (shouldLock) {
        await securityNotificationService.notify({
          userId: user.id,
          companyId: user.companyId,
          eventType: "account_locked",
          severity: "critical",
          ipAddress,
          userAgent,
          metadata: { attempts },
        });
      }

      throw new AuthenticationError(
        shouldLock
          ? "Too many failed attempts. Your account has been locked."
          : "Invalid email or password",
      );
    }

    if (!user.emailVerified) {
      await recordLoginHistory({
        userId: user.id,
        email,
        success: false,
        failureReason: "email_not_verified",
        ipAddress,
        userAgent,
        browser,
        os,
        deviceLabel,
      });
      throw new AuthenticationError("Please verify your email before signing in.");
    }

    if (policy.requireTwoFactor && !user.twoFactorEnabled) {
      throw new AuthenticationError(
        "Two-factor authentication is required. Please contact your administrator to enable 2FA.",
      );
    }

    if (user.twoFactorEnabled) {
      const pending = await twoFactorService.createPendingAuth({
        userId: user.id,
        rememberMe,
        ipAddress,
        userAgent,
      });
      throw new AuthenticationError(`2FA_REQUIRED:${pending.token}`);
    }

    clearFailureDelayKey(rateLimitKey);

    const { sessionToken, user: loggedInUser } = await completeUserLogin({
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      rememberMe,
      ipAddress,
      userAgent,
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
