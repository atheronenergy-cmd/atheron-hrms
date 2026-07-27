import { z } from "zod";

import { paginationSchema, uuidSchema } from "@/shared/validation/common.schema";

export const uploadDocumentSchema = z.object({
  employeeId: uuidSchema,
  categoryId: uuidSchema.optional(),
  categoryCode: z.string().max(50).optional(),
  documentType: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  documentNumber: z.string().max(100).optional(),
  issueDate: z.coerce.date().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  issuingAuthority: z.string().max(255).optional(),
  remarks: z.string().max(2000).optional(),
});

export const updateDocumentSchema = uploadDocumentSchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const verifyDocumentSchema = z.object({
  id: uuidSchema,
  version: z.number().int().min(1),
  status: z.enum(["verified", "rejected"]),
  notes: z.string().max(2000).optional(),
});

export const documentSearchSchema = paginationSchema.extend({
  employeeId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  categoryCode: z.string().optional(),
  documentType: z.string().optional(),
  verificationStatus: z
    .enum(["pending_verification", "verified", "rejected", "expired", "archived"])
    .optional(),
  search: z.string().optional(),
  sortBy: z.enum(["title", "createdAt", "expiryDate", "verificationStatus"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const uploadPhotoSchema = z.object({
  employeeId: uuidSchema,
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type VerifyDocumentInput = z.infer<typeof verifyDocumentSchema>;
export type DocumentSearchInput = z.infer<typeof documentSearchSchema>;
