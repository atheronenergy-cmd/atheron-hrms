import Link from "next/link";

import { AuthLayoutShell } from "@/components/layout/auth-layout-shell";
import { ResendVerificationForm } from "@/modules/auth/components/resend-verification-form";
import { VerifyEmailClient } from "@/modules/auth/components/verify-email-client";
import { AUTH_ROUTES } from "@/shared/constants/auth";

export const metadata = {
  title: "Verify email",
};

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (token) {
    return (
      <AuthLayoutShell title="Verify email" description="Confirming your email address…">
        <VerifyEmailClient token={token} />
      </AuthLayoutShell>
    );
  }

  return (
    <AuthLayoutShell
      title="Verify email"
      description="Enter your email to receive a new verification link."
    >
      <ResendVerificationForm />
      <p className="text-center text-sm text-muted-foreground">
        <Link href={AUTH_ROUTES.login} className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayoutShell>
  );
}
