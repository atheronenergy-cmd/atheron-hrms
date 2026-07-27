import Link from "next/link";

import { AuthLayoutShell } from "@/components/layout/auth-layout-shell";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/shared/constants/auth";

export const metadata = {
  title: "Password reset successful",
};

export default function ResetPasswordSuccessPage() {
  return (
    <AuthLayoutShell
      title="Password reset successful"
      description="Your password has been updated. You can now sign in with your new credentials."
    >
      <Button asChild className="w-full">
        <Link href={AUTH_ROUTES.login}>Continue to sign in</Link>
      </Button>
    </AuthLayoutShell>
  );
}
