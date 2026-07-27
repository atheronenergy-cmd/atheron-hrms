import {
  getCachedAuthorization,
  invalidateAuthorizationCache,
  setCachedAuthorization,
} from "@/infrastructure/authorization/permission-cache.service";
import { resolveUserAuthorization } from "@/infrastructure/authorization/permission-resolver.service";
import {
  type AuthorizationContext,
  canAccess,
  checkPermission,
  checkRole,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
  type PermissionKey,
} from "@/shared/permissions/engine";

export class AuthorizationService {
  async getContext(userId: string, companyId?: string | null): Promise<AuthorizationContext> {
    const cached = getCachedAuthorization(userId, companyId ?? null);
    if (cached) return cached;

    const context = await resolveUserAuthorization(userId, companyId);
    setCachedAuthorization(context);
    return context;
  }

  async hasPermission(userId: string, permission: PermissionKey, companyId?: string | null): Promise<boolean> {
    const context = await this.getContext(userId, companyId);
    return hasPermission(context, permission);
  }

  async hasRole(userId: string, roleSlug: string, companyId?: string | null): Promise<boolean> {
    const context = await this.getContext(userId, companyId);
    return hasRole(context, roleSlug);
  }

  async canAccess(userId: string, permission: PermissionKey, companyId?: string | null): Promise<boolean> {
    const context = await this.getContext(userId, companyId);
    return canAccess(context, permission);
  }

  async checkPermission(userId: string, permission: PermissionKey, companyId?: string | null) {
    const context = await this.getContext(userId, companyId);
    return checkPermission(context, permission);
  }

  async checkRole(userId: string, roleSlug: string, companyId?: string | null) {
    const context = await this.getContext(userId, companyId);
    return checkRole(context, roleSlug);
  }

  async hasAnyPermission(
    userId: string,
    permissions: PermissionKey[],
    companyId?: string | null,
  ): Promise<boolean> {
    const context = await this.getContext(userId, companyId);
    return hasAnyPermission(context, permissions);
  }

  async hasAllPermissions(
    userId: string,
    permissions: PermissionKey[],
    companyId?: string | null,
  ): Promise<boolean> {
    const context = await this.getContext(userId, companyId);
    return hasAllPermissions(context, permissions);
  }

  async hasAnyRole(userId: string, roleSlugs: string[], companyId?: string | null): Promise<boolean> {
    const context = await this.getContext(userId, companyId);
    return hasAnyRole(context, roleSlugs);
  }

  invalidate(userId: string, companyId?: string | null): void {
    invalidateAuthorizationCache(userId, companyId);
  }
}

export const authorizationService = new AuthorizationService();

export {
  canAccess,
  checkPermission,
  checkRole,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
};
