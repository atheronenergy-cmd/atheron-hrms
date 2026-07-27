import { createHash, randomBytes } from "crypto";

import { AUTH_CONFIG } from "@/shared/constants/auth";

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getPasswordResetExpiry(): Date {
  return new Date(Date.now() + AUTH_CONFIG.passwordResetExpiryHours * 60 * 60 * 1000);
}

export function getEmailVerificationExpiry(): Date {
  return new Date(Date.now() + AUTH_CONFIG.emailVerificationExpiryHours * 60 * 60 * 1000);
}

export function isTokenExpired(expires: Date): boolean {
  return expires.getTime() < Date.now();
}
