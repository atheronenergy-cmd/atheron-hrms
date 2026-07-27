import type { Prisma } from "@prisma/client";

import { prisma } from "@/infrastructure/database/prisma-client";
import { buildPaginatedResult, getPaginationParams } from "@/shared/pagination";
import type { PaginatedResult } from "@/shared/types";

export abstract class BaseRepository {
  protected readonly companyId?: string;

  constructor(companyId?: string) {
    this.companyId = companyId;
  }

  protected withTenantFilter<T extends Record<string, unknown>>(where: T): T {
    if (!this.companyId) return where;
    return { ...where, companyId: this.companyId };
  }

  protected softDeleteFilter() {
    return { deletedAt: null };
  }

  protected activeFilter() {
    return {
      ...this.softDeleteFilter(),
      ...this.withTenantFilter({}),
    };
  }

  protected async paginate<T>(
    findMany: (args: { skip: number; take: number }) => Promise<T[]>,
    count: () => Promise<number>,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<T>> {
    const { skip, take } = getPaginationParams(page, pageSize);
    const [items, totalItems] = await Promise.all([findMany({ skip, take }), count()]);
    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  protected get db() {
    return prisma;
  }
}

export type TransactionClient = Prisma.TransactionClient;

export function runInTransaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
