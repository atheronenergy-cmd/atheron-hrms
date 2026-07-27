import type { GpsDeviceContext, LocationPermissionState } from "@/modules/attendance/gps/domain/types";
import { MIN_GPS_ACCURACY_METERS } from "@/modules/attendance/gps/domain/types";

type FraudAssessmentInput = {
  device?: GpsDeviceContext;
  permissionState: LocationPermissionState;
  accuracy?: number;
  activityType?: string;
  previousLocation?: { latitude: number; longitude: number; capturedAt: Date };
  currentLocation?: { latitude: number; longitude: number; capturedAt: Date };
};

export type FraudAssessmentResult = {
  riskScore: number;
  isSuspicious: boolean;
  reasons: string[];
};

export class FraudDetectionService {
  constructor(private companyId?: string) {}

  assess(input: FraudAssessmentInput): FraudAssessmentResult {
    const reasons: string[] = [];
    let riskScore = 0;

    if (input.device?.isMockLocation) {
      riskScore += 50;
      reasons.push("Mock GPS detected");
    }

    if (input.device?.isRooted) {
      riskScore += 30;
      reasons.push("Rooted device detected");
    }

    if (input.device?.isVpnActive) {
      riskScore += 15;
      reasons.push("VPN active — possible location mismatch");
    }

    if (input.permissionState !== "granted") {
      riskScore += 20;
      reasons.push(`Location permission state: ${input.permissionState}`);
    }

    if (input.accuracy != null && input.accuracy > MIN_GPS_ACCURACY_METERS) {
      riskScore += 10;
      reasons.push(`Low GPS accuracy (${Math.round(input.accuracy)}m)`);
    }

    if (input.previousLocation && input.currentLocation) {
      const elapsedMinutes =
        (input.currentLocation.capturedAt.getTime() - input.previousLocation.capturedAt.getTime()) / 60000;
      if (elapsedMinutes > 0 && elapsedMinutes < 5) {
        const distance = this.haversine(
          input.previousLocation.latitude,
          input.previousLocation.longitude,
          input.currentLocation.latitude,
          input.currentLocation.longitude,
        );
        const speedKmh = (distance / 1000 / elapsedMinutes) * 60;
        if (speedKmh > 200) {
          riskScore += 40;
          reasons.push("Impossible movement detected");
        }
      }
    }

    return {
      riskScore: Math.min(riskScore, 100),
      isSuspicious: riskScore >= 40,
      reasons,
    };
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

export function createFraudDetectionService(companyId: string) {
  return new FraudDetectionService(companyId);
}
