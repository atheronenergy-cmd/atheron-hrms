import type { Prisma, RecordStatus } from "@prisma/client";
import type { z } from "zod";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { DepartmentListItem } from "@/modules/organization/domain/types";
import type { DepartmentInput, departmentQuerySchema } from "@/modules/organization/validation/schemas";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

type DepartmentQuery = z.infer<typeof departmentQuerySchema>;

export class DepartmentService extends BaseRepository {
  async list(query: DepartmentQuery) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.DepartmentWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
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
      prisma.department.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
        include: {
          branch: { select: { name: true } },
          _count: { select: { employees: true } },
        },
      }),
      prisma.department.count({ where }),
    ]);

    const items: DepartmentListItem[] = rows.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
      branchName: d.branch?.name ?? null,
      status: d.status,
      employeeCount: d._count.employees,
      version: d.version,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async getById(id: string) {
    const companyId = this.requireCompanyId();
    const dept = await prisma.department.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!dept) throw new NotFoundError("Department", id);
    return dept;
  }

  async create(input: DepartmentInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.department.findFirst({
      where: { companyId, code: input.code, deletedAt: null },
    });
    if (existing) throw new ConflictError("Department code already exists");

    return prisma.department.create({
      data: {
        companyId,
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description,
        branchId: input.branchId,
        parentDepartmentId: input.parentDepartmentId,
        status: input.status as RecordStatus,
        remarks: input.remarks,
        createdBy: actorUserId,
      },
    });
  }

  async update(
    id: string,
    input: Partial<DepartmentInput> & { version: number },
    actorUserId: string,
  ) {
    await this.getById(id);
    return prisma.department.update({
      where: { id, version: input.version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
        ...(input.parentDepartmentId !== undefined
          ? { parentDepartmentId: input.parentDepartmentId }
          : {}),
        ...(input.status !== undefined ? { status: input.status as RecordStatus } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  async deactivate(id: string, version: number, actorUserId: string) {
    return this.update(id, { status: "inactive", version }, actorUserId);
  }

  private requireCompanyId() {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createDepartmentService(companyId: string) {
  return new DepartmentService(companyId);
}
