import { verifyPassword } from "@/infrastructure/auth/password.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { PasswordPolicyInput } from "@/modules/security/validation/schemas";

export type ResolvedPasswordPolicy = {
  passwordMinLength: number;
  passwordRequireUpper: boolean;
  passwordRequireLower: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
  passwordExpiryDays: number | null;
  passwordHistoryCount: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  requireTwoFactor: boolean;
  ipAllowlist: string[];
  deviceRestrictions: boolean;
};

const DEFAULT_POLICY: ResolvedPasswordPolicy = {
  passwordMinLength: 12,
  passwordRequireUpper: true,
  passwordRequireLower: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: true,
  passwordExpiryDays: null,
  passwordHistoryCount: 5,
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
  sessionTimeoutMinutes: 1440,
  maxConcurrentSessions: 5,
  requireTwoFactor: false,
  ipAllowlist: [],
  deviceRestrictions: false,
};

export class PasswordPolicyService {
  async getPolicy(companyId?: string | null): Promise<ResolvedPasswordPolicy> {
    if (!companyId) return DEFAULT_POLICY;

    const policy = await prisma.securityPolicy.findUnique({ where: { companyId } });
    if (!policy) return DEFAULT_POLICY;

    return {
      passwordMinLength: policy.passwordMinLength,
      passwordRequireUpper: policy.passwordRequireUpper,
      passwordRequireLower: policy.passwordRequireLower,
      passwordRequireNumber: policy.passwordRequireNumber,
      passwordRequireSpecial: policy.passwordRequireSpecial,
      passwordExpiryDays: policy.passwordExpiryDays,
      passwordHistoryCount: policy.passwordHistoryCount,
      maxLoginAttempts: policy.maxLoginAttempts,
      lockoutMinutes: policy.lockoutMinutes,
      sessionTimeoutMinutes: policy.sessionTimeoutMinutes,
      maxConcurrentSessions: policy.maxConcurrentSessions,
      requireTwoFactor: policy.requireTwoFactor,
      ipAllowlist: Array.isArray(policy.ipAllowlist)
        ? (policy.ipAllowlist as string[])
        : [],
      deviceRestrictions: policy.deviceRestrictions,
    };
  }

  validatePassword(password: string, policy: ResolvedPasswordPolicy): string[] {
    const errors: string[] = [];
    if (password.length < policy.passwordMinLength) {
      errors.push(`Password must be at least ${policy.passwordMinLength} characters`);
    }
    if (policy.passwordRequireUpper && !/[A-Z]/.test(password)) {
      errors.push("Password must include an uppercase letter");
    }
    if (policy.passwordRequireLower && !/[a-z]/.test(password)) {
      errors.push("Password must include a lowercase letter");
    }
    if (policy.passwordRequireNumber && !/\d/.test(password)) {
      errors.push("Password must include a number");
    }
    if (policy.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(password)) {
      errors.push("Password must include a special character");
    }
    return errors;
  }

  async isPasswordInHistory(userId: string, password: string, historyCount: number): Promise<boolean> {
    if (historyCount <= 0) return false;
    const history = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: historyCount,
      select: { passwordHash: true },
    });
    for (const entry of history) {
      if (await verifyPassword(password, entry.passwordHash)) return true;
    }
    return false;
  }

  async recordPasswordHistory(userId: string, passwordHash: string): Promise<void> {
    await prisma.passwordHistory.create({ data: { userId, passwordHash } });
  }

  isPasswordExpired(passwordChangedAt: Date | null, expiryDays: number | null): boolean {
    if (!expiryDays || !passwordChangedAt) return false;
    const expiresAt = passwordChangedAt.getTime() + expiryDays * 24 * 60 * 60 * 1000;
    return Date.now() > expiresAt;
  }

  toPolicyInput(policy: ResolvedPasswordPolicy): PasswordPolicyInput {
    return {
      requireTwoFactor: policy.requireTwoFactor,
      passwordMinLength: policy.passwordMinLength,
      passwordRequireUpper: policy.passwordRequireUpper,
      passwordRequireLower: policy.passwordRequireLower,
      passwordRequireNumber: policy.passwordRequireNumber,
      passwordRequireSpecial: policy.passwordRequireSpecial,
      passwordExpiryDays: policy.passwordExpiryDays,
      passwordHistoryCount: policy.passwordHistoryCount,
      maxLoginAttempts: policy.maxLoginAttempts,
      lockoutMinutes: policy.lockoutMinutes,
      sessionTimeoutMinutes: policy.sessionTimeoutMinutes,
      maxConcurrentSessions: policy.maxConcurrentSessions,
      ipAllowlist: policy.ipAllowlist,
      deviceRestrictions: policy.deviceRestrictions,
    };
  }
}

export const passwordPolicyService = new PasswordPolicyService();
