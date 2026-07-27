import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { LocationHistoryItem } from "@/modules/attendance/gps/domain/types";
import type { LocationHistoryQueryInput } from "@/modules/attendance/gps/validation/schemas";
import { buildPaginatedResult } from "@/shared/pagination";

type RecordLocationInput = {
  employeeId: string;
  branchId?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  address?: string;
  activityType: string;
  capturedAt: Date;
  deviceInfo?: Record<string, unknown>;
  ipAddress?: string;
  networkType?: string;
  riskScore?: number;
};

export class LocationHistoryService extends BaseRepository {
  async record(input: RecordLocationInput) {
    const companyId = this.requireCompanyId();
    return prisma.employeeLocationHistory.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        branchId: input.branchId ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        altitude: input.altitude,
        address: input.address,
        activityType: input.activityType as Prisma.EmployeeLocationHistoryCreateInput["activityType"],
        capturedAt: input.capturedAt,
        deviceInfo: (input.deviceInfo ?? null) as object,
        ipAddress: input.ipAddress,
        networkType: input.networkType,
        riskScore: input.riskScore ?? 0,
      },
    });
  }

  async list(query: LocationHistoryQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.EmployeeLocationHistoryWhereInput = {
      companyId,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.activityType ? { activityType: query.activityType as Prisma.EnumGpsActivityTypeFilter["equals"] } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            capturedAt: {
              ...(query.dateFrom ? { gte: query.dateFrom } : {}),
              ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.employeeLocationHistory.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { capturedAt: "desc" },
        include: {
          employee: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.employeeLocationHistory.count({ where }),
    ]);

    const items: LocationHistoryItem[] = rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: [r.employee.firstName, r.employee.lastName].filter(Boolean).join(" "),
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      accuracy: r.accuracy != null ? Number(r.accuracy) : null,
      address: r.address,
      activityType: r.activityType,
      capturedAt: r.capturedAt.toISOString(),
      riskScore: r.riskScore,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async getLatest(employeeId: string) {
    const companyId = this.requireCompanyId();
    return prisma.employeeLocationHistory.findFirst({
      where: { companyId, employeeId },
      orderBy: { capturedAt: "desc" },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLocationHistoryService(companyId: string) {
  return new LocationHistoryService(companyId);
}
