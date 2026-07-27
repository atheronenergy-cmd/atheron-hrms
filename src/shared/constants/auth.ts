import { PASSWORD_MIN_LENGTH } from "@/shared/constants/app";

export const AUTH_ROUTES = {
  login: "/login",
  verifyTwoFactor: "/login/verify-2fa",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  verifyEmailSent: "/verify-email/sent",
  resetPasswordSuccess: "/reset-password/success",
  sessions: "/dashboard/settings/sessions",
  dashboard: "/dashboard",
} as const;

export const PUBLIC_ROUTES = [
  AUTH_ROUTES.login,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.resetPassword,
  AUTH_ROUTES.resetPasswordSuccess,
  AUTH_ROUTES.verifyEmail,
  AUTH_ROUTES.verifyEmailSent,
  AUTH_ROUTES.verifyTwoFactor,
  "/accept-invitation",
  "/maintenance",
  "/unauthorized",
  "/api/health",
] as const;

export const GUEST_ONLY_ROUTES = [
  AUTH_ROUTES.login,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.resetPassword,
  AUTH_ROUTES.resetPasswordSuccess,
  AUTH_ROUTES.verifyTwoFactor,
  "/accept-invitation",
] as const;

export const PROTECTED_ROUTE_PREFIXES = ["/dashboard"] as const;

export const AUTH_CONFIG = {
  passwordMinLength: PASSWORD_MIN_LENGTH,
  bcryptRounds: 12,
  maxLoginAttempts: 5,
  lockoutMinutes: 30,
  sessionMaxAgeSeconds: 24 * 60 * 60, // 24 hours
  sessionRememberMaxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
  passwordResetExpiryHours: 1,
  emailVerificationExpiryHours: 24,
  rateLimitLogin: { max: 10, windowMs: 60_000 },
  rateLimitPasswordReset: { max: 5, windowMs: 60_000 },
  rateLimitVerification: { max: 3, windowMs: 60_000 },
} as const;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  companyId: string | null;
  emailVerified: Date | null;
  status: string;
};

export type SessionInfo = {
  id: string;
  sessionToken: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  isTrusted: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  expires: Date;
  isCurrent: boolean;
};
