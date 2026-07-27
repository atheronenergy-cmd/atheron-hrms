import { z } from "zod";

import { INVITATION_EXPIRY_HOURS } from "@/modules/user/domain/types";
import { emailSchema, uuidSchema } from "@/shared/validation/common.schema";

export const userStatusSchema = z.enum([
  "active",
  "inactive",
  "locked",
  "suspended",
  "pending_verification",
]);

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: emailSchema,
  phone: z.string().max(20).optional(),
  companyId: uuidSchema.optional(),
  roleIds: z.array(uuidSchema).min(1, "At least one role is required"),
  sendInvitation: z.boolean(),
  remarks: z.string().max(2000).optional(),
});

export const updateUserSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(255),
  email: emailSchema,
  phone: z.string().max(20).optional().nullable(),
  remarks: z.string().max(2000).optional().nullable(),
  version: z.number().int().min(1),
});

export const inviteUserSchema = z.object({
  userId: uuidSchema,
});

export const roleAssignmentSchema = z.object({
  userId: uuidSchema,
  roleId: uuidSchema,
  branchId: uuidSchema.optional(),
});

export const removeRoleAssignmentSchema = z.object({
  userId: uuidSchema,
  userRoleId: uuidSchema,
});

export const changeUserStatusSchema = z.object({
  userId: uuidSchema,
  status: userStatusSchema,
  version: z.number().int().min(1),
});

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(12)
      .regex(/[A-Z]/, "Must contain uppercase")
      .regex(/[a-z]/, "Must contain lowercase")
      .regex(/[0-9]/, "Must contain number")
      .regex(/[^A-Za-z0-9]/, "Must contain special character"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  status: userStatusSchema.optional(),
  roleId: uuidSchema.optional(),
  sortBy: z.enum(["name", "email", "createdAt", "lastLoginAt", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type RoleAssignmentInput = z.infer<typeof roleAssignmentSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export { INVITATION_EXPIRY_HOURS };
