import Link from "next/link";

import { AuthLayoutShell } from "@/components/layout/auth-layout-shell";
import { AUTH_ROUTES } from "@/shared/constants/auth";

export const metadata = {
  title: "Verification email sent",
};

export default function VerifyEmailSentPage() {
  return (
    <AuthLayoutShell
      title="Check your inbox"
      description="If an unverified account exists, we've sent a verification link to your email."
    >
      <p className="text-center text-sm text-muted-foreground">
        <Link href={AUTH_ROUTES.login} className="text-primary hover:underline">
          Return to sign in
        </Link>
      </p>
    </AuthLayoutShell>
  );
}
