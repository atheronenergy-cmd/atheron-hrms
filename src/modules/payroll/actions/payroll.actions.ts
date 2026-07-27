"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import { getPayrollActorMeta, recordPayrollAudit } from "@/modules/payroll/application/payroll-audit.service";
import { getPayrollServices } from "@/modules/payroll/application/payroll.service";
import { PAYROLL_ROUTES } from "@/modules/payroll/domain/types";
import {
  payrollApproveSchema,
  payrollCalculateSchema,
  payrollGenerateSchema,
  payrollLockSchema,
  payrollPeriodSchema,
} from "@/modules/payroll/validation/schemas";
import { isAppError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export type PayrollActionResult<T = void> = { success: boolean; message: string; data?: T; fieldErrors?: Record<string, string[]> };

function requireCompanyId(companyId: string | null): string {
  if (!companyId) throw new Error("Company context required");
  return companyId;
}

function revalidatePayroll() {
  for (const path of Object.values(PAYROLL_ROUTES)) revalidatePath(path);
}

export async function createPayrollPeriodAction(input: unknown): Promise<PayrollActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.GENERATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = payrollPeriodSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    const row = await getPayrollServices(companyId).period.create(parsed.data, auth.id);
    revalidatePayroll();
    return { success: true, message: "Payroll period created.", data: { id: row.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create period failed." };
  }
}

export async function generatePayrollAction(input: unknown): Promise<PayrollActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.GENERATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = payrollGenerateSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    const meta = await getPayrollActorMeta();
    const result = await getPayrollServices(companyId).payroll.generate(parsed.data, auth.id);
    if (!parsed.data.previewOnly && "payroll" in result && result.payroll) {
      await recordPayrollAudit("payroll_generated", { companyId, payrollId: result.payroll.id, actorUserId: auth.id, ...meta });
    }
    revalidatePayroll();
    return { success: true, message: parsed.data.previewOnly ? "Preview generated." : "Payroll generated and calculated.", data: result as never };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Generate failed." };
  }
}

export async function calculatePayrollAction(input: unknown): Promise<PayrollActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.CALCULATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = payrollCalculateSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    const meta = await getPayrollActorMeta();
    const row = await getPayrollServices(companyId).payroll.calculate(parsed.data.payrollId, parsed.data.version, auth.id);
    await recordPayrollAudit(parsed.data.recalculate ? "payroll_recalculated" : "payroll_calculated", { companyId, payrollId: row.id, actorUserId: auth.id, ...meta });
    revalidatePayroll();
    return { success: true, message: "Payroll recalculated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Calculate failed." };
  }
}

export async function approvePayrollAction(input: unknown): Promise<PayrollActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.APPROVE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = payrollApproveSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    await getPayrollServices(companyId).payroll.approve(parsed.data.payrollId, parsed.data.version, auth.id);
    revalidatePayroll();
    return { success: true, message: "Payroll approved." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Approval failed." };
  }
}

export async function lockPayrollAction(input: unknown): Promise<PayrollActionResult> {
  try {
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = payrollLockSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    if (parsed.data.lock) await requirePermission(PERMISSIONS.PAYROLL.LOCK);
    else await requirePermission(PERMISSIONS.PAYROLL.UNLOCK);
    await getPayrollServices(companyId).payroll.lock(parsed.data.payrollId, parsed.data.version, auth.id, parsed.data.lock);
    revalidatePayroll();
    return { success: true, message: parsed.data.lock ? "Payroll locked." : "Payroll unlocked." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Lock action failed." };
  }
}

export async function deletePayrollAction(input: unknown): Promise<PayrollActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.DELETE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = input as { payrollId?: string; version?: number };
    if (!parsed.payrollId || !parsed.version) return { success: false, message: "Payroll ID and version required" };
    await getPayrollServices(companyId).payroll.softDelete(parsed.payrollId, parsed.version, auth.id);
    revalidatePayroll();
    return { success: true, message: "Payroll cancelled." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Delete failed." };
  }
}
