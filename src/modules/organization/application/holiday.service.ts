import type { Prisma, RecordStatus } from "@prisma/client";
import type { z } from "zod";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { HolidayListItem } from "@/modules/organization/domain/types";
import type { HolidayInput, holidayQuerySchema } from "@/modules/organization/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

type HolidayQuery = z.infer<typeof holidayQuerySchema>;

export class HolidayService extends BaseRepository {
  async list(query: HolidayQuery) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.HolidayWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.calendarYear ? { calendarYear: query.calendarYear } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" } }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.holiday.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { date: "asc" },
        include: { branch: { select: { name: true } } },
      }),
      prisma.holiday.count({ where }),
    ]);

    const items: HolidayListItem[] = rows.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date,
      holidayType: h.holidayType,
      branchName: h.branch?.name ?? null,
      calendarYear: h.calendarYear,
      status: h.status,
      version: h.version,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async getById(id: string) {
    const companyId = this.requireCompanyId();
    const holiday = await prisma.holiday.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!holiday) throw new NotFoundError("Holiday", id);
    return holiday;
  }

  async create(input: HolidayInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const calendarYear = input.date.getFullYear();
    return prisma.holiday.create({
      data: {
        companyId,
        name: input.name,
        date: input.date,
        holidayType: input.holidayType,
        description: input.description,
        branchId: input.branchId,
        applicableDepartmentIds: input.applicableDepartmentIds as Prisma.InputJsonValue,
        calendarYear,
        status: input.status as RecordStatus,
        remarks: input.remarks,
        createdBy: actorUserId,
      },
    });
  }

  async update(id: string, input: Partial<HolidayInput> & { version: number }, actorUserId: string) {
    await this.getById(id);
    return prisma.holiday.update({
      where: { id, version: input.version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.date !== undefined
          ? { date: input.date, calendarYear: input.date.getFullYear() }
          : {}),
        ...(input.holidayType !== undefined ? { holidayType: input.holidayType } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
        ...(input.applicableDepartmentIds !== undefined
          ? { applicableDepartmentIds: input.applicableDepartmentIds as Prisma.InputJsonValue }
          : {}),
        ...(input.status !== undefined ? { status: input.status as RecordStatus } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  async softDelete(id: string, version: number, actorUserId: string) {
    await this.getById(id);
    return prisma.holiday.update({
      where: { id, version },
      data: { deletedAt: new Date(), deletedBy: actorUserId, version: { increment: 1 } },
    });
  }

  private requireCompanyId() {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createHolidayService(companyId: string) {
  return new HolidayService(companyId);
}
