"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import { getAttendanceActorMeta, recordAttendanceAudit } from "@/modules/attendance/application/attendance-audit.service";
import { getAttendanceServices } from "@/modules/attendance/application/attendance-report.service";
import { ATTENDANCE_ROUTES } from "@/modules/attendance/domain/types";
import {
  attendancePunchSchema,
  attendanceQuerySchema,
  attendanceRuleSchema,
  correctionApprovalSchema,
  correctionRequestSchema,
  manualAttendanceSchema,
} from "@/modules/attendance/validation/schemas";
import { isAppError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export type AttendanceActionResult<T = void> = {
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
  return getAttendanceServices(companyId);
}

export async function punchAttendanceAction(input: unknown): Promise<AttendanceActionResult> {
  try {
    await requirePermission(PERMISSIONS.ATTENDANCE.RECORD.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = attendancePunchSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getAttendanceActorMeta();
    const row = await services(companyId).attendance.punch(parsed.data, auth.id);
    await recordAttendanceAudit("punch_recorded", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, entityId: row.id, ...meta, metadata: { punchType: parsed.data.punchType } });
    revalidatePath(ATTENDANCE_ROUTES.list);
    return { success: true, message: `${parsed.data.punchType === "in" ? "Check-in" : "Check-out"} recorded.` };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Punch failed." };
  }
}

export async function createManualAttendanceAction(input: unknown): Promise<AttendanceActionResult> {
  try {
    await requirePermission(PERMISSIONS.ATTENDANCE.RECORD.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = manualAttendanceSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getAttendanceActorMeta();
    const row = await services(companyId).attendance.createManual(parsed.data, auth.id);
    await recordAttendanceAudit("manual_entry_created", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, entityId: row.id, ...meta });
    revalidatePath(ATTENDANCE_ROUTES.list);
    return { success: true, message: "Manual attendance saved." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save failed." };
  }
}

export async function requestCorrectionAction(input: unknown): Promise<AttendanceActionResult> {
  try {
    await requirePermission(PERMISSIONS.ATTENDANCE.RECORD.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = correctionRequestSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getAttendanceActorMeta();
    const row = await services(companyId).correction.request(parsed.data, auth.id);
    await recordAttendanceAudit("correction_requested", { companyId, employeeId: parsed.data.employeeId, actorUserId: auth.id, entityId: row.id, ...meta });
    revalidatePath(ATTENDANCE_ROUTES.list);
    return { success: true, message: "Correction request submitted." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Request failed." };
  }
}

export async function approveCorrectionAction(input: unknown): Promise<AttendanceActionResult> {
  try {
    await requirePermission(PERMISSIONS.ATTENDANCE.RECORD.APPROVE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = correctionApprovalSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed" };

    const meta = await getAttendanceActorMeta();
    await services(companyId).approval.processCorrection(parsed.data.correctionId, parsed.data.version, parsed.data.action, auth.id, parsed.data.comments);
    await recordAttendanceAudit("correction_approved", { companyId, employeeId: "", actorUserId: auth.id, entityId: parsed.data.correctionId, ...meta, metadata: { action: parsed.data.action } });
    revalidatePath(ATTENDANCE_ROUTES.list);
    return { success: true, message: "Correction updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Approval failed." };
  }
}

export async function createAttendanceRuleAction(input: unknown): Promise<AttendanceActionResult> {
  try {
    await requirePermission(PERMISSIONS.ATTENDANCE.RULE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = attendanceRuleSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    await services(companyId).rules.create(parsed.data, auth.id);
    revalidatePath(ATTENDANCE_ROUTES.rules);
    return { success: true, message: "Attendance rule created." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save failed." };
  }
}

export async function exportAttendanceAction(input: unknown): Promise<AttendanceActionResult<{ content: string }>> {
  try {
    await requirePermission(PERMISSIONS.ATTENDANCE.RECORD.EXPORT);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = attendanceQuerySchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed" };

    const content = await services(companyId).report.exportCsv(parsed.data);
    return { success: true, message: "Export ready.", data: { content } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Export failed." };
  }
}
