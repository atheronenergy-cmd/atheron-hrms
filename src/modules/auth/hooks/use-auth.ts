"use client";

import { useSession as useNextAuthSession } from "next-auth/react";
import { useMemo } from "react";

import type { AuthUser } from "@/shared/constants/auth";
import { usePermissions } from "@/shared/permissions/use-permission";

export function useAuth() {
  const { data: session, status, update } = useNextAuthSession();
  const authz = usePermissions();

  const user = useMemo<AuthUser | null>(() => {
    if (!session?.user?.id) return null;
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      name: session.user.name ?? "",
      companyId: session.user.companyId ?? null,
      emailVerified: session.user.emailVerified ?? null,
      status: "active",
    };
  }, [session]);

  return {
    user,
    session,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    permissions: authz.permissions,
    roles: authz.roles,
    scope: authz.scope,
    updateSession: update,
  };
}

export { useNextAuthSession as useSession };

export function useCurrentUser(): {
  user: AuthUser | null;
  isLoading: boolean;
} {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

export {
  useAuthorization,
  useCan,
  useCanAll,
  useCanAny,
  useHasAnyRole,
  usePermission,
  usePermissions,
  useRole,
} from "@/shared/permissions/use-permission";
