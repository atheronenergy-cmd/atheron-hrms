/**
 * GPS Attendance module verification.
 * Run: npx tsx scripts/verify-gps-attendance.ts
 */
import { distanceCalculationService } from "../src/modules/attendance/gps/application/distance-calculation.service";
import { createFraudDetectionService } from "../src/modules/attendance/gps/application/fraud-detection.service";
import { locationValidationService } from "../src/modules/attendance/gps/application/location-validation.service";
import {
  gpsCheckInSchema,
  gpsCheckOutSchema,
  locationHistoryQuerySchema,
} from "../src/modules/attendance/gps/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== GPS Attendance Module Verification ===\n");

assert(PERMISSIONS.GPS_ATTENDANCE.RECORD.READ === "gps_attendance.record.read", "View permission");
assert(PERMISSIONS.GPS_ATTENDANCE.RECORD.CREATE === "gps_attendance.record.create", "Create permission");
assert(PERMISSIONS.GPS_ATTENDANCE.RECORD.OVERRIDE === "gps_attendance.record.override", "Override permission");
assert(PERMISSIONS.LOCATION.HISTORY.READ === "location.history.read", "Location history permission");

const checkIn = gpsCheckInSchema.safeParse({
  coordinates: { latitude: 22.5726, longitude: 88.3639, accuracy: 10 },
  permissionState: "granted",
});
assert(checkIn.success, "GPS check-in schema accepts valid input");

const checkOut = gpsCheckOutSchema.safeParse({
  coordinates: { latitude: 22.5726, longitude: 88.3639, accuracy: 10 },
});
assert(checkOut.success, "GPS check-out schema accepts valid input");

const historyQuery = locationHistoryQuerySchema.safeParse({ page: 1, pageSize: 10 });
assert(historyQuery.success, "Location history query schema accepts valid input");

const office = { latitude: 22.5726, longitude: 88.3639 };
const employeeNear = { latitude: 22.5733, longitude: 88.3645 };
const distance = distanceCalculationService.calculateDistance(employeeNear, office);
assert(distance > 0 && distance < 200, `Haversine distance within expected range (${distance}m)`);
assert(distanceCalculationService.isWithinRadius(80, 200), "80m within 200m radius");
assert(!distanceCalculationService.isWithinRadius(250, 200), "250m outside 200m radius");

const fraud = createFraudDetectionService("test-company").assess({
  permissionState: "granted",
  device: { isMockLocation: true, isRooted: true },
});
assert(fraud.isSuspicious, "Fraud detection flags mock GPS and rooted device");
assert(fraud.riskScore >= 40, "Risk score elevated for suspicious device");

async function testValidation() {
  const denied = await locationValidationService.validate({
    companyId: "test",
    branchId: "test",
    latitude: 22.5726,
    longitude: 88.3639,
    permissionState: "denied",
  });
  assert(!denied.isValid && denied.status === "permission_denied", "Permission denied handled");

  const unavailable = await locationValidationService.validate({
    companyId: "test",
    branchId: "test",
    latitude: 22.5726,
    longitude: 88.3639,
    permissionState: "unavailable",
  });
  assert(!unavailable.isValid && unavailable.status === "gps_disabled", "GPS unavailable handled");

  const lowAccuracy = await locationValidationService.validate({
    companyId: "test",
    branchId: "test",
    latitude: 22.5726,
    longitude: 88.3639,
    accuracy: 500,
    permissionState: "granted",
  });
  assert(!lowAccuracy.isValid && lowAccuracy.status === "low_accuracy", "Low accuracy rejected");
}

testValidation()
  .then(() => {
    console.log("\n=== All GPS attendance checks passed ===\n");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
