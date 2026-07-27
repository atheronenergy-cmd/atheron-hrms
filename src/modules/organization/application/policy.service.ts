import type { Prisma, RecordStatus } from "@prisma/client";
import type { z } from "zod";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { PolicyListItem } from "@/modules/organization/domain/types";
import type { PolicyInput, policyQuerySchema } from "@/modules/organization/validation/schemas";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

type PolicyQuery = z.infer<typeof policyQuerySchema>;

export class PolicyService extends BaseRepository {
  async list(query: PolicyQuery) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.HRPolicyWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { code: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.hRPolicy.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      prisma.hRPolicy.count({ where }),
    ]);

    const items: PolicyListItem[] = rows.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      category: p.category,
      status: p.status,
      version: p.version,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async getById(id: string) {
    const companyId = this.requireCompanyId();
    const policy = await prisma.hRPolicy.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!policy) throw new NotFoundError("HR Policy", id);
    return policy;
  }

  async create(input: PolicyInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.hRPolicy.findFirst({
      where: { companyId, code: input.code, deletedAt: null },
    });
    if (existing) throw new ConflictError("Policy code already exists");

    return prisma.hRPolicy.create({
      data: {
        companyId,
        category: input.category,
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description,
        rules: input.rules as Prisma.InputJsonValue,
        status: input.status as RecordStatus,
        remarks: input.remarks,
        createdBy: actorUserId,
      },
    });
  }

  async update(id: string, input: Partial<PolicyInput> & { version: number }, actorUserId: string) {
    await this.getById(id);
    return prisma.hRPolicy.update({
      where: { id, version: input.version },
      data: {
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.rules !== undefined ? { rules: input.rules as Prisma.InputJsonValue } : {}),
        ...(input.status !== undefined ? { status: input.status as RecordStatus } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  private requireCompanyId() {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPolicyService(companyId: string) {
  return new PolicyService(companyId);
}
