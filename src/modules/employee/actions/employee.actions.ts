"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import {
  getActorMeta,
  recordEmployeeAudit,
} from "@/modules/employee/application/employee-audit.service";
import { createEmployeeExportService } from "@/modules/employee/application/employee-export.service";
import { createEmployeeLifecycleService } from "@/modules/employee/application/employee-lifecycle.service";
import { createEmployeeDashboardService } from "@/modules/employee/application/employee-dashboard.service";
import { createEmployeeService } from "@/modules/employee/application/employee.service";
import { EMPLOYEE_ROUTES } from "@/modules/employee/domain/types";
import {
  createEmployeeSchema,
  employeeExportSchema,
  employeeStatusChangeSchema,
  updateEmployeeSchema,
} from "@/modules/employee/validation/schemas";
import { isAppError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export type EmployeeActionResult<T = void> = {
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
  return {
    employee: createEmployeeService(companyId),
    lifecycle: createEmployeeLifecycleService(companyId),
    dashboard: createEmployeeDashboardService(companyId),
    export: createEmployeeExportService(companyId),
  };
}

export async function getEmployeeDashboardStatsAction() {
  await requirePermission(PERMISSIONS.EMPLOYEE.PROFILE.READ);
  const auth = await requireAuth();
  const companyId = requireCompanyId(auth.companyId);
  return services(companyId).dashboard.getStats();
}

export async function createEmployeeAction(input: unknown): Promise<EmployeeActionResult<{ id: string; employeeCode: string }>> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.PROFILE.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = createEmployeeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const meta = await getActorMeta();
    const result = await services(companyId).employee.create(parsed.data, auth.id);

    await recordEmployeeAudit("employee_created", {
      companyId,
      actorUserId: auth.id,
      entityId: result.id,
      newValues: { employeeCode: result.employeeCode },
      ...meta,
    });

    revalidatePath(EMPLOYEE_ROUTES.list);
    return { success: true, message: `Employee ${result.employeeCode} created.`, data: { id: result.id, employeeCode: result.employeeCode } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create failed." };
  }
}

export async function updateEmployeeAction(input: unknown): Promise<EmployeeActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.PROFILE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateEmployeeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const meta = await getActorMeta();
    await services(companyId).employee.update(parsed.data, auth.id);

    await recordEmployeeAudit("employee_updated", {
      companyId,
      actorUserId: auth.id,
      entityId: parsed.data.id,
      ...meta,
    });

    revalidatePath(EMPLOYEE_ROUTES.list);
    revalidatePath(EMPLOYEE_ROUTES.detail(parsed.data.id));
    revalidatePath(EMPLOYEE_ROUTES.edit(parsed.data.id));
    return { success: true, message: "Employee updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function deactivateEmployeeAction(id: string, version: number, reason?: string): Promise<EmployeeActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.PROFILE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const meta = await getActorMeta();
    await services(companyId).lifecycle.deactivate(id, version, auth.id, reason);

    await recordEmployeeAudit("employee_deactivated", { companyId, actorUserId: auth.id, entityId: id, ...meta });
    revalidatePath(EMPLOYEE_ROUTES.list);
    revalidatePath(EMPLOYEE_ROUTES.detail(id));
    return { success: true, message: "Employee deactivated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Deactivate failed." };
  }
}

export async function reactivateEmployeeAction(id: string, version: number): Promise<EmployeeActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.PROFILE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const meta = await getActorMeta();
    await services(companyId).lifecycle.reactivate(id, version, auth.id);

    await recordEmployeeAudit("employee_reactivated", { companyId, actorUserId: auth.id, entityId: id, ...meta });
    revalidatePath(EMPLOYEE_ROUTES.list);
    revalidatePath(EMPLOYEE_ROUTES.detail(id));
    return { success: true, message: "Employee reactivated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Reactivate failed." };
  }
}

export async function deleteEmployeeAction(id: string, version: number): Promise<EmployeeActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.PROFILE.DELETE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const meta = await getActorMeta();
    await services(companyId).lifecycle.softDelete(id, version, auth.id);

    await recordEmployeeAudit("employee_deleted", { companyId, actorUserId: auth.id, entityId: id, ...meta });
    revalidatePath(EMPLOYEE_ROUTES.list);
    return { success: true, message: "Employee deleted." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Delete failed." };
  }
}

export async function restoreEmployeeAction(id: string): Promise<EmployeeActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.PROFILE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const meta = await getActorMeta();
    await services(companyId).lifecycle.restore(id, auth.id);

    await recordEmployeeAudit("employee_restored", { companyId, actorUserId: auth.id, entityId: id, ...meta });
    revalidatePath(EMPLOYEE_ROUTES.list);
    return { success: true, message: "Employee restored." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Restore failed." };
  }
}

export async function changeEmployeeStatusAction(input: unknown): Promise<EmployeeActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.PROFILE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = employeeStatusChangeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed" };
    }

    const meta = await getActorMeta();
    await services(companyId).lifecycle.changeStatus(parsed.data, auth.id);

    await recordEmployeeAudit("employee_status_changed", {
      companyId,
      actorUserId: auth.id,
      entityId: parsed.data.id,
      newValues: { employmentStatus: parsed.data.employmentStatus },
      ...meta,
    });

    revalidatePath(EMPLOYEE_ROUTES.detail(parsed.data.id));
    return { success: true, message: "Status updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Status change failed." };
  }
}

export async function exportEmployeesAction(input: unknown): Promise<EmployeeActionResult<{ content: string; filename: string }>> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.PROFILE.EXPORT);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = employeeExportSchema.safeParse(input ?? { format: "csv" });
    if (!parsed.success) {
      return { success: false, message: "Validation failed" };
    }

    const meta = await getActorMeta();
    const result = await services(companyId).export.export(parsed.data);

    await recordEmployeeAudit("employee_exported", { companyId, actorUserId: auth.id, ...meta, metadata: { format: parsed.data.format } });
    return { success: true, message: "Export ready.", data: { content: result.content, filename: result.filename } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Export failed." };
  }
}
