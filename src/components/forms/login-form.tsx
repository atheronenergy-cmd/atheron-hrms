"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PasswordInput } from "@/components/forms/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LoginInput,loginSchema } from "@/modules/auth/validation/schemas";
import { ROUTES } from "@/shared/constants/app";
import { AUTH_ROUTES } from "@/shared/constants/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? ROUTES.dashboard;
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const rememberMe = watch("rememberMe");

  async function onSubmit(values: LoginInput) {
    setError(null);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      rememberMe: String(values.rememberMe),
      redirect: false,
    });

    if (result?.error) {
      if (result.error.startsWith("2FA_REQUIRED:")) {
        const token = result.error.replace("2FA_REQUIRED:", "");
        const verifyUrl = new URL(AUTH_ROUTES.verifyTwoFactor, window.location.origin);
        verifyUrl.searchParams.set("token", token);
        verifyUrl.searchParams.set("callbackUrl", callbackUrl);
        verifyUrl.searchParams.set("rememberMe", String(values.rememberMe));
        router.push(`${verifyUrl.pathname}${verifyUrl.search}`);
        return;
      }

      const message = mapLoginError(result.error);
      setError(message);
      toast.error(message);
      return;
    }

    toast.success("Signed in successfully");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href={AUTH_ROUTES.forgotPassword}
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="rememberMe"
          checked={rememberMe}
          onCheckedChange={(checked) => setValue("rememberMe", checked === true)}
        />
        <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
          Remember me for 30 days
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function mapLoginError(error: string): string {
  if (error.includes("verify your email")) {
    return "Please verify your email before signing in.";
  }
  if (error.includes("locked")) {
    return "Your account is locked. Please contact support or try again later.";
  }
  if (error.includes("Too many")) {
    return error;
  }
  if (error.includes("inactive")) {
    return "Your account is inactive.";
  }
  return "Invalid email or password.";
}
