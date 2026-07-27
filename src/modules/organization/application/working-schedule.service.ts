import type { Prisma, RecordStatus } from "@prisma/client";
import type { z } from "zod";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { CompanySettingsData, ScheduleListItem } from "@/modules/organization/domain/types";
import type {
  CompanySettingsInput,
  scheduleQuerySchema,
  WorkingScheduleInput,
} from "@/modules/organization/validation/schemas";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

type ScheduleQuery = z.infer<typeof scheduleQuerySchema>;

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(Date.UTC(1970, 0, 1, hours ?? 0, minutes ?? 0, 0));
  return d;
}

function dateToTimeString(date: Date): string {
  return date.toISOString().slice(11, 16);
}

export class WorkingScheduleService extends BaseRepository {
  async list(query: ScheduleQuery) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.ShiftWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
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
      prisma.shift.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.shift.count({ where }),
    ]);

    const items: ScheduleListItem[] = rows.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      startTime: dateToTimeString(s.startTime),
      endTime: dateToTimeString(s.endTime),
      breakDurationMinutes: s.breakDurationMinutes,
      workingDays: Array.isArray(s.workingDays) ? (s.workingDays as number[]) : [],
      status: s.status,
      version: s.version,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async getById(id: string) {
    const companyId = this.requireCompanyId();
    const shift = await prisma.shift.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!shift) throw new NotFoundError("Working Schedule", id);
    return shift;
  }

  async create(input: WorkingScheduleInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.shift.findFirst({
      where: { companyId, code: input.code, deletedAt: null },
    });
    if (existing) throw new ConflictError("Schedule code already exists");

    return prisma.shift.create({
      data: {
        companyId,
        name: input.name,
        code: input.code.toUpperCase(),
        shiftType: input.shiftType,
        startTime: timeStringToDate(input.startTime),
        endTime: timeStringToDate(input.endTime),
        breakDurationMinutes: input.breakDurationMinutes,
        workingDays: input.workingDays as Prisma.InputJsonValue,
        isOvernight: input.isOvernight,
        status: input.status as RecordStatus,
        remarks: input.remarks,
        createdBy: actorUserId,
      },
    });
  }

  async update(
    id: string,
    input: Partial<WorkingScheduleInput> & { version: number },
    actorUserId: string,
  ) {
    await this.getById(id);
    return prisma.shift.update({
      where: { id, version: input.version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
        ...(input.shiftType !== undefined ? { shiftType: input.shiftType } : {}),
        ...(input.startTime !== undefined ? { startTime: timeStringToDate(input.startTime) } : {}),
        ...(input.endTime !== undefined ? { endTime: timeStringToDate(input.endTime) } : {}),
        ...(input.breakDurationMinutes !== undefined
          ? { breakDurationMinutes: input.breakDurationMinutes }
          : {}),
        ...(input.workingDays !== undefined
          ? { workingDays: input.workingDays as Prisma.InputJsonValue }
          : {}),
        ...(input.isOvernight !== undefined ? { isOvernight: input.isOvernight } : {}),
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

export class SettingsService {
  constructor(private readonly companyId: string) {}

  async get(): Promise<CompanySettingsData> {
    const company = await prisma.company.findUniqueOrThrow({ where: { id: this.companyId } });
    const settings = (company.settings ?? {}) as Record<string, unknown>;
    return {
      defaultCurrency: company.currencyCode,
      timezone: company.timezone,
      payrollDate: company.payrollCycleDay,
      dateFormat: company.dateFormat,
      attendanceRules: (settings.attendanceRules ?? {}) as Record<string, unknown>,
      notificationSettings: (settings.notificationSettings ?? {}) as Record<string, unknown>,
      documentSettings: (settings.documentSettings ?? {}) as Record<string, unknown>,
    };
  }

  async update(input: CompanySettingsInput, actorUserId: string) {
    const company = await prisma.company.findUniqueOrThrow({ where: { id: this.companyId } });
    const currentSettings = (company.settings ?? {}) as Record<string, unknown>;

    return prisma.company.update({
      where: { id: this.companyId, version: company.version },
      data: {
        currencyCode: input.defaultCurrency,
        timezone: input.timezone,
        payrollCycleDay: input.payrollDate,
        dateFormat: input.dateFormat,
        settings: {
          ...currentSettings,
          attendanceRules: input.attendanceRules,
          notificationSettings: input.notificationSettings,
          documentSettings: input.documentSettings,
        } as Prisma.InputJsonValue,
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }
}

export function createWorkingScheduleService(companyId: string) {
  return new WorkingScheduleService(companyId);
}

export function createSettingsService(companyId: string) {
  return new SettingsService(companyId);
}
