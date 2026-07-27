"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import { getLeaveActorMeta, recordLeaveAudit } from "@/modules/leave/application/leave-audit.service";
import { getLeaveServices } from "@/modules/leave/application/leave-report.service";
import { leaveNotificationService } from "@/modules/leave/application/leave-notification.service";
import { LEAVE_ROUTES } from "@/modules/leave/domain/types";
import {
  leaveApplicationSchema,
  leaveApprovalSchema,
  leaveBalanceAdjustSchema,
  leavePolicySchema,
  leaveTypeSchema,
} from "@/modules/leave/validation/schemas";
import { isAppError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export type LeaveActionResult<T = void> = {
  success: boolean;
  message: string;
  data?: T;
  fieldErrors?: Record<string, string[]>;
};

function requireCompanyId(companyId: string | null): string {
  if (!companyId) throw new Error("Company context required");
  return companyId;
}

function services(companyId: string) {
  return getLeaveServices(companyId);
}

function revalidateLeavePaths() {
  for (const path of Object.values(LEAVE_ROUTES)) revalidatePath(path);
}

export async function applyLeaveAction(input: unknown): Promise<LeaveActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.LEAVE.APPLY);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = leaveApplicationSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const meta = await getLeaveActorMeta();
    const row = await services(companyId).leave.apply(parsed.data, auth.id);
    await recordLeaveAudit("leave_applied", { companyId, employeeId: row.employeeId, actorUserId: auth.id, entityId: row.id, ...meta });
    await leaveNotificationService.notify("leave_application_submitted", { companyId, leaveId: row.id, employeeId: row.employeeId, actorUserId: auth.id });
    if (row.status === "pending") {
      await leaveNotificationService.notify("leave_approval_pending", { companyId, leaveId: row.id, employeeId: row.employeeId, actorUserId: auth.id });
    }
    revalidateLeavePaths();
    return { success: true, message: "Leave application submitted.", data: { id: row.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Leave application failed." };
  }
}

export async function processLeaveApprovalAction(input: unknown): Promise<LeaveActionResult> {
  try {
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = leaveApprovalSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    if (parsed.data.action === "approve") await requirePermission(PERMISSIONS.LEAVE.APPROVE);
    else if (parsed.data.action === "reject") await requirePermission(PERMISSIONS.LEAVE.REJECT);
    else await requirePermission(PERMISSIONS.LEAVE.MANAGE);

    const meta = await getLeaveActorMeta();
    const row = await services(companyId).approval.process(parsed.data, auth.id);
    const event =
      parsed.data.action === "approve"
        ? "leave_approved"
        : parsed.data.action === "reject"
          ? "leave_rejected"
          : "leave_sent_back";
    await recordLeaveAudit(event, { companyId, actorUserId: auth.id, entityId: row.id, ...meta, metadata: { action: parsed.data.action } });

    const notifyEvent =
      parsed.data.action === "approve" ? "leave_approved" : parsed.data.action === "reject" ? "leave_rejected" : "leave_approval_pending";
    await leaveNotificationService.notify(notifyEvent, { companyId, leaveId: row.id, employeeId: row.employeeId, actorUserId: auth.id });

    revalidateLeavePaths();
    return { success: true, message: `Leave ${parsed.data.action} processed.` };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Approval action failed." };
  }
}

export async function cancelLeaveAction(input: unknown): Promise<LeaveActionResult> {
  try {
    await requirePermission(PERMISSIONS.LEAVE.CANCEL);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = input as { leaveId?: string; version?: number; reason?: string };
    if (!parsed.leaveId || !parsed.version) return { success: false, message: "Leave ID and version required" };

    const meta = await getLeaveActorMeta();
    const row = await services(companyId).leave.cancel(parsed.leaveId, parsed.version, auth.id, parsed.reason);
    await recordLeaveAudit("leave_cancelled", { companyId, actorUserId: auth.id, entityId: row.id, ...meta });
    await leaveNotificationService.notify("leave_cancelled", { companyId, leaveId: row.id, employeeId: row.employeeId, actorUserId: auth.id });
    revalidateLeavePaths();
    return { success: true, message: "Leave cancelled." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Cancel failed." };
  }
}

export async function adjustLeaveBalanceAction(input: unknown): Promise<LeaveActionResult> {
  try {
    await requirePermission(PERMISSIONS.LEAVE.BALANCE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = leaveBalanceAdjustSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const meta = await getLeaveActorMeta();
    await services(companyId).balance.adjust(parsed.data, auth.id);
    await recordLeaveAudit("leave_balance_adjusted", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, ...meta });
    await leaveNotificationService.notify("leave_balance_credited", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id });
    revalidateLeavePaths();
    return { success: true, message: "Leave balance updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Balance adjustment failed." };
  }
}

export async function createLeaveTypeAction(input: unknown): Promise<LeaveActionResult> {
  try {
    await requirePermission(PERMISSIONS.LEAVE.POLICY.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = leaveTypeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }
    await services(companyId).policy.createLeaveType(parsed.data, auth.id);
    revalidateLeavePaths();
    return { success: true, message: "Leave type created." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create leave type failed." };
  }
}

export async function createLeavePolicyAction(input: unknown): Promise<LeaveActionResult> {
  try {
    await requirePermission(PERMISSIONS.LEAVE.POLICY.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = leavePolicySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }
    await services(companyId).policy.upsertPolicy(parsed.data, auth.id);
    revalidateLeavePaths();
    return { success: true, message: "Leave policy saved." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save policy failed." };
  }
}
