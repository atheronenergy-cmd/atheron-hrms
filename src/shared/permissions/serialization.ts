import type { AuthorizationContext } from "@/shared/permissions/engine";

export type SerializableAuthorizationContext = {
  userId: string;
  companyId: string | null;
  permissions: string[];
  roles: string[];
  scope: AuthorizationContext["scope"];
  branchIds: string[];
  employeeId: string | null;
};

export function serializeAuthorizationContext(
  context: AuthorizationContext,
): SerializableAuthorizationContext {
  return {
    userId: context.userId,
    companyId: context.companyId,
    permissions: Array.from(context.permissions),
    roles: Array.from(context.roles),
    scope: context.scope,
    branchIds: context.branchIds,
    employeeId: context.employeeId,
  };
}

export function deserializeAuthorizationContext(
  data: SerializableAuthorizationContext,
): AuthorizationContext {
  return {
    userId: data.userId,
    companyId: data.companyId,
    permissions: new Set(data.permissions),
    roles: new Set(data.roles),
    scope: data.scope,
    branchIds: data.branchIds,
    employeeId: data.employeeId,
  };
}
