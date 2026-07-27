import type { Permission, Role, UserRole } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";

export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findBySlug(slug: string, companyId?: string | null): Promise<Role | null>;
  findPermissions(roleId: string): Promise<Permission[]>;
  findUserRoles(userId: string): Promise<(UserRole & { role: Role })[]>;
  findByCompany(companyId?: string | null): Promise<Role[]>;
}

export class PrismaRoleRepository extends BaseRepository implements RoleRepository {
  async findById(id: string): Promise<Role | null> {
    return this.db.role.findFirst({
      where: { id, ...this.softDeleteFilter() },
    });
  }

  async findBySlug(slug: string, companyId?: string | null): Promise<Role | null> {
    return this.db.role.findFirst({
      where: {
        slug,
        companyId: companyId ?? this.companyId ?? null,
        ...this.softDeleteFilter(),
      },
    });
  }

  async findPermissions(roleId: string): Promise<Permission[]> {
    const rolePermissions = await this.db.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rolePermissions.map((rp) => rp.permission);
  }

  async findUserRoles(userId: string): Promise<(UserRole & { role: Role })[]> {
    return this.db.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
  }

  async findByCompany(companyId?: string | null): Promise<Role[]> {
    return this.db.role.findMany({
      where: {
        companyId: companyId ?? this.companyId ?? null,
        ...this.softDeleteFilter(),
        status: "active",
      },
      orderBy: { name: "asc" },
    });
  }
}

export const createRoleRepository = (companyId?: string) => new PrismaRoleRepository(companyId);
