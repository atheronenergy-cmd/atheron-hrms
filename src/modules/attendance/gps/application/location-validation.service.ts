import type { GpsDeviceContext, LocationPermissionState, LocationValidationResult } from "@/modules/attendance/gps/domain/types";
import { MIN_GPS_ACCURACY_METERS } from "@/modules/attendance/gps/domain/types";
import { createGeoFenceService } from "@/modules/attendance/gps/application/geo-fence.service";
import { distanceCalculationService } from "@/modules/attendance/gps/application/distance-calculation.service";
import { createFraudDetectionService } from "@/modules/attendance/gps/application/fraud-detection.service";

type ValidateLocationInput = {
  companyId: string;
  branchId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  permissionState: LocationPermissionState;
  device?: GpsDeviceContext;
  overrideValidation?: boolean;
  activityType?: string;
};

export class LocationValidationService {
  async validate(input: ValidateLocationInput): Promise<LocationValidationResult> {
    if (input.permissionState === "denied" || input.permissionState === "revoked") {
      return {
        isValid: false,
        status: "permission_denied",
        distanceMeters: 0,
        allowedRadiusMeters: 0,
        geoFenceId: null,
        branchId: input.branchId,
        rejectionReason: "Location permission not granted",
        riskScore: 0,
      };
    }

    if (input.permissionState === "unavailable") {
      return {
        isValid: false,
        status: "gps_disabled",
        distanceMeters: 0,
        allowedRadiusMeters: 0,
        geoFenceId: null,
        branchId: input.branchId,
        rejectionReason: "GPS is disabled or unavailable",
        riskScore: 0,
      };
    }

    const fraudService = createFraudDetectionService(input.companyId);
    const fraud = fraudService.assess({
      device: input.device,
      permissionState: input.permissionState,
      accuracy: input.accuracy,
      activityType: input.activityType,
    });

    if (input.accuracy != null && input.accuracy > MIN_GPS_ACCURACY_METERS && !input.overrideValidation) {
      return {
        isValid: false,
        status: "low_accuracy",
        distanceMeters: 0,
        allowedRadiusMeters: 0,
        geoFenceId: null,
        branchId: input.branchId,
        rejectionReason: `GPS accuracy too low (${Math.round(input.accuracy)}m)`,
        riskScore: fraud.riskScore,
      };
    }

    if (fraud.isSuspicious && !input.overrideValidation) {
      return {
        isValid: false,
        status: "fraud_suspected",
        distanceMeters: 0,
        allowedRadiusMeters: 0,
        geoFenceId: null,
        branchId: input.branchId,
        rejectionReason: fraud.reasons.join("; "),
        riskScore: fraud.riskScore,
      };
    }

    const geoFenceService = createGeoFenceService(input.companyId);
    const config = await geoFenceService.getBranchGeoConfig(input.branchId);

    if (input.overrideValidation) {
      return {
        isValid: true,
        status: "override_applied",
        distanceMeters: 0,
        allowedRadiusMeters: config?.radiusMeters ?? 0,
        geoFenceId: config?.id ?? null,
        branchId: input.branchId,
        riskScore: fraud.riskScore,
      };
    }

    if (!config) {
      return {
        isValid: true,
        status: "valid",
        distanceMeters: 0,
        allowedRadiusMeters: 0,
        geoFenceId: null,
        branchId: input.branchId,
        rejectionReason: "No geo-fence configured — location recorded without radius check",
        riskScore: fraud.riskScore,
      };
    }

    if (!config.gpsAttendanceEnabled && !["field_visit", "outdoor_duty", "client_visit", "duty_start", "duty_end", "location_punch"].includes(input.activityType ?? "")) {
      return {
        isValid: false,
        status: "gps_disabled",
        distanceMeters: 0,
        allowedRadiusMeters: config.radiusMeters,
        geoFenceId: config.id,
        branchId: input.branchId,
        rejectionReason: "GPS attendance is not enabled for this branch",
        riskScore: fraud.riskScore,
      };
    }

    const distanceMeters = distanceCalculationService.calculateDistance(
      { latitude: input.latitude, longitude: input.longitude },
      { latitude: config.latitude, longitude: config.longitude },
    );

    const withinRadius = distanceCalculationService.isWithinRadius(distanceMeters, config.radiusMeters);

    if (!withinRadius && !config.allowOutsideLocation) {
      return {
        isValid: false,
        status: "outside_radius",
        distanceMeters,
        allowedRadiusMeters: config.radiusMeters,
        geoFenceId: config.id,
        branchId: input.branchId,
        rejectionReason: `Outside allowed radius (${distanceMeters}m / ${config.radiusMeters}m)`,
        riskScore: fraud.riskScore,
      };
    }

    return {
      isValid: true,
      status: withinRadius ? "valid" : "outside_radius",
      distanceMeters,
      allowedRadiusMeters: config.radiusMeters,
      geoFenceId: config.id,
      branchId: input.branchId,
      riskScore: fraud.riskScore,
    };
  }
}

export const locationValidationService = new LocationValidationService();
