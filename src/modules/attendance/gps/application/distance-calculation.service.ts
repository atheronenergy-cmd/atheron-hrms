import type { Coordinates } from "@/modules/attendance/gps/domain/types";

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export class DistanceCalculationService {
  /** Haversine formula — returns distance in meters. */
  calculateDistance(from: Coordinates, to: Coordinates): number {
    const lat1 = toRadians(from.latitude);
    const lat2 = toRadians(to.latitude);
    const deltaLat = toRadians(to.latitude - from.latitude);
    const deltaLng = toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(EARTH_RADIUS_METERS * c);
  }

  isWithinRadius(distanceMeters: number, radiusMeters: number) {
    return distanceMeters <= radiusMeters;
  }
}

export const distanceCalculationService = new DistanceCalculationService();
