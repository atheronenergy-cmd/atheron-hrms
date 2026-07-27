import { APP_NAME } from "@/shared/constants/app";
import { AUTH_ROUTES } from "@/shared/constants/auth";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

export function passwordResetEmailTemplate(params: { name: string; token: string; expiresHours: number }) {
  const resetUrl = `${baseUrl}${AUTH_ROUTES.resetPassword}?token=${encodeURIComponent(params.token)}`;

  return {
    subject: `Reset your ${APP_NAME} password`,
    body: `
Hello ${params.name},

We received a request to reset your password for ${APP_NAME}.

Reset your password by visiting:
${resetUrl}

This link expires in ${params.expiresHours} hour(s).

If you did not request a password reset, you can safely ignore this email.

— ${APP_NAME} Team
    `.trim(),
  };
}

export function emailVerificationTemplate(params: { name: string; token: string; expiresHours: number }) {
  const verifyUrl = `${baseUrl}${AUTH_ROUTES.verifyEmail}?token=${encodeURIComponent(params.token)}`;

  return {
    subject: `Verify your ${APP_NAME} email address`,
    body: `
Hello ${params.name},

Please verify your email address to activate your ${APP_NAME} account.

Verify your email:
${verifyUrl}

This link expires in ${params.expiresHours} hour(s).

— ${APP_NAME} Team
    `.trim(),
  };
}
