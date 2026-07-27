"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PasswordInput } from "@/components/forms/password-input";
import { PasswordStrengthMeter } from "@/components/forms/password-strength-meter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { acceptInvitationAction } from "@/modules/user/actions/user.actions";
import {
  type AcceptInvitationInput,
  acceptInvitationSchema,
} from "@/modules/user/validation/schemas";
import { AUTH_ROUTES } from "@/shared/constants/auth";

type AcceptInvitationFormProps = {
  token: string;
};

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  const password = watch("password");

  async function onSubmit(values: AcceptInvitationInput) {
    const result = await acceptInvitationAction(values);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    router.push(AUTH_ROUTES.login);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <input type="hidden" {...register("token")} />

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
        <PasswordStrengthMeter password={password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput id="confirmPassword" autoComplete="new-password" {...register("confirmPassword")} />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Activating…" : "Activate account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href={AUTH_ROUTES.login} className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
