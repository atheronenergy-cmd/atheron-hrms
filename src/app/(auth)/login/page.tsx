import { Suspense } from "react";

import { LoginForm } from "@/components/forms/login-form";
import { AuthLayoutShell } from "@/components/layout/auth-layout-shell";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthLayoutShell
      title="Welcome back"
      description="Enter your credentials to access your workspace."
    >
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthLayoutShell>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
