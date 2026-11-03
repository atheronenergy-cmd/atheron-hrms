import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { LIVE_SHARE_WINDOW_MS, type LiveLocationShare, type LocationHistoryItem } from "@/modules/attendance/gps/domain/types";
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

  async listCurrent() {
    const companyId = this.requireCompanyId();
    const rows = await prisma.employeeLocationHistory.findMany({
      where: { companyId },
      orderBy: { capturedAt: "desc" },
      take: 400,
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeCode: true, employmentStatus: true },
        },
      },
    });

    const items: LocationHistoryItem[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.employeeId)) continue;
      if (row.employee.employmentStatus === "resigned" || row.employee.employmentStatus === "terminated") continue;
      seen.add(row.employeeId);
      items.push({
        id: row.id,
        employeeId: row.employeeId,
        employeeName: [row.employee.firstName, row.employee.lastName].filter(Boolean).join(" "),
        employeeCode: row.employee.employeeCode,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        accuracy: row.accuracy != null ? Number(row.accuracy) : null,
        address: row.address,
        activityType: row.activityType,
        capturedAt: row.capturedAt.toISOString(),
        riskScore: row.riskScore,
      });
    }
    return items;
  }

  async listLiveShares(): Promise<LiveLocationShare[]> {
    const companyId = this.requireCompanyId();
    const since = new Date(Date.now() - LIVE_SHARE_WINDOW_MS);
    const logs = await prisma.attendanceLog.findMany({
      where: {
        companyId,
        punchedAt: { gte: since },
        punchType: { in: ["in", "out"] },
      },
      orderBy: { punchedAt: "desc" },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeCode: true, employmentStatus: true },
        },
      },
    });

    const latestPunch = new Map<string, (typeof logs)[number]>();
    for (const log of logs) {
      if (!latestPunch.has(log.employeeId)) latestPunch.set(log.employeeId, log);
    }

    const active = [...latestPunch.values()].filter(
      (log) =>
        log.punchType === "in" &&
        log.employee.employmentStatus !== "resigned" &&
        log.employee.employmentStatus !== "terminated",
    );
    if (active.length === 0) return [];

    const earliest = active.reduce(
      (min, log) => (log.punchedAt < min ? log.punchedAt : min),
      active[0]!.punchedAt,
    );
    const locations = await prisma.employeeLocationHistory.findMany({
      where: {
        companyId,
        employeeId: { in: active.map((log) => log.employeeId) },
        capturedAt: { gte: earliest },
      },
      orderBy: { capturedAt: "desc" },
    });

    const latestLocation = new Map<string, (typeof locations)[number]>();
    for (const location of locations) {
      const punch = latestPunch.get(location.employeeId);
      if (!punch || location.capturedAt < punch.punchedAt) continue;
      if (!latestLocation.has(location.employeeId)) latestLocation.set(location.employeeId, location);
    }

    return active.map((log) => {
      const location = latestLocation.get(log.employeeId);
      return {
        employeeId: log.employeeId,
        employeeName: [log.employee.firstName, log.employee.lastName].filter(Boolean).join(" "),
        employeeCode: log.employee.employeeCode,
        sharingSince: log.punchedAt.toISOString(),
        latitude: location ? Number(location.latitude) : null,
        longitude: location ? Number(location.longitude) : null,
        accuracy: location?.accuracy != null ? Number(location.accuracy) : null,
        capturedAt: location?.capturedAt.toISOString() ?? null,
        activityType: location?.activityType ?? null,
      };
    });
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
