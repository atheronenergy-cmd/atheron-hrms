import { roleManagementService } from "@/infrastructure/authorization/role-management.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import { recordUserAudit } from "@/modules/user/application/user-audit.service";
import type { UserPermissionSummary } from "@/modules/user/domain/types";
import type { RoleAssignmentInput } from "@/modules/user/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import { ALL_PERMISSION_KEYS, SYSTEM_PERMISSION_DEFINITIONS } from "@/shared/permissions/definitions";

export class RoleAssignmentService {
  async assignRole(input: RoleAssignmentInput, actorUserId: string) {
    await roleManagementService.assignRoleToUser({
      userId: input.userId,
      roleId: input.roleId,
      branchId: input.branchId,
      actorUserId,
    });

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    await recordUserAudit("user_role_assigned", {
      companyId: user?.companyId,
      actorUserId,
      targetUserId: input.userId,
      metadata: { roleId: input.roleId, branchId: input.branchId },
    });
  }

  async removeRole(userId: string, userRoleId: string, actorUserId: string) {
    await roleManagementService.removeRoleFromUser(userId, userRoleId, actorUserId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    await recordUserAudit("user_role_removed", {
      companyId: user?.companyId,
      actorUserId,
      targetUserId: userId,
      metadata: { userRoleId },
    });
  }

  async getUserPermissions(userId: string): Promise<UserPermissionSummary> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });

    if (userRoles.length === 0) {
      return { modules: [], totalGranted: 0, totalAvailable: ALL_PERMISSION_KEYS.length };
    }

    const grantedMap = new Map<string, Set<string>>();

    for (const ur of userRoles) {
      const roleName = ur.role.name;
      if (ur.role.scope === "global") {
        for (const key of ALL_PERMISSION_KEYS) {
          if (!grantedMap.has(key)) grantedMap.set(key, new Set());
          grantedMap.get(key)!.add(roleName);
        }
        continue;
      }
      for (const rp of ur.role.rolePermissions) {
        const key = rp.permission.key;
        if (!grantedMap.has(key)) grantedMap.set(key, new Set());
        grantedMap.get(key)!.add(roleName);
      }
    }

    const moduleMap = new Map<string, UserPermissionSummary["modules"][0]["permissions"]>();

    for (const def of SYSTEM_PERMISSION_DEFINITIONS) {
      const sources = grantedMap.get(def.key);
      const entry = {
        key: def.key,
        module: def.module,
        resource: def.resource,
        action: def.action,
        description: def.description,
        granted: !!sources && sources.size > 0,
        sourceRoles: sources ? Array.from(sources) : [],
      };

      if (!moduleMap.has(def.module)) moduleMap.set(def.module, []);
      moduleMap.get(def.module)!.push(entry);
    }

    const modules = Array.from(moduleMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([module, permissions]) => ({ module, permissions }));

    const totalGranted = Array.from(grantedMap.keys()).length;

    return {
      modules,
      totalGranted,
      totalAvailable: ALL_PERMISSION_KEYS.length,
    };
  }

  async getUserRoles(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        userRoles: {
          include: { role: true, branch: { select: { id: true, name: true } } },
        },
      },
    });
    if (!user) throw new NotFoundError("User", userId);
    return user.userRoles;
  }

  async listAvailableRoles(companyId?: string | null) {
    return prisma.role.findMany({
      where: {
        deletedAt: null,
        status: "active",
        OR: [{ companyId: null }, { companyId: companyId ?? null }],
      },
      orderBy: { name: "asc" },
    });
  }
}

export const roleAssignmentService = new RoleAssignmentService();
