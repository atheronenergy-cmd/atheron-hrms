"use client";

import type { ReactNode } from "react";

import { AccessDenied } from "@/components/permissions/access-denied";
import { useHasAnyRole, useRole } from "@/shared/permissions/use-permission";

type RoleGuardProps = {
  role?: string;
  roles?: string[];
  children: ReactNode;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
};

export function RoleGuard({
  role,
  roles,
  children,
  fallback = null,
  showAccessDenied = false,
}: RoleGuardProps) {
  const hasSingleRole = useRole(role ?? "");
  const hasAny = useHasAnyRole(roles ?? []);
  const allowed = role ? hasSingleRole : roles ? hasAny : false;

  if (allowed) return <>{children}</>;
  if (showAccessDenied) return <AccessDenied message="Your role does not allow this action." />;
  return <>{fallback}</>;
}
