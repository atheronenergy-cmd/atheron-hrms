import { z } from "zod";

import { uuidSchema } from "@/shared/validation/common.schema";

export const gpsActivityTypeSchema = z.enum([
  "office_check_in",
  "office_check_out",
  "field_visit",
  "outdoor_duty",
  "client_visit",
  "remote_work",
  "duty_start",
  "duty_end",
  "location_punch",
]);

export const locationPermissionStateSchema = z.enum(["granted", "denied", "revoked", "unavailable"]);

export const gpsCoordinatesSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0).max(10000).optional(),
  altitude: z.coerce.number().optional(),
  address: z.string().max(500).optional(),
  timestamp: z.coerce.date().optional(),
});

export const gpsDeviceInfoSchema = z.object({
  deviceId: z.string().max(100).optional(),
  deviceModel: z.string().max(100).optional(),
  os: z.string().max(50).optional(),
  appVersion: z.string().max(30).optional(),
  isMockLocation: z.boolean().optional(),
  isRooted: z.boolean().optional(),
  isVpnActive: z.boolean().optional(),
  networkType: z.string().max(30).optional(),
});

export const gpsCheckInSchema = z.object({
  employeeId: uuidSchema.optional(),
  activityType: gpsActivityTypeSchema.default("office_check_in"),
  coordinates: gpsCoordinatesSchema,
  permissionState: locationPermissionStateSchema.default("granted"),
  deviceInfo: gpsDeviceInfoSchema.optional(),
  overrideValidation: z.boolean().default(false),
  remarks: z.string().max(500).optional(),
});

export const gpsCheckOutSchema = z.object({
  employeeId: uuidSchema.optional(),
  activityType: gpsActivityTypeSchema.default("office_check_out"),
  coordinates: gpsCoordinatesSchema,
  permissionState: locationPermissionStateSchema.default("granted"),
  deviceInfo: gpsDeviceInfoSchema.optional(),
  overrideValidation: z.boolean().default(false),
});

export const fieldDutySchema = z.object({
  employeeId: uuidSchema.optional(),
  action: z.enum(["start", "end", "punch"]),
  activityType: gpsActivityTypeSchema.optional(),
  coordinates: gpsCoordinatesSchema,
  permissionState: locationPermissionStateSchema.default("granted"),
  deviceInfo: gpsDeviceInfoSchema.optional(),
  overrideValidation: z.boolean().default(false),
  address: z.string().max(500).optional(),
});

export const locationHistoryQuerySchema = z.object({
  employeeId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  activityType: gpsActivityTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const geoFenceSchema = z.object({
  branchId: uuidSchema,
  name: z.string().min(1).max(100),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(10).max(50000),
  isDefault: z.boolean().default(false),
});

export type GpsCheckInInput = z.infer<typeof gpsCheckInSchema>;
export type GpsCheckOutInput = z.infer<typeof gpsCheckOutSchema>;
export type FieldDutyInput = z.infer<typeof fieldDutySchema>;
export type LocationHistoryQueryInput = z.infer<typeof locationHistoryQuerySchema>;
export type GeoFenceInput = z.infer<typeof geoFenceSchema>;
