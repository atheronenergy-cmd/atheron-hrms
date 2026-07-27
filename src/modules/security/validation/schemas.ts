import { z } from "zod";

export const otpVerificationSchema = z.object({
  pendingToken: z.string().min(1, "Session expired. Please sign in again."),
  otp: z
    .string()
    .min(6, "Enter a 6-digit code")
    .max(12, "Invalid code")
    .regex(/^[\dA-Za-z-]+$/, "Invalid code format"),
  useBackupCode: z.boolean().default(false),
  rememberMe: z.boolean().default(false),
});

export type OtpVerificationInput = z.infer<typeof otpVerificationSchema>;

export const twoFactorSetupSchema = z.object({
  token: z.string().length(6, "Enter the 6-digit code from your authenticator app"),
});

export type TwoFactorSetupInput = z.infer<typeof twoFactorSetupSchema>;

export const twoFactorDisableSchema = z.object({
  token: z.string().length(6, "Enter the 6-digit code to confirm"),
});

export const passwordPolicySchema = z.object({
  requireTwoFactor: z.boolean(),
  passwordMinLength: z.number().int().min(8).max(128),
  passwordRequireUpper: z.boolean(),
  passwordRequireLower: z.boolean(),
  passwordRequireNumber: z.boolean(),
  passwordRequireSpecial: z.boolean(),
  passwordExpiryDays: z.number().int().min(0).max(365).nullable(),
  passwordHistoryCount: z.number().int().min(0).max(24),
  maxLoginAttempts: z.number().int().min(3).max(20),
  lockoutMinutes: z.number().int().min(5).max(1440),
  sessionTimeoutMinutes: z.number().int().min(15).max(43200),
  maxConcurrentSessions: z.number().int().min(1).max(50),
  ipAllowlist: z.array(z.string().min(1)),
  deviceRestrictions: z.boolean(),
});

export type PasswordPolicyInput = z.infer<typeof passwordPolicySchema>;

export const securitySettingsSchema = passwordPolicySchema;

export type SecuritySettingsInput = z.infer<typeof securitySettingsSchema>;

export const deviceTrustSchema = z.object({
  deviceId: z.string().uuid(),
  trusted: z.boolean(),
});

export const regenerateBackupCodesSchema = z.object({
  token: z.string().length(6, "Enter the 6-digit code to confirm"),
});
