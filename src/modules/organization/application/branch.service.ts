import type { Prisma, RecordStatus } from "@prisma/client";
import type { z } from "zod";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { BranchListItem } from "@/modules/organization/domain/types";
import type { BranchInput, branchQuerySchema } from "@/modules/organization/validation/schemas";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

type BranchQuery = z.infer<typeof branchQuerySchema>;

function parseAddressCity(address: unknown): string | null {
  if (!address || typeof address !== "object") return null;
  const city = (address as { city?: string }).city;
  return city ?? null;
}

export class BranchService extends BaseRepository {
  async list(query: BranchQuery) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.BranchWhereInput = {
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
      prisma.branch.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
        include: {
          manager: { select: { name: true } },
          _count: { select: { employees: true } },
        },
      }),
      prisma.branch.count({ where }),
    ]);

    const items: BranchListItem[] = rows.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      phone: b.phone,
      email: b.email,
      isHeadOffice: b.isHeadOffice,
      status: b.status,
      city: parseAddressCity(b.address),
      managerName: b.manager?.name ?? null,
      employeeCount: b._count.employees,
      version: b.version,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async getById(id: string) {
    const companyId = this.requireCompanyId();
    const branch = await prisma.branch.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { manager: { select: { id: true, name: true, email: true } } },
    });
    if (!branch) throw new NotFoundError("Branch", id);
    return branch;
  }

  async create(input: BranchInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.branch.findFirst({
      where: { companyId, code: input.code, deletedAt: null },
    });
    if (existing) throw new ConflictError("Branch code already exists");

    return prisma.branch.create({
      data: {
        companyId,
        name: input.name,
        code: input.code.toUpperCase(),
        managerUserId: input.managerUserId,
        phone: input.phone || null,
        email: input.email || null,
        address: (input.address ?? {}) as Prisma.InputJsonValue,
        latitude: input.latitude,
        longitude: input.longitude,
        geofenceRadiusMeters: input.geofenceRadiusMeters,
        gpsAttendanceEnabled: input.gpsAttendanceEnabled,
        allowOutsideLocation: input.allowOutsideLocation,
        locationRequired: input.locationRequired,
        isHeadOffice: input.isHeadOffice,
        status: input.status as RecordStatus,
        remarks: input.remarks,
        createdBy: actorUserId,
      },
    });
  }

  async update(id: string, input: Partial<BranchInput> & { version: number }, actorUserId: string) {
    this.requireCompanyId();
    await this.getById(id);
    return prisma.branch.update({
      where: { id, version: input.version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
        ...(input.managerUserId !== undefined ? { managerUserId: input.managerUserId } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        ...(input.address !== undefined ? { address: input.address as Prisma.InputJsonValue } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.geofenceRadiusMeters !== undefined
          ? { geofenceRadiusMeters: input.geofenceRadiusMeters }
          : {}),
        ...(input.gpsAttendanceEnabled !== undefined
          ? { gpsAttendanceEnabled: input.gpsAttendanceEnabled }
          : {}),
        ...(input.allowOutsideLocation !== undefined
          ? { allowOutsideLocation: input.allowOutsideLocation }
          : {}),
        ...(input.locationRequired !== undefined ? { locationRequired: input.locationRequired } : {}),
        ...(input.isHeadOffice !== undefined ? { isHeadOffice: input.isHeadOffice } : {}),
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

export function createBranchService(companyId: string) {
  return new BranchService(companyId);
}
