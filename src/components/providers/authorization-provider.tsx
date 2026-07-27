"use client";

import type { ReactNode } from "react";

import {
  deserializeAuthorizationContext,
  type SerializableAuthorizationContext,
} from "@/shared/permissions/serialization";
import { PermissionProvider } from "@/shared/permissions/use-permission";

type AuthorizationProviderProps = {
  context: SerializableAuthorizationContext;
  children: ReactNode;
};

export function AuthorizationProvider({ context, children }: AuthorizationProviderProps) {
  return (
    <PermissionProvider value={deserializeAuthorizationContext(context)}>
      {children}
    </PermissionProvider>
  );
}
