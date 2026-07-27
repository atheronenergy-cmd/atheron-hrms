import { AUTH_CONFIG } from "@/shared/constants/auth";

export function validatePasswordStrength(password: string): {
  score: number;
  label: "weak" | "fair" | "good" | "strong";
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
} {
  const checks = {
    length: password.length >= AUTH_CONFIG.passwordMinLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passed / 5) * 100);

  let label: "weak" | "fair" | "good" | "strong" = "weak";
  if (passed >= 5) label = "strong";
  else if (passed >= 4) label = "good";
  else if (passed >= 3) label = "fair";

  return { score, label, checks };
}
