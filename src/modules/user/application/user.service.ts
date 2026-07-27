import type { UserStatus } from "@prisma/client";
import { headers } from "next/headers";

import { invalidateAuthorizationCache } from "@/infrastructure/authorization/permission-cache.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import { recordUserAudit } from "@/modules/user/application/user-audit.service";
import type { UserDetail, UserListItem } from "@/modules/user/domain/types";
import {
  createUserAdminRepository,
  mapUserDetail,
} from "@/modules/user/infrastructure/repositories/prisma-user-admin.repository";
import type { CreateUserInput, UpdateUserInput, UserListQuery } from "@/modules/user/validation/schemas";
import { ConflictError, NotFoundError } from "@/shared/errors";
import type { PaginatedResult } from "@/shared/types";

import { invitationService } from "./invitation.service";

async function getActorMeta() {
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
  };
}

export class UserService {
  constructor(private readonly companyId?: string) {}

  private repo() {
    return createUserAdminRepository(this.companyId);
  }

  async listUsers(query: UserListQuery): Promise<PaginatedResult<UserListItem>> {
    return this.repo().findManyAdmin(query);
  }

  async getUser(id: string): Promise<UserDetail> {
    const user = await this.repo().findByIdWithRoles(id);
    if (!user) throw new NotFoundError("User", id);
    return mapUserDetail(user);
  }

  async createUser(input: CreateUserInput, actorUserId: string): Promise<UserDetail> {
    const existing = await prisma.user.findFirst({
      where: { email: input.email.toLowerCase(), deletedAt: null },
    });
    if (existing) throw new ConflictError("A user with this email already exists");

    const { ipAddress, userAgent } = await getActorMeta();

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          companyId: input.companyId ?? this.companyId ?? null,
          email: input.email.toLowerCase(),
          name: input.name,
          phone: input.phone,
          status: input.sendInvitation ? "pending_verification" : "active",
          remarks: input.remarks,
          createdBy: actorUserId,
        },
      });

      for (const roleId of input.roleIds) {
        await tx.userRole.create({
          data: { userId: created.id, roleId, assignedBy: actorUserId },
        });
      }

      return created;
    });

    if (input.sendInvitation) {
      await invitationService.sendInvitation(user.id, actorUserId);
    }

    await recordUserAudit("user_created", {
      companyId: user.companyId,
      actorUserId,
      targetUserId: user.id,
      ipAddress,
      userAgent,
      metadata: { email: user.email, roleIds: input.roleIds },
    });

    invalidateAuthorizationCache(user.id);
    return this.getUser(user.id);
  }

  async updateUser(input: UpdateUserInput, actorUserId: string): Promise<UserDetail> {
    const existing = await this.repo().findByIdWithRoles(input.id);
    if (!existing) throw new NotFoundError("User", input.id);

    const emailTaken = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
        deletedAt: null,
        NOT: { id: input.id },
      },
    });
    if (emailTaken) throw new ConflictError("Email is already in use");

    const { ipAddress, userAgent } = await getActorMeta();

    await this.repo().updateAdmin(
      input.id,
      {
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        remarks: input.remarks,
        updatedBy: actorUserId,
      },
      input.version,
    );

    await recordUserAudit("user_updated", {
      companyId: existing.companyId,
      actorUserId,
      targetUserId: input.id,
      ipAddress,
      userAgent,
    });

    return this.getUser(input.id);
  }

  async changeStatus(
    userId: string,
    status: UserStatus,
    version: number,
    actorUserId: string,
  ): Promise<UserDetail> {
    const existing = await this.repo().findByIdWithRoles(userId);
    if (!existing) throw new NotFoundError("User", userId);

    const { ipAddress, userAgent } = await getActorMeta();

    await this.repo().updateStatus(userId, status, version, actorUserId);

    if (status === "inactive" || status === "suspended") {
      await prisma.session.deleteMany({ where: { userId } });
    }

    await recordUserAudit("user_status_changed", {
      companyId: existing.companyId,
      actorUserId,
      targetUserId: userId,
      ipAddress,
      userAgent,
      metadata: { from: existing.status, to: status },
    });

    invalidateAuthorizationCache(userId);
    return this.getUser(userId);
  }

  async deleteUser(userId: string, actorUserId: string): Promise<void> {
    const existing = await this.repo().findByIdWithRoles(userId);
    if (!existing) throw new NotFoundError("User", userId);

    const { ipAddress, userAgent } = await getActorMeta();

    await this.repo().softDeleteAdmin(userId, actorUserId);
    await prisma.session.deleteMany({ where: { userId } });

    await recordUserAudit("user_deleted", {
      companyId: existing.companyId,
      actorUserId,
      targetUserId: userId,
      ipAddress,
      userAgent,
    });

    invalidateAuthorizationCache(userId);
  }
}

export const createUserService = (companyId?: string) => new UserService(companyId);
