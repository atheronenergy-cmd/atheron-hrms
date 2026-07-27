import { z } from "zod";

import { uuidSchema } from "@/shared/validation/common.schema";
import { QR_EXPIRY_OPTIONS } from "@/modules/attendance/qr/domain/types";

export const qrCodeTypeSchema = z.enum([
  "office",
  "branch",
  "department",
  "shift",
  "meeting",
  "training",
  "visitor",
]);

export const qrPunchTypeSchema = z.enum(["in", "out", "break_start", "break_end"]);

export const qrExpirySchema = z.coerce
  .number()
  .int()
  .refine((v) => (QR_EXPIRY_OPTIONS as readonly number[]).includes(v), "Invalid expiry duration");

export const generateQrSchema = z.object({
  codeType: qrCodeTypeSchema,
  name: z.string().min(1).max(100),
  branchId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  shiftId: uuidSchema.optional(),
  expirySeconds: qrExpirySchema.default(60),
});

export const validateQrSchema = z.object({
  token: z.string().min(10),
  employeeId: uuidSchema.optional(),
  clientTimestamp: z.coerce.date().optional(),
});

export const scanQrSchema = z.object({
  token: z.string().min(10),
  punchType: qrPunchTypeSchema.default("in"),
  employeeId: uuidSchema.optional(),
  terminalId: z.string().max(100).optional(),
  clientTimestamp: z.coerce.date().optional(),
  coordinates: z
    .object({
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
      accuracy: z.coerce.number().optional(),
    })
    .optional(),
  deviceInfo: z.record(z.unknown()).optional(),
});

export const qrScanHistoryQuerySchema = z.object({
  employeeId: uuidSchema.optional(),
  result: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const qrPolicySchema = z.object({
  name: z.string().min(1).max(100),
  branchId: uuidSchema.optional(),
  validationMode: z.enum(["qr_only", "qr_and_gps", "qr_and_wifi"]).default("qr_only"),
  defaultExpirySeconds: qrExpirySchema.default(60),
  requireBranchMatch: z.boolean().default(true),
  requireShiftMatch: z.boolean().default(false),
  requireDepartmentMatch: z.boolean().default(false),
  singleUse: z.boolean().default(true),
  maxScansPerEmployee: z.coerce.number().int().min(1).max(100).optional(),
  isDefault: z.boolean().default(false),
});

export type GenerateQrInput = z.infer<typeof generateQrSchema>;
export type ValidateQrInput = z.infer<typeof validateQrSchema>;
export type ScanQrInput = z.infer<typeof scanQrSchema>;
export type QrScanHistoryQueryInput = z.infer<typeof qrScanHistoryQuerySchema>;
export type QrPolicyInput = z.infer<typeof qrPolicySchema>;
