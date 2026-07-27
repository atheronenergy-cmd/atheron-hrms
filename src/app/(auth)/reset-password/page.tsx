import Link from "next/link";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { AuthLayoutShell } from "@/components/layout/auth-layout-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AUTH_ROUTES } from "@/shared/constants/auth";

export const metadata = {
  title: "Reset password",
};

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthLayoutShell title="Reset password" description="This reset link is invalid.">
        <Alert variant="destructive">
          <AlertDescription>
            Missing or invalid reset token. Please request a new password reset link.
          </AlertDescription>
        </Alert>
        <p className="text-center text-sm">
          <Link href={AUTH_ROUTES.forgotPassword} className="text-primary hover:underline">
            Request new link
          </Link>
        </p>
      </AuthLayoutShell>
    );
  }

  return (
    <AuthLayoutShell title="Reset password" description="Choose a strong new password for your account.">
      <Suspense>
        <ResetPasswordForm token={token} />
      </Suspense>
    </AuthLayoutShell>
  );
}
