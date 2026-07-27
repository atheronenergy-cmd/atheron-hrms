import Link from "next/link";

import { AuthLayoutShell } from "@/components/layout/auth-layout-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AcceptInvitationForm } from "@/modules/user/components/accept-invitation-form";
import { AUTH_ROUTES } from "@/shared/constants/auth";

export const metadata = { title: "Accept invitation" };

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthLayoutShell title="Invalid invitation" description="This invitation link is not valid.">
        <Alert variant="destructive">
          <AlertDescription>Missing invitation token.</AlertDescription>
        </Alert>
        <p className="text-center text-sm">
          <Link href={AUTH_ROUTES.login} className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </AuthLayoutShell>
    );
  }

  return (
    <AuthLayoutShell
      title="Accept invitation"
      description="Set your password to activate your Atheron HRMS account."
    >
      <AcceptInvitationForm token={token} />
    </AuthLayoutShell>
  );
}
