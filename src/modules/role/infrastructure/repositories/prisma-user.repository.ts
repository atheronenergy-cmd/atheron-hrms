import type { Prisma, User } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import type { PaginatedResult } from "@/shared/types";
import type { FindManyParams, IRepository } from "@/shared/types/repository.types";

export type CreateUserData = Prisma.UserCreateInput;
export type UpdateUserData = Prisma.UserUpdateInput;
export type UserQuery = FindManyParams & { status?: string };

export interface UserRepository extends IRepository<User, CreateUserData, UpdateUserData, UserQuery> {
  findByEmail(email: string): Promise<User | null>;
}

export class PrismaUserRepository extends BaseRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    return this.db.user.findFirst({
      where: { id, ...this.softDeleteFilter() },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findFirst({
      where: { email: email.toLowerCase(), ...this.softDeleteFilter() },
    });
  }

  async findMany(query: UserQuery): Promise<PaginatedResult<User>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = {
      ...this.softDeleteFilter(),
      ...this.withTenantFilter({}),
      ...(query.status ? { status: query.status as User["status"] } : {}),
    };
    return this.paginate(
      ({ skip, take }) => this.db.user.findMany({ where, skip, take, orderBy: { name: "asc" } }),
      () => this.db.user.count({ where }),
      page,
      pageSize,
    );
  }

  async create(data: CreateUserData): Promise<User> {
    return this.db.user.create({ data });
  }

  async update(id: string, data: UpdateUserData, version: number): Promise<User> {
    return this.db.user.update({ where: { id, version }, data: { ...data, version: { increment: 1 } } });
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  }
}

export const createUserRepository = (companyId?: string) => new PrismaUserRepository(companyId);
