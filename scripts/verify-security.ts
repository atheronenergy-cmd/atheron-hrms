/**
 * Enterprise Security module verification.
 * Run: npx tsx scripts/verify-security.ts
 */
import { dataMaskingService } from "../src/modules/security/application/data-masking.service";
import { hashRecoveryCode } from "../src/modules/security/application/encryption.service";
import { passwordPolicyService } from "../src/modules/security/application/password-policy.service";
import {
  otpVerificationSchema,
  passwordPolicySchema,
  securitySettingsSchema,
  twoFactorSetupSchema,
} from "../src/modules/security/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Enterprise Security Verification ===\n");

assert(PERMISSIONS.SETTINGS.SECURITY.READ === "settings.security.read", "Security read permission");
assert(PERMISSIONS.SETTINGS.SECURITY.MANAGE === "settings.security.manage", "Security manage permission");

const otpValid = otpVerificationSchema.safeParse({
  pendingToken: "abc-123",
  otp: "123456",
  useBackupCode: false,
  rememberMe: true,
});
assert(otpValid.success, "OTPVerificationSchema accepts valid OTP");

const otpInvalid = otpVerificationSchema.safeParse({ pendingToken: "", otp: "12" });
assert(!otpInvalid.success, "OTPVerificationSchema rejects short OTP");

const setupValid = twoFactorSetupSchema.safeParse({ token: "123456" });
assert(setupValid.success, "TwoFactorSetupSchema accepts 6-digit token");

const policyValid = passwordPolicySchema.safeParse({
  requireTwoFactor: false,
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
  ipAllowlist: [],
  deviceRestrictions: false,
});
assert(policyValid.success, "PasswordPolicySchema accepts defaults");

const settingsValid = securitySettingsSchema.safeParse(policyValid.data);
assert(settingsValid.success, "SecuritySettingsSchema matches password policy");

const policy = passwordPolicyService.validatePassword("Weak", {
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
});
assert(policy.length > 0, "PasswordPolicyService rejects weak password");

assert(dataMaskingService.maskAadhaar("123456789012") === "XXXX XXXX 9012", "Aadhaar masking");
assert(dataMaskingService.maskBankAccount("1234567890") === "XXXXXX7890", "Bank account masking");
assert(dataMaskingService.maskSalary(50000, false) === "Restricted", "Salary restricted");
assert(dataMaskingService.maskSalary(50000, true) === "50,000", "Salary visible when permitted");

const hash1 = hashRecoveryCode("ABCD-EFGH");
const hash2 = hashRecoveryCode("abcd efgh");
assert(hash1 === hash2, "Recovery code hashing is normalized");

console.log("\n=== All security checks passed ===\n");
