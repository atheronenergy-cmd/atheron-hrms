import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email().max(255).transform((v) => v.toLowerCase().trim());
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number");
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const searchSchema = z.object({
  search: z.string().trim().max(255).optional(),
});

export const idParamSchema = z.object({
  id: uuidSchema,
});
