import type { Prisma, User, UserStatus } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import type { UserDetail, UserListItem } from "@/modules/user/domain/types";
import type { UserListQuery } from "@/modules/user/validation/schemas";
import type { PaginatedResult } from "@/shared/types";

export type UserWithRoles = User & {
  userRoles: {
    id: string;
    role: { id: string; name: string; slug: string };
    branchId: string | null;
  }[];
};

export class PrismaUserAdminRepository extends BaseRepository {
  async findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
    return this.db.user.findFirst({
      where: { id, ...this.softDeleteFilter(), ...this.withTenantFilter({}) },
      include: {
        userRoles: {
          include: { role: { select: { id: true, name: true, slug: true } } },
        },
      },
    }) as Promise<UserWithRoles | null>;
  }

  async findManyAdmin(query: UserListQuery): Promise<PaginatedResult<UserListItem>> {
    const where: Prisma.UserWhereInput = {
      ...this.softDeleteFilter(),
      ...this.withTenantFilter({}),
      ...(query.status ? { status: query.status as UserStatus } : {}),
      ...(query.roleId
        ? { userRoles: { some: { roleId: query.roleId } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.createdFrom || query.createdTo
        ? {
            createdAt: {
              ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
              ...(query.createdTo ? { lte: new Date(query.createdTo) } : {}),
            },
          }
        : {}),
    };

    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    return this.paginate(
      ({ skip, take }) =>
        this.db.user
          .findMany({
            where,
            skip,
            take,
            orderBy,
            include: {
              userRoles: {
                include: { role: { select: { id: true, name: true, slug: true } } },
              },
            },
          })
          .then((users) => users.map(mapUserListItem)),
      () => this.db.user.count({ where }),
      query.page,
      query.pageSize,
    );
  }

  async createAdmin(data: Prisma.UserCreateInput): Promise<User> {
    return this.db.user.create({ data });
  }

  async updateAdmin(id: string, data: Prisma.UserUpdateInput, version: number): Promise<User> {
    return this.db.user.update({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
  }

  async updateStatus(id: string, status: UserStatus, version: number, updatedBy: string): Promise<User> {
    return this.db.user.update({
      where: { id, version },
      data: {
        status,
        updatedBy,
        version: { increment: 1 },
        ...(status === "active" ? { lockedUntil: null, failedLoginAttempts: 0 } : {}),
      },
    });
  }

  async softDeleteAdmin(id: string, deletedBy: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, status: "inactive" },
    });
  }

  async getLoginHistory(userId: string, limit = 20) {
    return this.db.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getActivityLogs(userId: string, limit = 20) {
    return this.db.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getSessions(userId: string) {
    return this.db.session.findMany({
      where: { userId, expires: { gt: new Date() } },
      orderBy: { lastActivityAt: "desc" },
    });
  }
}

function mapUserListItem(
  user: User & {
    userRoles: { role: { id: string; name: string; slug: string } }[];
  },
): UserListItem {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    avatarFileId: user.avatarFileId,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    roles: user.userRoles.map((ur) => ur.role),
  };
}

export function mapUserDetail(user: UserWithRoles): UserDetail {
  return {
    ...mapUserListItem(user),
    emailVerified: user.emailVerified,
    companyId: user.companyId,
    remarks: user.remarks,
    version: user.version,
    updatedAt: user.updatedAt,
    createdBy: user.createdBy,
  };
}

export const createUserAdminRepository = (companyId?: string) =>
  new PrismaUserAdminRepository(companyId);
