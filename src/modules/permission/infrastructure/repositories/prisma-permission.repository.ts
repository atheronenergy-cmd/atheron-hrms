import type { Permission } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";

export interface PermissionRepository {
  findAll(): Promise<Permission[]>;
  findByKey(key: string): Promise<Permission | null>;
  findByModule(module: string): Promise<Permission[]>;
  findByIds(ids: string[]): Promise<Permission[]>;
}

export class PrismaPermissionRepository extends BaseRepository implements PermissionRepository {
  async findAll(): Promise<Permission[]> {
    return this.db.permission.findMany({
      orderBy: [{ module: "asc" }, { resource: "asc" }, { action: "asc" }],
    });
  }

  async findByKey(key: string): Promise<Permission | null> {
    return this.db.permission.findUnique({ where: { key } });
  }

  async findByModule(module: string): Promise<Permission[]> {
    return this.db.permission.findMany({
      where: { module },
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    });
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    return this.db.permission.findMany({ where: { id: { in: ids } } });
  }
}

export const createPermissionRepository = () => new PrismaPermissionRepository();
