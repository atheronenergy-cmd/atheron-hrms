import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { GeoFenceConfig } from "@/modules/attendance/gps/domain/types";
import type { GeoFenceInput } from "@/modules/attendance/gps/validation/schemas";
import { NotFoundError } from "@/shared/errors";

function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

export class GeoFenceService extends BaseRepository {
  async listByBranch(branchId: string) {
    const companyId = this.requireCompanyId();
    return prisma.geoFence.findMany({
      where: { companyId, branchId, status: "active" },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  async getBranchGeoConfig(branchId: string): Promise<GeoFenceConfig | null> {
    const companyId = this.requireCompanyId();
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, companyId, deletedAt: null },
    });
    if (!branch) return null;

    const defaultFence = await prisma.geoFence.findFirst({
      where: { companyId, branchId, status: "active", isDefault: true },
      orderBy: { createdAt: "asc" },
    });

    const lat = decimalToNumber(defaultFence?.latitude ?? branch.latitude);
    const lng = decimalToNumber(defaultFence?.longitude ?? branch.longitude);
    const radius = defaultFence?.radiusMeters ?? branch.geofenceRadiusMeters;

    if (lat == null || lng == null || radius == null) return null;

    return {
      id: defaultFence?.id ?? branch.id,
      branchId: branch.id,
      branchName: branch.name,
      name: defaultFence?.name ?? branch.name,
      latitude: lat,
      longitude: lng,
      radiusMeters: radius,
      isDefault: defaultFence?.isDefault ?? true,
      gpsAttendanceEnabled: branch.gpsAttendanceEnabled,
      allowOutsideLocation: branch.allowOutsideLocation,
      locationRequired: branch.locationRequired,
    };
  }

  async create(input: GeoFenceInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, companyId, deletedAt: null },
    });
    if (!branch) throw new NotFoundError("Branch", input.branchId);

    if (input.isDefault) {
      await prisma.geoFence.updateMany({
        where: { companyId, branchId: input.branchId, isDefault: true },
        data: { isDefault: false, updatedBy: actorUserId },
      });
    }

    return prisma.geoFence.create({
      data: {
        companyId,
        branchId: input.branchId,
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
        isDefault: input.isDefault,
        createdBy: actorUserId,
      },
    });
  }

  async syncFromBranch(branchId: string, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, companyId, deletedAt: null },
    });
    if (!branch || branch.latitude == null || branch.longitude == null || branch.geofenceRadiusMeters == null) {
      return null;
    }

    const existing = await prisma.geoFence.findFirst({
      where: { companyId, branchId, isDefault: true, status: "active" },
    });

    if (existing) {
      return prisma.geoFence.update({
        where: { id: existing.id },
        data: {
          latitude: branch.latitude,
          longitude: branch.longitude,
          radiusMeters: branch.geofenceRadiusMeters,
          updatedBy: actorUserId,
          version: { increment: 1 },
        },
      });
    }

    return prisma.geoFence.create({
      data: {
        companyId,
        branchId,
        name: `${branch.name} Default`,
        latitude: branch.latitude,
        longitude: branch.longitude,
        radiusMeters: branch.geofenceRadiusMeters,
        isDefault: true,
        createdBy: actorUserId,
      },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createGeoFenceService(companyId: string) {
  return new GeoFenceService(companyId);
}
