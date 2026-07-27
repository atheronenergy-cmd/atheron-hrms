import { checkRateLimit } from "@/infrastructure/security/security";
import { AUTH_CONFIG } from "@/shared/constants/auth";

export function checkAuthRateLimit(
  key: string,
  type: "login" | "passwordReset" | "verification",
): { allowed: boolean; remaining: number } {
  const config =
    type === "login"
      ? AUTH_CONFIG.rateLimitLogin
      : type === "passwordReset"
        ? AUTH_CONFIG.rateLimitPasswordReset
        : AUTH_CONFIG.rateLimitVerification;

  const result = checkRateLimit(key, config.max, config.windowMs);
  return { allowed: result.allowed, remaining: result.remaining };
}
