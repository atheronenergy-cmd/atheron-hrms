import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { createEmployeeDashboardService } from "@/modules/employee/application/employee-dashboard.service";
import { createEmployeeExportService } from "@/modules/employee/application/employee-export.service";
import { createEmployeeLifecycleService } from "@/modules/employee/application/employee-lifecycle.service";
import { createEmployeeSearchService } from "@/modules/employee/application/employee-search.service";
import { createEmployeeService } from "@/modules/employee/application/employee.service";
import { employeeSearchSchema } from "@/modules/employee/validation/schemas";

export async function requireEmployeeContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export function getEmployeeServices(companyId: string) {
  return {
    employee: createEmployeeService(companyId),
    search: createEmployeeSearchService(companyId),
    lifecycle: createEmployeeLifecycleService(companyId),
    dashboard: createEmployeeDashboardService(companyId),
    export: createEmployeeExportService(companyId),
  };
}

export function parseEmployeeListQuery(searchParams: Record<string, string | undefined>) {
  return employeeSearchSchema.parse(searchParams);
}

export { employeeSearchSchema };
