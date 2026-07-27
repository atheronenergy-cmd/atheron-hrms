import { z } from "zod";

import { emailSchema, uuidSchema } from "@/shared/validation/common.schema";

export const userStatusSchema = z.enum(["active", "inactive", "locked"]);

export const createUserSchema = z.object({
  companyId: uuidSchema.optional(),
  email: emailSchema,
  name: z.string().min(1).max(255),
  password: z
    .string()
    .min(12)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
  remarks: z.string().max(2000).optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const assignRoleSchema = z.object({
  userId: uuidSchema,
  roleId: uuidSchema,
  branchId: uuidSchema.optional(),
});

export const createRoleSchema = z.object({
  companyId: uuidSchema.optional(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  description: z.string().max(2000).optional(),
  permissionIds: z.array(uuidSchema).default([]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
