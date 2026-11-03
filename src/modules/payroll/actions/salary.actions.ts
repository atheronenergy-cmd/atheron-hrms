"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import { getSalaryServices } from "@/modules/payroll/application/employee-salary.service";
import { getSalaryActorMeta, recordSalaryAudit } from "@/modules/payroll/application/salary-audit.service";
import { SALARY_ROUTES, DEFAULT_DEDUCTION_COMPONENTS, DEFAULT_EARNING_COMPONENTS } from "@/modules/payroll/domain/types";
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

export async function addStandardSalaryComponentsAction(input: unknown): Promise<SalaryActionResult<{ created: number }>> {
  try {
    await requirePermission(PERMISSIONS.PAYROLL.SALARY.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const salaryStructureId = typeof input === "object" && input && "salaryStructureId" in input ? String(input.salaryStructureId) : "";
    if (!salaryStructureId) return { success: false, message: "Choose a salary structure." };

    const existing = await svc(companyId).component.list({ salaryStructureId, page: 1, pageSize: 100 });
    const codes = new Set(existing.items.map((item) => item.code.toUpperCase()));
    let created = 0;
    const skipped: string[] = [];
    let sortOrder = existing.items.length;

    const lines = [
      ...DEFAULT_EARNING_COMPONENTS.map((line) => ({ ...line, componentType: "earning" as const, affectsGross: true })),
      ...DEFAULT_DEDUCTION_COMPONENTS.map((line) => ({ ...line, componentType: "deduction" as const, affectsGross: false })),
    ];

    for (const line of lines) {
      if (codes.has(line.code)) continue;
      try {
        await svc(companyId).component.create(
          {
            salaryStructureId,
            name: line.name,
            code: line.code,
            componentType: line.componentType,
            calculationType: line.calculationType,
            amount: 0,
            percentageOf: "percentageOf" in line ? line.percentageOf : undefined,
            percentageValue: "percentageValue" in line ? line.percentageValue : undefined,
            formulaExpression: "formulaExpression" in line ? line.formulaExpression : undefined,
            isTaxable: line.componentType === "earning",
            isEmployerContribution: false,
            affectsGross: line.affectsGross,
            sortOrder,
          },
          auth.id,
        );
        sortOrder += 1;
        created += 1;
      } catch {
        skipped.push(line.code);
      }
    }

    revalidateSalary();
    const skipNote = skipped.length ? ` Skipped ${skipped.join(", ")}.` : "";
    return {
      success: true,
      message: created ? `Added ${created} standard pay lines.${skipNote}` : `Those pay lines are already on this structure.${skipNote}`,
      data: { created },
    };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Could not add standard pay lines." };
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
