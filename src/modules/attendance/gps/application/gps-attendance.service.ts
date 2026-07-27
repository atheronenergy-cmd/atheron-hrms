import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createAttendanceService } from "@/modules/attendance/application/attendance.service";
import type { GpsDeviceContext, GpsDashboardData, GpsLocationStatus, LocationPermissionState } from "@/modules/attendance/gps/domain/types";
import { createGeoFenceService } from "@/modules/attendance/gps/application/geo-fence.service";
import { createFraudDetectionService } from "@/modules/attendance/gps/application/fraud-detection.service";
import { createLocationHistoryService } from "@/modules/attendance/gps/application/location-history.service";
import { locationValidationService } from "@/modules/attendance/gps/application/location-validation.service";
import type { FieldDutyInput, GpsCheckInInput, GpsCheckOutInput } from "@/modules/attendance/gps/validation/schemas";
import { NotFoundError, ValidationError } from "@/shared/errors";

type GpsPunchContext = {
  actorUserId: string;
  ipAddress?: string;
  userAgent?: string;
};

export class GPSAttendanceService extends BaseRepository {
  async resolveEmployeeId(userId: string, employeeId?: string) {
    const companyId = this.requireCompanyId();
    if (employeeId) {
      const emp = await prisma.employee.findFirst({
        where: { id: employeeId, companyId, deletedAt: null },
      });
      if (!emp) throw new NotFoundError("Employee", employeeId);
      return emp;
    }

    const emp = await prisma.employee.findFirst({
      where: { userId, companyId, deletedAt: null },
    });
    if (!emp) throw new NotFoundError("Employee for user", userId);
    return emp;
  }

