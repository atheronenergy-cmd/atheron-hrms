import type { Prisma, RecordStatus } from "@prisma/client";
import type { z } from "zod";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { DesignationListItem } from "@/modules/organization/domain/types";
import type { DesignationInput, designationQuerySchema } from "@/modules/organization/validation/schemas";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

type DesignationQuery = z.infer<typeof designationQuerySchema>;

export class DesignationService extends BaseRepository {
  async list(query: DesignationQuery) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.DesignationWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
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
      prisma.designation.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ level: "asc" }, { name: "asc" }],
        include: {
          department: { select: { name: true } },
          _count: { select: { employees: true } },
        },
      }),
      prisma.designation.count({ where }),
    ]);

    const items: DesignationListItem[] = rows.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      level: d.level,
      departmentName: d.department?.name ?? null,
      status: d.status,
      employeeCount: d._count.employees,
      version: d.version,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async getById(id: string) {
    const companyId = this.requireCompanyId();
    const item = await prisma.designation.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!item) throw new NotFoundError("Designation", id);
    return item;
  }

  async create(input: DesignationInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.designation.findFirst({
      where: { companyId, code: input.code, deletedAt: null },
    });
    if (existing) throw new ConflictError("Designation code already exists");

    return prisma.designation.create({
      data: {
        companyId,
        name: input.name,
        code: input.code.toUpperCase(),
        level: input.level,
        departmentId: input.departmentId,
        description: input.description,
        status: input.status as RecordStatus,
        remarks: input.remarks,
        createdBy: actorUserId,
      },
    });
  }

  async update(
    id: string,
    input: Partial<DesignationInput> & { version: number },
    actorUserId: string,
  ) {
    await this.getById(id);
    return prisma.designation.update({
      where: { id, version: input.version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
        ...(input.level !== undefined ? { level: input.level } : {}),
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
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

export function createDesignationService(companyId: string) {
  return new DesignationService(companyId);
}
