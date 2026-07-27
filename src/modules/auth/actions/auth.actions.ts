"use server";

import { headers } from "next/headers";

import { recordAuthAudit } from "@/infrastructure/auth/auth-audit.service";
import { checkAuthRateLimit } from "@/infrastructure/auth/auth-rate-limit";
import { getClientIp } from "@/infrastructure/auth/client-info";
import { hashPassword } from "@/infrastructure/auth/password.service";
import {
  generateSecureToken,
  getEmailVerificationExpiry,
  getPasswordResetExpiry,
  hashToken,
  isTokenExpired,
} from "@/infrastructure/auth/token.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import { emailProvider } from "@/infrastructure/email/email-provider";
import {
  emailVerificationTemplate,
  passwordResetEmailTemplate,
} from "@/infrastructure/email/templates/auth-email.templates";
import {
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@/modules/auth/validation/schemas";
import { AUTH_CONFIG } from "@/shared/constants/auth";

export type AuthActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

async function getRequestMeta() {
  const headerList = await headers();
  return {
    ipAddress: getClientIp(headerList),
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}

export async function forgotPasswordAction(input: { email: string }): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email } = parsed.data;
  const { ipAddress, userAgent } = await getRequestMeta();
  const rateLimit = checkAuthRateLimit(`reset:${ipAddress ?? email}`, "passwordReset");

  if (!rateLimit.allowed) {
    return { success: false, message: "Too many reset requests. Please try again later." };
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
  });

  if (user) {
    const plainToken = generateSecureToken();
    const hashedToken = hashToken(plainToken);

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expires: getPasswordResetExpiry(),
      },
    });

    const template = passwordResetEmailTemplate({
      name: user.name,
      token: plainToken,
      expiresHours: AUTH_CONFIG.passwordResetExpiryHours,
    });
    await emailProvider.send(user.email, template.subject, template.body);

    await recordAuthAudit("password_reset_requested", {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      ipAddress,
      userAgent,
    });
  }

  return {
    success: true,
    message: "If an account exists with that email, you will receive password reset instructions shortly.",
  };
}

export async function resetPasswordAction(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { token, password } = parsed.data;
  const hashedLookup = hashToken(token);
  const { ipAddress, userAgent } = await getRequestMeta();

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { token: hashedLookup, usedAt: null },
    include: { user: true },
  });

  if (!resetToken || isTokenExpired(resetToken.expires)) {
    return { success: false, message: "This reset link is invalid or has expired." };
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: resetToken.user.status === "locked" ? "active" : resetToken.user.status,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: resetToken.userId } }),
  ]);

  await recordAuthAudit("password_reset_completed", {
    userId: resetToken.userId,
    companyId: resetToken.user.companyId,
    email: resetToken.user.email,
    ipAddress,
    userAgent,
  });

  return { success: true, message: "Your password has been reset successfully. You can now sign in." };
}

export async function verifyEmailAction(input: { token: string }): Promise<AuthActionResult> {
  const parsed = verifyEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid verification link." };
  }

  const hashedLookup = hashToken(parsed.data.token);
  const { ipAddress, userAgent } = await getRequestMeta();

  const verificationToken = await prisma.verificationToken.findFirst({
    where: { token: hashedLookup },
  });

  if (!verificationToken || isTokenExpired(verificationToken.expires)) {
    return { success: false, message: "This verification link is invalid or has expired." };
  }

  const user = await prisma.user.findFirst({
    where: { email: verificationToken.identifier.toLowerCase(), deletedAt: null },
  });

  if (!user) {
    return { success: false, message: "This verification link is invalid or has expired." };
  }

  if (user.emailVerified) {
    await prisma.verificationToken.deleteMany({ where: { identifier: verificationToken.identifier } });
    return { success: true, message: "Your email is already verified. You can sign in." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier: verificationToken.identifier } }),
  ]);

  await recordAuthAudit("verification_completed", {
    userId: user.id,
    companyId: user.companyId,
    email: user.email,
    ipAddress,
    userAgent,
  });

  return { success: true, message: "Your email has been verified. You can now sign in." };
}

export async function resendVerificationAction(input: { email: string }): Promise<AuthActionResult> {
  const parsed = resendVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email } = parsed.data;
  const { ipAddress, userAgent } = await getRequestMeta();
  const rateLimit = checkAuthRateLimit(`verify:${ipAddress ?? email}`, "verification");

  if (!rateLimit.allowed) {
    return { success: false, message: "Too many verification requests. Please try again later." };
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
  });

  if (user && !user.emailVerified) {
    const plainToken = generateSecureToken();
    const hashedToken = hashToken(plainToken);

    await prisma.verificationToken.deleteMany({ where: { identifier: user.email } });
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: hashedToken,
        expires: getEmailVerificationExpiry(),
      },
    });

    const template = emailVerificationTemplate({
      name: user.name,
      token: plainToken,
      expiresHours: AUTH_CONFIG.emailVerificationExpiryHours,
    });
    await emailProvider.send(user.email, template.subject, template.body);

    await recordAuthAudit("verification_sent", {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      ipAddress,
      userAgent,
    });
  }

  return {
    success: true,
    message: "If an unverified account exists, a verification email has been sent.",
  };
}
