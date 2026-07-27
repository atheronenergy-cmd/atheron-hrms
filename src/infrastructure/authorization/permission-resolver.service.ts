import type { Permission, PermissionScope, Role, UserRole } from "@prisma/client";

import { prisma } from "@/infrastructure/database/prisma-client";
import {
  type AuthorizationContext,
  type DataScope,
  resolveEffectiveScope,
} from "@/shared/permissions/engine";

export type UserRoleWithPermissions = UserRole & {
  role: Role & {
    rolePermissions: { permission: Permission }[];
  };
};

export type ResolvedAuthorization = AuthorizationContext;

const scopeMap: Record<PermissionScope, DataScope> = {
  global: "global",
  company: "company",
  branch: "branch",
  team: "team",
  self: "self",
};

export async function resolveUserAuthorization(
  userId: string,
  companyId?: string | null,
): Promise<ResolvedAuthorization> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      companyId: true,
      employee: { select: { id: true } },
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return emptyAuthorization(userId, companyId ?? null);
  }

  const permissions = new Set<string>();
  const roles = new Set<string>();
  const scopes: DataScope[] = [];
  const branchIds = new Set<string>();

  for (const userRole of user.userRoles) {
    const role = userRole.role;
    if (!role || role.deletedAt || role.status !== "active") continue;

    roles.add(role.slug);
    scopes.push(scopeMap[role.scope]);

    if (userRole.branchId) {
      branchIds.add(userRole.branchId);
    }

    for (const rp of role.rolePermissions) {
      permissions.add(rp.permission.key);
    }
  }

  const effectiveScope = resolveEffectiveScope(scopes);

  return {
    userId: user.id,
    companyId: user.companyId ?? companyId ?? null,
    permissions,
    roles,
    scope: effectiveScope,
    branchIds: Array.from(branchIds),
    employeeId: user.employee?.id ?? null,
  };
}

function emptyAuthorization(userId: string, companyId: string | null): ResolvedAuthorization {
  return {
    userId,
    companyId,
    permissions: new Set(),
    roles: new Set(),
    scope: "self",
    branchIds: [],
    employeeId: null,
  };
}

export async function resolveRolePermissions(roleId: string): Promise<string[]> {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  return rolePermissions.map((rp) => rp.permission.key);
}
