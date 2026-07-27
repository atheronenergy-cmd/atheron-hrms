export type PermissionKey = string;

export type DataScope = "self" | "team" | "branch" | "company" | "global";

export type AuthorizationContext = {
  userId: string;
  companyId: string | null;
  permissions: Set<string>;
  roles: Set<string>;
  scope: DataScope;
  branchIds: string[];
  employeeId: string | null;
};

/** @deprecated Use AuthorizationContext */
export type PermissionContext = AuthorizationContext;

const SCOPE_RANK: Record<DataScope, number> = {
  self: 1,
  team: 2,
  branch: 3,
  company: 4,
  global: 5,
};

export function resolveEffectiveScope(scopes: DataScope[]): DataScope {
  if (scopes.length === 0) return "self";
  return scopes.reduce(
    (best, current) => (SCOPE_RANK[current] > SCOPE_RANK[best] ? current : best),
    scopes[0]!,
  );
}

export function hasPermission(context: AuthorizationContext, permission: PermissionKey): boolean {
  if (context.scope === "global") return true;
  return context.permissions.has(permission);
}

export function hasAnyPermission(context: AuthorizationContext, permissions: PermissionKey[]): boolean {
  return permissions.some((p) => hasPermission(context, p));
}

export function hasAllPermissions(context: AuthorizationContext, permissions: PermissionKey[]): boolean {
  return permissions.every((p) => hasPermission(context, p));
}

export function hasRole(context: AuthorizationContext, roleSlug: string): boolean {
  return context.roles.has(roleSlug);
}

export function hasAnyRole(context: AuthorizationContext, roleSlugs: string[]): boolean {
  return roleSlugs.some((slug) => hasRole(context, slug));
}

export function canAccess(context: AuthorizationContext, permission: PermissionKey): boolean {
  return hasPermission(context, permission);
}

export function checkPermission(
  context: AuthorizationContext,
  permission: PermissionKey,
): { allowed: boolean; reason?: string } {
  if (hasPermission(context, permission)) {
    return { allowed: true };
  }
  return { allowed: false, reason: `Missing permission: ${permission}` };
}

export function checkRole(
  context: AuthorizationContext,
  roleSlug: string,
): { allowed: boolean; reason?: string } {
  if (hasRole(context, roleSlug)) {
    return { allowed: true };
  }
  return { allowed: false, reason: `Missing role: ${roleSlug}` };
}

export { ALL_PERMISSION_KEYS,PERMISSIONS } from "./definitions";
