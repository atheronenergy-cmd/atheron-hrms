"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import { getSalaryServices } from "@/modules/payroll/application/employee-salary.service";
import { getSalaryActorMeta, recordSalaryAudit } from "@/modules/payroll/application/salary-audit.service";
import { SALARY_ROUTES } from "@/modules/payroll/domain/types";
import {
  employeeSalarySchema,
  payGradeSchema,
  salaryComponentSchema,
  salaryFormulaSchema,
  salaryRevisionSchema,
  salaryStructureSchema,
  salaryTemplateSchema,
} from "@/modules/payroll/validation/schemas";
import { isAppError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export type SalaryActionResult<T = void> = {
  success: boolean;
  message: string;
  data?: T;
  fieldErrors?: Record<string, string[]>;
};

function requireCompanyId(companyId: string | null): string {
  if (!companyId) throw new Error("Company context required");
  return companyId;
}

function svc(companyId: string) {
  return getSalaryServices(companyId);
}

function revalidateSalary() {
  for (const path of Object.values(SALARY_ROUTES)) revalidatePath(path);
}

export async function createSalaryStructureAction(input: unknown): Promise<SalaryActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.SALARY.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = salaryStructureSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const row = await svc(companyId).structure.create(parsed.data, auth.id);
    revalidateSalary();
    return { success: true, message: "Salary structure created.", data: { id: row.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create failed." };
  }
}

export async function createSalaryComponentAction(input: unknown): Promise<SalaryActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.SALARY.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = salaryComponentSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    await svc(companyId).component.create(parsed.data, auth.id);
    revalidateSalary();
    return { success: true, message: "Salary component created." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create failed." };
  }
}

export async function createSalaryTemplateAction(input: unknown): Promise<SalaryActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.SALARY.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = salaryTemplateSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    await svc(companyId).template.create(parsed.data, auth.id);
    revalidateSalary();
    return { success: true, message: "Salary template saved." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save failed." };
  }
}

export async function assignEmployeeSalaryAction(input: unknown): Promise<SalaryActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.SALARY.ASSIGN);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = employeeSalarySchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    const meta = await getSalaryActorMeta();
    const row = await svc(companyId).employeeSalary.assign(parsed.data, auth.id);
    await recordSalaryAudit("salary_assigned", { companyId, actorUserId: auth.id, entityId: row.id, employeeId: row.employeeId, ...meta });
    revalidateSalary();
    return { success: true, message: "Salary assigned to employee.", data: { id: row.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Assignment failed." };
  }
}

export async function approveEmployeeSalaryAction(input: unknown): Promise<SalaryActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.SALARY.APPROVE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = input as { id?: string; version?: number };
    if (!parsed.id || !parsed.version) return { success: false, message: "ID and version required" };

    const meta = await getSalaryActorMeta();
    await svc(companyId).employeeSalary.approve(parsed.id, parsed.version, auth.id);
    await recordSalaryAudit("salary_approved", { companyId, actorUserId: auth.id, entityId: parsed.id, ...meta });
    revalidateSalary();
    return { success: true, message: "Salary assignment approved." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Approval failed." };
  }
}

export async function createSalaryRevisionAction(input: unknown): Promise<SalaryActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.SALARY.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = salaryRevisionSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    await svc(companyId).employeeSalary.createRevision(parsed.data, auth.id);
    revalidateSalary();
    return { success: true, message: "Salary revision recorded." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Revision failed." };
  }
}

export async function createPayGradeAction(input: unknown): Promise<SalaryActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.SALARY.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = payGradeSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    await svc(companyId).structure.createPayGrade(parsed.data, auth.id);
    revalidateSalary();
    return { success: true, message: "Pay grade created." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create failed." };
  }
}

export async function createSalaryFormulaAction(input: unknown): Promise<SalaryActionResult> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.SALARY.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = salaryFormulaSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

    await svc(companyId).formula.create(parsed.data, auth.id);
    revalidateSalary();
    return { success: true, message: "Salary formula saved." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save failed." };
  }
}
