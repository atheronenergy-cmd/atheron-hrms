"use client";

import type { ReactNode } from "react";

import { useCan } from "@/shared/permissions/use-permission";

type ProtectedActionProps = {
  permission: string;
  children: (allowed: boolean) => ReactNode;
};

export function ProtectedAction({ permission, children }: ProtectedActionProps) {
  const allowed = useCan(permission);
  return <>{children(allowed)}</>;
}
