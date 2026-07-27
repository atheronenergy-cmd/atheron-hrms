"use client";

import { cn } from "@/lib/utils";
import { validatePasswordStrength } from "@/shared/validation/password-strength";

type PasswordStrengthMeterProps = {
  password: string;
  className?: string;
};

const strengthColors = {
  weak: "bg-destructive",
  fair: "bg-amber-500",
  good: "bg-blue-500",
  strong: "bg-emerald-500",
} as const;

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const { score, label, checks } = validatePasswordStrength(password);

  if (!password) return null;

  return (
    <div className={cn("space-y-2", className)} aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className="capitalize font-medium">{label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all duration-300", strengthColors[label])}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Password strength: ${label}`}
        />
      </div>
      <ul className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <li className={checks.length ? "text-emerald-600" : undefined}>At least 12 characters</li>
        <li className={checks.uppercase ? "text-emerald-600" : undefined}>One uppercase letter</li>
        <li className={checks.lowercase ? "text-emerald-600" : undefined}>One lowercase letter</li>
        <li className={checks.number ? "text-emerald-600" : undefined}>One number</li>
        <li className={checks.special ? "text-emerald-600" : undefined}>One special character</li>
      </ul>
    </div>
  );
}
