export const GPS_ATTENDANCE_ROUTES = {
  dashboard: "/dashboard/attendance/gps",
} as const;

export const GPS_ACTIVITY_LABELS: Record<string, string> = {
  office_check_in: "Office Check-In",
  office_check_out: "Office Check-Out",
  field_visit: "Field Visit",
  outdoor_duty: "Outdoor Duty",
  client_visit: "Client Visit",
  remote_work: "Remote Work",
  duty_start: "Duty Start",
  duty_end: "Duty End",
  location_punch: "Location Punch",
};

export const VALIDATION_STATUS_LABELS: Record<string, string> = {
  valid: "Valid",
  outside_radius: "Outside Radius",
  gps_disabled: "GPS Disabled",
  permission_denied: "Permission Denied",
  low_accuracy: "Low Accuracy",
  fraud_suspected: "Fraud Suspected",
  override_applied: "Override Applied",
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type LocationPermissionState = "granted" | "denied" | "revoked" | "unavailable";

export type GpsDeviceContext = {
  deviceId?: string;
  deviceModel?: string;
  os?: string;
  appVersion?: string;
  isMockLocation?: boolean;
  isRooted?: boolean;
  isVpnActive?: boolean;
  networkType?: string;
  ipAddress?: string;
};

export type GeoFenceConfig = {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isDefault: boolean;
  gpsAttendanceEnabled: boolean;
  allowOutsideLocation: boolean;
  locationRequired: boolean;
};

export type LocationValidationResult = {
  isValid: boolean;
  status: string;
  distanceMeters: number;
  allowedRadiusMeters: number;
  geoFenceId: string | null;
  branchId: string | null;
  rejectionReason?: string;
  riskScore: number;
};

export type GpsLocationStatus = {
  employeeId: string;
  branchId: string | null;
  gpsAttendanceEnabled: boolean;
  locationRequired: boolean;
  allowOutsideLocation: boolean;
  permissionState: LocationPermissionState;
  geoFence: GeoFenceConfig | null;
  lastLocation: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    capturedAt: string;
    activityType: string;
  } | null;
};

export type LocationHistoryItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string | null;
  activityType: string;
  capturedAt: string;
  riskScore: number;
};

export type GpsDashboardData = {
  branches: Array<{
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    radiusMeters: number | null;
    gpsEnabled: boolean;
  }>;
  recentLocations: LocationHistoryItem[];
  todayGpsPunches: number;
  invalidAttempts: number;
};

export const MIN_GPS_ACCURACY_METERS = 100;
