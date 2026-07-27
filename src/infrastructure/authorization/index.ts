export { authorizationService } from "./authorization.service";
export { resolveUserAuthorization } from "./permission-resolver.service";
export { roleManagementService } from "./role-management.service";
export {
  authorize,
  getAuthorizationContext,
  guardPagePermission,
  requireAnyPermission,
  requireAuthorizationContext,
  requirePermission,
  requireRole,
} from "./server/guards";
