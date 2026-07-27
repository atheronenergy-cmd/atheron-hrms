"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import { getLifecycleServices } from "@/modules/employee-lifecycle/application/employee-lifecycle.service";
import {
  getLifecycleActorMeta,
  recordLifecycleAudit,
} from "@/modules/employee-lifecycle/application/lifecycle-audit.service";
import { EMPLOYEE_ROUTES } from "@/modules/employee/domain/types";
import {
  clearanceItemUpdateSchema,
  confirmationSchema,
  joiningApprovalSchema,
  joiningChecklistUpdateSchema,
  joiningInitSchema,
  probationExtendSchema,
  probationSchema,
  promotionSchema,
  resignationActionSchema,
  resignationSchema,
  salaryRevisionSchema,
  suspensionSchema,
  terminationSchema,
  transferSchema,
  warningSchema,
  workflowActionSchema,
} from "@/modules/employee-lifecycle/validation/schemas";
import { isAppError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export type LifecycleActionResult<T = void> = {
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
  return getLifecycleServices(companyId);
}

function revalidateEmployee(employeeId: string) {
  revalidatePath(EMPLOYEE_ROUTES.detail(employeeId));
}

export async function initJoiningAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = joiningInitSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getLifecycleActorMeta();
    const row = await services(companyId).joining.init(parsed.data, auth.id);
    await recordLifecycleAudit("joining_initiated", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, entityId: row.id, ...meta });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Joining workflow started." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function updateJoiningChecklistAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = joiningChecklistUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed" };

    await services(companyId).joining.updateChecklist(parsed.data.employeeId, parsed.data.version, parsed.data.code, parsed.data.completed, auth.id);
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Checklist updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function approveJoiningAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = joiningApprovalSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed" };

    const meta = await getLifecycleActorMeta();
    await services(companyId).joining.approve(parsed.data.employeeId, parsed.data.version, parsed.data.approverType, auth.id);
    await recordLifecycleAudit("joining_completed", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, ...meta });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Joining approval recorded." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function createProbationAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.PROBATION.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = probationSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getLifecycleActorMeta();
    const row = await services(companyId).probation.create(parsed.data, auth.id);
    await recordLifecycleAudit("probation_started", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, entityId: row.id, ...meta });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Probation record created." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function extendProbationAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.PROBATION.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = probationExtendSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed" };

    const meta = await getLifecycleActorMeta();
    await services(companyId).probation.extend(parsed.data.id, parsed.data.version, parsed.data.extendedTo, auth.id, parsed.data.reviewNotes, parsed.data.recommendation);
    await recordLifecycleAudit("probation_extended", { companyId, employeeId: "", actorUserId: auth.id, entityId: parsed.data.id, ...meta });
    return { success: true, message: "Probation extended." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function confirmEmployeeAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.CONFIRMATION.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = confirmationSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getLifecycleActorMeta();
    const row = await services(companyId).confirmation.confirm(parsed.data, auth.id);
    await recordLifecycleAudit("confirmation_completed", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, entityId: row.id, ...meta });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Employee confirmed." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function transferEmployeeAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.TRANSFER.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = transferSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getLifecycleActorMeta();
    const row = await services(companyId).transfer.transfer(parsed.data, auth.id);
    await recordLifecycleAudit("transfer_approved", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, entityId: row.id, ...meta });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Transfer recorded." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function promoteEmployeeAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.PROMOTION.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = promotionSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getLifecycleActorMeta();
    const row = await services(companyId).promotion.promote(parsed.data, auth.id);
    await recordLifecycleAudit("promotion_created", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, entityId: row.id, ...meta });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Promotion recorded." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function recordSalaryRevisionAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = salaryRevisionSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getLifecycleActorMeta();
    const row = await services(companyId).salaryRevision.recordRevision(parsed.data, auth.id);
    await recordLifecycleAudit("salary_history_changed", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, entityId: row.id, ...meta });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Salary revision recorded." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function issueWarningAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = warningSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    await services(companyId).warning.issue(parsed.data, auth.id);
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Warning issued." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function suspendEmployeeAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = suspensionSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    await services(companyId).suspension.suspend(parsed.data, auth.id);
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Suspension recorded." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function submitResignationAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.RESIGNATION.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = resignationSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getLifecycleActorMeta();
    const row = await services(companyId).resignation.submit(parsed.data, auth.id);
    await recordLifecycleAudit("resignation_submitted", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, entityId: row.id, ...meta });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Resignation submitted." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function processResignationAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.RESIGNATION.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = resignationActionSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed" };

    await services(companyId).resignation.processAction(parsed.data.id, parsed.data.version, parsed.data.action, auth.id);
    return { success: true, message: "Resignation updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function terminateEmployeeAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.TERMINATION.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = terminationSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getLifecycleActorMeta();
    const row = await services(companyId).exit.terminate(parsed.data, auth.id);
    await recordLifecycleAudit("termination_completed", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, entityId: row.id, ...meta });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Termination recorded." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function updateClearanceItemAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = clearanceItemUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed" };

    await services(companyId).exit.updateClearanceItem(parsed.data.itemId, parsed.data.clearanceId, parsed.data.version, parsed.data.status, auth.id, parsed.data.remarks);
    return { success: true, message: "Clearance item updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}

export async function workflowAction(input: unknown): Promise<LifecycleActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = workflowActionSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed" };

    await services(companyId).workflow.act({
      workflowId: parsed.data.workflowId,
      version: parsed.data.version,
      action: parsed.data.action,
      actorUserId: auth.id,
      comments: parsed.data.comments,
    });
    return { success: true, message: `Workflow ${parsed.data.action} recorded.` };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Failed." };
  }
}
