import Link from "next/link";

import { TwoFactorVerifyForm } from "@/modules/security/components/two-factor-verify-form";
import { AUTH_ROUTES } from "@/shared/constants/auth";

export const metadata = { title: "Verify Two-Factor Authentication" };

type PageProps = {
  searchParams: Promise<{ token?: string; callbackUrl?: string; rememberMe?: string }>;
};

export default async function VerifyTwoFactorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Verification required</h1>
        <p className="text-muted-foreground">Your verification session expired. Please sign in again.</p>
        <Link href={AUTH_ROUTES.login} className="text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Two-factor verification</h1>
        <p className="text-sm text-muted-foreground">
          Enter the code from your authenticator app to complete sign in.
        </p>
      </div>
      <TwoFactorVerifyForm
        pendingToken={token}
        callbackUrl={params.callbackUrl}
        rememberMe={params.rememberMe === "true"}
      />
    </div>
  );
}
