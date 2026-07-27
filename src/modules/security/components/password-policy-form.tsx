"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSecuritySettingsAction } from "@/modules/security/actions/security.actions";
import {
  type SecuritySettingsInput,
  securitySettingsSchema,
} from "@/modules/security/validation/schemas";

type PasswordPolicyFormProps = {
  defaultValues: SecuritySettingsInput;
};

export function PasswordPolicyForm({ defaultValues }: PasswordPolicyFormProps) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SecuritySettingsInput>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues,
  });

  const boolFields = [
    "requireTwoFactor",
    "passwordRequireUpper",
    "passwordRequireLower",
    "passwordRequireNumber",
    "passwordRequireSpecial",
    "deviceRestrictions",
  ] as const;

  function onSubmit(values: SecuritySettingsInput) {
    startTransition(async () => {
      const result = await updateSecuritySettingsAction(values);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="passwordMinLength">Minimum password length</Label>
          <Input id="passwordMinLength" type="number" {...register("passwordMinLength", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxLoginAttempts">Max login attempts</Label>
          <Input id="maxLoginAttempts" type="number" {...register("maxLoginAttempts", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lockoutMinutes">Lockout duration (minutes)</Label>
          <Input id="lockoutMinutes" type="number" {...register("lockoutMinutes", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sessionTimeoutMinutes">Session timeout (minutes)</Label>
          <Input
            id="sessionTimeoutMinutes"
            type="number"
            {...register("sessionTimeoutMinutes", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxConcurrentSessions">Max concurrent sessions</Label>
          <Input
            id="maxConcurrentSessions"
            type="number"
            {...register("maxConcurrentSessions", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="passwordHistoryCount">Password history count</Label>
          <Input
            id="passwordHistoryCount"
            type="number"
            {...register("passwordHistoryCount", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="passwordExpiryDays">Password expiry (days, 0 = never)</Label>
          <Input
            id="passwordExpiryDays"
            type="number"
            {...register("passwordExpiryDays", {
              setValueAs: (v) => (v === "" || v === "0" ? null : Number(v)),
            })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ipAllowlist">IP allowlist (comma-separated)</Label>
          <Input
            id="ipAllowlist"
            placeholder="192.168.1.0/24, 10.0.0.1"
            defaultValue={defaultValues.ipAllowlist.join(", ")}
            onChange={(e) =>
              setValue(
                "ipAllowlist",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        {boolFields.map((field) => (
          <div key={field} className="flex items-center space-x-2">
            <Checkbox
              id={field}
              checked={watch(field)}
              onCheckedChange={(checked) => setValue(field, checked === true)}
            />
            <Label htmlFor={field} className="font-normal cursor-pointer">
              {formatLabel(field)}
            </Label>
          </div>
        ))}
      </div>

      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-destructive">Please fix validation errors before saving.</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save security settings"}
      </Button>
    </form>
  );
}

function formatLabel(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
