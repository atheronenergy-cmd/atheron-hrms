"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import {
  type AuthorizationContext,
  canAccess,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
  type PermissionKey,
} from "./engine";
import {
  deserializeAuthorizationContext,
  type SerializableAuthorizationContext,
  serializeAuthorizationContext,
} from "./serialization";

export type { SerializableAuthorizationContext };
export { deserializeAuthorizationContext, serializeAuthorizationContext };

const defaultContext: AuthorizationContext = {
  userId: "",
  companyId: null,
  permissions: new Set(),
  roles: new Set(),
  scope: "self",
  branchIds: [],
  employeeId: null,
};

const AuthorizationContextProvider = createContext<AuthorizationContext>(defaultContext);

export function PermissionProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AuthorizationContext;
}) {
  return (
    <AuthorizationContextProvider.Provider value={value}>
      {children}
    </AuthorizationContextProvider.Provider>
  );
}

export function usePermissions(): AuthorizationContext {
  return useContext(AuthorizationContextProvider);
}

/** @deprecated Use usePermissions */
export function usePermissionContext(): AuthorizationContext {
  return usePermissions();
}

export function usePermission(permission: PermissionKey): boolean {
  const context = usePermissions();
  return hasPermission(context, permission);
}

export function useRole(roleSlug: string): boolean {
  const context = usePermissions();
  return hasRole(context, roleSlug);
}

export function useCan(permission: PermissionKey): boolean {
  const context = usePermissions();
  return canAccess(context, permission);
}

export function useCanAny(permissions: PermissionKey[]): boolean {
  const context = usePermissions();
  return hasAnyPermission(context, permissions);
}

export function useCanAll(permissions: PermissionKey[]): boolean {
  const context = usePermissions();
  return hasAllPermissions(context, permissions);
}

export function useHasAnyRole(roleSlugs: string[]): boolean {
  const context = usePermissions();
  return hasAnyRole(context, roleSlugs);
}

export function useAuthorization() {
  const context = usePermissions();
  return useMemo(
    () => ({
      context,
      can: (permission: PermissionKey) => canAccess(context, permission),
      hasRole: (roleSlug: string) => hasRole(context, roleSlug),
      isGlobal: context.scope === "global",
    }),
    [context],
  );
}
