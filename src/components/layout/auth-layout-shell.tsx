import Link from "next/link";

import { APP_NAME } from "@/shared/constants/app";

type AuthLayoutShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthLayoutShell({ title, description, children }: AuthLayoutShellProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
        <div>
          <Link href="/" className="text-xl font-semibold tracking-tight">
            {APP_NAME}
          </Link>
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="text-3xl font-bold leading-tight">Enterprise HR management, secured.</h1>
          <p className="text-primary-foreground/80 text-sm leading-relaxed">
            Sign in to access payroll, attendance, leave, and workforce analytics with
            enterprise-grade security and audit trails.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} Atheron HRMS</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 lg:hidden text-center">
            <Link href="/" className="text-lg font-semibold">
              {APP_NAME}
            </Link>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
