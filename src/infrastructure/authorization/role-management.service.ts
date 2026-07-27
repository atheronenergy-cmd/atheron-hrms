import type { Permission, Role } from "@prisma/client";

import { invalidateAuthorizationCache } from "@/infrastructure/authorization/permission-cache.service";
import { recordRbacAudit } from "@/infrastructure/authorization/rbac-audit.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import { ConflictError, NotFoundError } from "@/shared/errors";

export type CreateRoleInput = {
  companyId?: string | null;
  name: string;
  slug: string;
  description?: string;
  permissionIds: string[];
  actorUserId: string;
};

export type UpdateRoleInput = {
  roleId: string;
  name?: string;
  description?: string;
  permissionIds?: string[];
  actorUserId: string;
};

export type AssignRoleInput = {
  userId: string;
  roleId: string;
  branchId?: string;
  actorUserId: string;
};

export class RoleManagementService {
  async createRole(input: CreateRoleInput): Promise<Role> {
    const existing = await prisma.role.findFirst({
      where: { slug: input.slug, companyId: input.companyId ?? null, deletedAt: null },
    });
    if (existing) throw new ConflictError(`Role slug '${input.slug}' already exists`);

    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          companyId: input.companyId ?? null,
          name: input.name,
          slug: input.slug,
          description: input.description,
          isSystem: false,
          scope: "company",
          status: "active",
          createdBy: input.actorUserId,
        },
      });

      if (input.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: input.permissionIds.map((permissionId) => ({
            roleId: created.id,
            permissionId,
          })),
        });
      }

      return created;
    });

    await recordRbacAudit("role_created", {
      companyId: input.companyId,
      userId: input.actorUserId,
      roleId: role.id,
      metadata: { slug: role.slug, permissionCount: input.permissionIds.length },
    });

    return role;
  }

  async updateRole(input: UpdateRoleInput): Promise<Role> {
    const role = await prisma.role.findFirst({
      where: { id: input.roleId, deletedAt: null },
    });
    if (!role) throw new NotFoundError("Role", input.roleId);
    if (role.isSystem) throw new ConflictError("System roles cannot be modified");

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.role.update({
        where: { id: input.roleId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          updatedBy: input.actorUserId,
          version: { increment: 1 },
        },
      });

      if (input.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: input.roleId } });
        if (input.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: input.permissionIds.map((permissionId) => ({
              roleId: input.roleId,
              permissionId,
            })),
          });
        }
        await recordRbacAudit("permission_changed", {
          companyId: role.companyId,
          userId: input.actorUserId,
          roleId: role.id,
          metadata: { permissionCount: input.permissionIds.length },
        });
      }

      return result;
    });

    await recordRbacAudit("role_updated", {
      companyId: role.companyId,
      userId: input.actorUserId,
      roleId: role.id,
    });

    return updated;
  }

  async deleteRole(roleId: string, actorUserId: string): Promise<void> {
    const role = await prisma.role.findFirst({ where: { id: roleId, deletedAt: null } });
    if (!role) throw new NotFoundError("Role", roleId);
    if (role.isSystem) throw new ConflictError("System roles cannot be deleted");

    await prisma.role.update({
      where: { id: roleId },
      data: { deletedAt: new Date(), deletedBy: actorUserId, status: "inactive" },
    });

    await recordRbacAudit("role_deleted", {
      companyId: role.companyId,
      userId: actorUserId,
      roleId,
    });
  }

  async cloneRole(roleId: string, newSlug: string, newName: string, actorUserId: string): Promise<Role> {
    const source = await prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
      include: { rolePermissions: true },
    });
    if (!source) throw new NotFoundError("Role", roleId);

    const existing = await prisma.role.findFirst({
      where: { slug: newSlug, companyId: source.companyId, deletedAt: null },
    });
    if (existing) throw new ConflictError(`Role slug '${newSlug}' already exists`);

    const cloned = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          companyId: source.companyId,
          name: newName,
          slug: newSlug,
          description: source.description,
          isSystem: false,
          scope: source.scope,
          status: "active",
          createdBy: actorUserId,
        },
      });

      if (source.rolePermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: source.rolePermissions.map((rp) => ({
            roleId: created.id,
            permissionId: rp.permissionId,
          })),
        });
      }

      return created;
    });

    await recordRbacAudit("role_cloned", {
      companyId: source.companyId,
      userId: actorUserId,
      roleId: cloned.id,
      metadata: { sourceRoleId: roleId },
    });

    return cloned;
  }

  async assignPermissions(roleId: string, permissionIds: string[], actorUserId: string): Promise<void> {
    await this.updateRole({ roleId, permissionIds, actorUserId });
  }

  async assignRoleToUser(input: AssignRoleInput): Promise<void> {
    const role = await prisma.role.findFirst({ where: { id: input.roleId, deletedAt: null } });
    if (!role) throw new NotFoundError("Role", input.roleId);

    await prisma.userRole.create({
      data: {
        userId: input.userId,
        roleId: input.roleId,
        branchId: input.branchId,
        assignedBy: input.actorUserId,
      },
    });

    invalidateAuthorizationCache(input.userId);

    await recordRbacAudit("role_assigned", {
      companyId: role.companyId,
      userId: input.actorUserId,
      roleId: input.roleId,
      targetUserId: input.userId,
      metadata: { branchId: input.branchId },
    });
  }

  async removeRoleFromUser(userId: string, userRoleId: string, actorUserId: string): Promise<void> {
    const userRole = await prisma.userRole.findFirst({
      where: { id: userRoleId, userId },
      include: { role: true },
    });
    if (!userRole) throw new NotFoundError("UserRole", userRoleId);

    await prisma.userRole.delete({ where: { id: userRoleId } });
    invalidateAuthorizationCache(userId);

    await recordRbacAudit("role_removed", {
      companyId: userRole.role.companyId,
      userId: actorUserId,
      roleId: userRole.roleId,
      targetUserId: userId,
    });
  }

  async listPermissions(): Promise<Permission[]> {
    return prisma.permission.findMany({ orderBy: [{ module: "asc" }, { resource: "asc" }, { action: "asc" }] });
  }
}

export const roleManagementService = new RoleManagementService();
