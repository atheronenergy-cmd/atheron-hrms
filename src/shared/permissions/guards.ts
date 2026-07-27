export { buildScopeFilter, type DataScopeFilter,filterByScope } from "./data-scope";
export { ALL_PERMISSION_KEYS, PERMISSIONS, SYSTEM_PERMISSION_DEFINITIONS } from "./definitions";
export {
  type AuthorizationContext,
  canAccess,
  checkPermission,
  checkRole,
  type DataScope,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
  type PermissionKey,
} from "./engine";
export {
  authorize,
  getAuthorizationContext,
  guardPagePermission,
  requireAnyPermission,
  requireAuthorizationContext,
  requirePermission,
  requireRole,
} from "@/infrastructure/authorization/server/guards";
