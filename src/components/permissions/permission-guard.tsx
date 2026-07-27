"use client";

import type { ReactNode } from "react";

import { AccessDenied } from "@/components/permissions/access-denied";
import { usePermission } from "@/shared/permissions/use-permission";

type PermissionGuardProps = {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
};

export function PermissionGuard({
  permission,
  children,
  fallback = null,
  showAccessDenied = false,
}: PermissionGuardProps) {
  const allowed = usePermission(permission);

  if (allowed) return <>{children}</>;
  if (showAccessDenied) return <AccessDenied />;
  return <>{fallback}</>;
}
