"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import { invitationService } from "@/modules/user/application/invitation.service";
import { roleAssignmentService } from "@/modules/user/application/role-assignment.service";
import { createUserService } from "@/modules/user/application/user.service";
import { createUserSecurityService } from "@/modules/user/application/user-security.service";
import { USER_ROUTES } from "@/modules/user/domain/types";
import {
  acceptInvitationSchema,
  changeUserStatusSchema,
  createUserSchema,
  removeRoleAssignmentSchema,
  roleAssignmentSchema,
  updateUserSchema,
  userListQuerySchema,
} from "@/modules/user/validation/schemas";
import { isAppError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export type ActionResult<T = void> = {
  success: boolean;
  message: string;
  data?: T;
  fieldErrors?: Record<string, string[]>;
};

function getServices(companyId: string | null) {
  return {
    users: createUserService(companyId ?? undefined),
    security: createUserSecurityService(companyId ?? undefined),
  };
}

export async function listUsersAction(rawQuery: Record<string, string | undefined>) {
  await requirePermission(PERMISSIONS.USER.ACCOUNT.READ);
  const auth = await requireAuth();
  const query = userListQuerySchema.parse(rawQuery);
  const { users } = getServices(auth.companyId);
  return users.listUsers(query);
}

export async function createUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.USER.ACCOUNT.CREATE);
    const auth = await requireAuth();
    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    const { users } = getServices(auth.companyId);
    const user = await users.createUser(parsed.data, auth.id);
    revalidatePath(USER_ROUTES.list);
    return { success: true, message: "User created successfully", data: { id: user.id } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateUserAction(input: unknown): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.USER.ACCOUNT.UPDATE);
    const auth = await requireAuth();
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    const { users } = getServices(auth.companyId);
    await users.updateUser(parsed.data, auth.id);
    revalidatePath(USER_ROUTES.list);
    revalidatePath(USER_ROUTES.detail(parsed.data.id));
    return { success: true, message: "User updated successfully" };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function changeUserStatusAction(input: unknown): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.USER.ACCOUNT.UPDATE);
    const auth = await requireAuth();
    const parsed = changeUserStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid status change request" };
    }
    const { users } = getServices(auth.companyId);
    await users.changeStatus(parsed.data.userId, parsed.data.status, parsed.data.version, auth.id);
    revalidatePath(USER_ROUTES.list);
    revalidatePath(USER_ROUTES.detail(parsed.data.userId));
    return { success: true, message: "User status updated" };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.USER.ACCOUNT.DELETE);
    const auth = await requireAuth();
    const { users } = getServices(auth.companyId);
    await users.deleteUser(userId, auth.id);
    revalidatePath(USER_ROUTES.list);
    return { success: true, message: "User deleted" };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function assignRoleAction(input: unknown): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.USER.ROLE.ASSIGN);
    const auth = await requireAuth();
    const parsed = roleAssignmentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid role assignment" };
    }
    await roleAssignmentService.assignRole(parsed.data, auth.id);
    revalidatePath(USER_ROUTES.detail(parsed.data.userId));
    return { success: true, message: "Role assigned" };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function removeRoleAction(input: unknown): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.USER.ROLE.ASSIGN);
    const auth = await requireAuth();
    const parsed = removeRoleAssignmentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid request" };
    }
    await roleAssignmentService.removeRole(parsed.data.userId, parsed.data.userRoleId, auth.id);
    revalidatePath(USER_ROUTES.detail(parsed.data.userId));
    return { success: true, message: "Role removed" };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function resetUserPasswordAction(userId: string): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.USER.ACCOUNT.UPDATE);
    const auth = await requireAuth();
    const { security } = getServices(auth.companyId);
    await security.resetPassword(userId, auth.id);
    return { success: true, message: "Password reset email sent" };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function revokeUserSessionsAction(userId: string): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.USER.ACCOUNT.UPDATE);
    const auth = await requireAuth();
    const { security } = getServices(auth.companyId);
    const count = await security.revokeAllSessions(userId, auth.id);
    revalidatePath(USER_ROUTES.detail(userId));
    return { success: true, message: `Revoked ${count} session(s)` };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function resendInvitationAction(userId: string): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.USER.ACCOUNT.CREATE);
    const auth = await requireAuth();
    await invitationService.sendInvitation(userId, auth.id);
    return { success: true, message: "Invitation sent" };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function acceptInvitationAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = acceptInvitationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    await invitationService.acceptInvitation(parsed.data);
    return { success: true, message: "Account activated. You can now sign in." };
  } catch (error) {
    return handleActionError(error);
  }
}

function handleActionError<T = void>(error: unknown): ActionResult<T> {
  if (isAppError(error)) {
    return { success: false, message: error.message };
  }
  console.error("User action error:", error);
  return { success: false, message: "An unexpected error occurred" };
}
