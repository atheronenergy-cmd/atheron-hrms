import { redirect } from "next/navigation";

import { getCurrentUser } from "@/infrastructure/auth/server";
import { authorizationService } from "@/infrastructure/authorization/authorization.service";
import { ROUTES } from "@/shared/constants/app";
import { AuthorizationError } from "@/shared/errors";
import type { AuthorizationContext, PermissionKey } from "@/shared/permissions/engine";

export async function getAuthorizationContext(): Promise<AuthorizationContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return authorizationService.getContext(user.id, user.companyId);
}

export async function requireAuthorizationContext(): Promise<AuthorizationContext> {
  const context = await getAuthorizationContext();
  if (!context) {
    throw new AuthorizationError("Authentication required");
  }
  return context;
}

export async function authorize(permission: PermissionKey): Promise<AuthorizationContext> {
  const context = await requireAuthorizationContext();
  const result = await authorizationService.checkPermission(
    context.userId,
    permission,
    context.companyId,
  );
  if (!result.allowed) {
    throw new AuthorizationError(result.reason ?? "Access denied");
  }
  return context;
}

export async function requirePermission(permission: PermissionKey): Promise<AuthorizationContext> {
  return authorize(permission);
}

export async function requireRole(roleSlug: string): Promise<AuthorizationContext> {
  const context = await requireAuthorizationContext();
  const result = await authorizationService.checkRole(context.userId, roleSlug, context.companyId);
  if (!result.allowed) {
    throw new AuthorizationError(result.reason ?? "Access denied");
  }
  return context;
}

export async function requireAnyPermission(
  permissions: PermissionKey[],
): Promise<AuthorizationContext> {
  const context = await requireAuthorizationContext();
  const allowed = await authorizationService.hasAnyPermission(
    context.userId,
    permissions,
    context.companyId,
  );
  if (!allowed) {
    throw new AuthorizationError(`Missing one of: ${permissions.join(", ")}`);
  }
  return context;
}

export async function guardPagePermission(permission: PermissionKey): Promise<void> {
  const context = await getAuthorizationContext();
  if (!context) redirect(ROUTES.login);
  const allowed = await authorizationService.hasPermission(
    context.userId,
    permission,
    context.companyId,
  );
  if (!allowed) redirect(ROUTES.unauthorized);
}