  async getLocationStatus(employeeId: string, permissionState: LocationPermissionState = "granted"): Promise<GpsLocationStatus> {
    const companyId = this.requireCompanyId();
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
    });
    if (!emp) throw new NotFoundError("Employee", employeeId);

    const geoFenceService = createGeoFenceService(companyId);
    const historyService = createLocationHistoryService(companyId);
    const config = await geoFenceService.getBranchGeoConfig(emp.branchId);
    const lastLocation = await historyService.getLatest(employeeId);

    return {
      employeeId: emp.id,
      branchId: emp.branchId,
      gpsAttendanceEnabled: config?.gpsAttendanceEnabled ?? false,
      locationRequired: config?.locationRequired ?? true,
      allowOutsideLocation: config?.allowOutsideLocation ?? false,
      permissionState,
      geoFence: config,
      lastLocation: lastLocation
        ? {
            latitude: Number(lastLocation.latitude),
            longitude: Number(lastLocation.longitude),
            accuracy: lastLocation.accuracy != null ? Number(lastLocation.accuracy) : null,
            capturedAt: lastLocation.capturedAt.toISOString(),
            activityType: lastLocation.activityType,
          }
        : null,
    };
  }

  async checkIn(input: GpsCheckInInput, context: GpsPunchContext, allowOverride = false) {
    return this.processGpsPunch({
      input,
      punchType: "in",
      activityType: input.activityType,
      context,
      allowOverride,
    });
  }

  async checkOut(input: GpsCheckOutInput, context: GpsPunchContext, allowOverride = false) {
    return this.processGpsPunch({
      input,
      punchType: "out",
      activityType: input.activityType,
      context,
      allowOverride,
    });
  }

  async fieldDuty(input: FieldDutyInput, context: GpsPunchContext, allowOverride = false) {
    const activityType =
      input.activityType ??
      (input.action === "start" ? "duty_start" : input.action === "end" ? "duty_end" : "location_punch");

    if (input.action === "punch") {
      return this.processLocationPunch(input, activityType, context, allowOverride);
    }

    const punchType = input.action === "start" ? "in" : "out";
    return this.processGpsPunch({
      input,
      punchType,
      activityType,
      context,
      allowOverride,
      skipRadiusForField: true,
    });
  }

  async getDashboard(): Promise<GpsDashboardData> {
    const companyId = this.requireCompanyId();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [branches, recentLocations, todayGpsPunches, invalidAttempts] = await Promise.all([
      prisma.branch.findMany({
        where: { companyId, deletedAt: null },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          geofenceRadiusMeters: true,
          gpsAttendanceEnabled: true,
        },
        orderBy: { name: "asc" },
      }),
      createLocationHistoryService(companyId).list({ page: 1, pageSize: 20 }),
      prisma.gpsAttendance.count({ where: { companyId, capturedAt: { gte: todayStart } } }),
      prisma.locationValidationLog.count({
        where: {
          companyId,
          createdAt: { gte: todayStart },
          validationStatus: { not: "valid" },
        },
      }),
    ]);

    return {
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        latitude: b.latitude != null ? Number(b.latitude) : null,
        longitude: b.longitude != null ? Number(b.longitude) : null,
        radiusMeters: b.geofenceRadiusMeters,
        gpsEnabled: b.gpsAttendanceEnabled,
      })),
      recentLocations: recentLocations.items,
      todayGpsPunches,
      invalidAttempts,
    };
  }

  private async processGpsPunch(params: {
    input: GpsCheckInInput | GpsCheckOutInput | FieldDutyInput;
    punchType: "in" | "out";
    activityType: string;
    context: GpsPunchContext;
    allowOverride: boolean;
    skipRadiusForField?: boolean;
  }) {
    const companyId = this.requireCompanyId();
    const emp = await this.resolveEmployeeId(params.context.actorUserId, params.input.employeeId);
    const capturedAt = params.input.coordinates.timestamp ?? new Date();
    const device = this.mergeDeviceContext(params.input.deviceInfo, params.context);

    const validation = await locationValidationService.validate({
      companyId,
      branchId: emp.branchId,
      latitude: params.input.coordinates.latitude,
      longitude: params.input.coordinates.longitude,
      accuracy: params.input.coordinates.accuracy,
      permissionState: params.input.permissionState,
      device,
      overrideValidation: params.allowOverride && params.input.overrideValidation,
      activityType: params.activityType,
    });

    if (!validation.isValid && !params.skipRadiusForField) {
      await this.logValidation(emp.id, emp.branchId, params.input, validation, device);
      throw new ValidationError(validation.rejectionReason ?? "Location validation failed");
    }

    const attendanceService = createAttendanceService(companyId);
    const attendance = await attendanceService.punch(
      {
        employeeId: emp.id,
        punchType: params.punchType,
        method: "gps",
        timestamp: capturedAt,
        location: {
          latitude: params.input.coordinates.latitude,
          longitude: params.input.coordinates.longitude,
          accuracy: params.input.coordinates.accuracy,
          address: params.input.coordinates.address,
        },
        deviceInfo: device as Record<string, unknown>,
      },
      params.context.actorUserId,
    );

    const gpsRecord = await prisma.gpsAttendance.create({
      data: {
        companyId,
        employeeId: emp.id,
        attendanceId: attendance.id,
        branchId: emp.branchId,
        geoFenceId: validation.geoFenceId,
        activityType: params.activityType as Prisma.GpsAttendanceCreateInput["activityType"],
        latitude: params.input.coordinates.latitude,
        longitude: params.input.coordinates.longitude,
        accuracy: params.input.coordinates.accuracy,
        altitude: params.input.coordinates.altitude,
        address: params.input.coordinates.address,
        capturedAt,
        validationStatus: validation.status as Prisma.GpsAttendanceCreateInput["validationStatus"],
        distanceFromOfficeMeters: validation.distanceMeters,
        isWithinGeofence: validation.status === "valid" || (validation.status === "outside_radius" && validation.isValid),
        deviceInfo: device as object,
        ipAddress: device.ipAddress,
        networkType: device.networkType,
        riskScore: validation.riskScore,
      },
    });

    await createLocationHistoryService(companyId).record({
      employeeId: emp.id,
      branchId: emp.branchId,
      latitude: params.input.coordinates.latitude,
      longitude: params.input.coordinates.longitude,
      accuracy: params.input.coordinates.accuracy,
      altitude: params.input.coordinates.altitude,
      address: params.input.coordinates.address,
      activityType: params.activityType,
      capturedAt,
      deviceInfo: device as Record<string, unknown>,
      ipAddress: device.ipAddress,
      networkType: device.networkType,
      riskScore: validation.riskScore,
    });

    await this.logValidation(emp.id, emp.branchId, params.input, validation, device);

    return { attendance, gpsRecord, validation };
  }

  private async processLocationPunch(
    input: FieldDutyInput,
    activityType: string,
    context: GpsPunchContext,
    allowOverride: boolean,
  ) {
    const companyId = this.requireCompanyId();
    const emp = await this.resolveEmployeeId(context.actorUserId, input.employeeId);
    const capturedAt = input.coordinates.timestamp ?? new Date();
    const device = this.mergeDeviceContext(input.deviceInfo, context);

    const validation = await locationValidationService.validate({
      companyId,
      branchId: emp.branchId,
      latitude: input.coordinates.latitude,
      longitude: input.coordinates.longitude,
      accuracy: input.coordinates.accuracy,
      permissionState: input.permissionState,
      device,
      overrideValidation: allowOverride && input.overrideValidation,
      activityType,
    });

    const history = await createLocationHistoryService(companyId).record({
      employeeId: emp.id,
      branchId: emp.branchId,
      latitude: input.coordinates.latitude,
      longitude: input.coordinates.longitude,
      accuracy: input.coordinates.accuracy,
      address: input.address ?? input.coordinates.address,
      activityType,
      capturedAt,
      deviceInfo: device as Record<string, unknown>,
      ipAddress: device.ipAddress,
      networkType: device.networkType,
      riskScore: validation.riskScore,
    });

    await this.logValidation(emp.id, emp.branchId, input, validation, device);

    return { history, validation };
  }

  private async logValidation(
    employeeId: string,
    branchId: string,
    input: GpsCheckInInput | GpsCheckOutInput | FieldDutyInput,
    validation: { status: string; distanceMeters: number; allowedRadiusMeters: number; geoFenceId: string | null; rejectionReason?: string; riskScore: number },
    device: GpsDeviceContext,
  ) {
    const companyId = this.requireCompanyId();
    await prisma.locationValidationLog.create({
      data: {
        companyId,
        employeeId,
        branchId,
        geoFenceId: validation.geoFenceId,
        latitude: input.coordinates.latitude,
        longitude: input.coordinates.longitude,
        accuracy: input.coordinates.accuracy,
        distanceMeters: validation.distanceMeters,
        allowedRadiusMeters: validation.allowedRadiusMeters,
        validationStatus: validation.status as Prisma.LocationValidationLogCreateInput["validationStatus"],
        rejectionReason: validation.rejectionReason,
        riskScore: validation.riskScore,
        deviceInfo: device as object,
        ipAddress: device.ipAddress,
        networkType: device.networkType,
      },
    });
  }

  private mergeDeviceContext(deviceInfo: GpsCheckInInput["deviceInfo"] | undefined, context: GpsPunchContext): GpsDeviceContext {
    return {
      ...(deviceInfo ?? {}),
      ipAddress: context.ipAddress,
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createGPSAttendanceService(companyId: string) {
  return new GPSAttendanceService(companyId);
}

export function getGpsAttendanceServices(companyId: string) {
  return {
    gps: createGPSAttendanceService(companyId),
    geoFence: createGeoFenceService(companyId),
    history: createLocationHistoryService(companyId),
    fraud: createFraudDetectionService(companyId),
  };
}
