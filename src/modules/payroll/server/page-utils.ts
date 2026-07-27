import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { getPayrollServices } from "@/modules/payroll/application/payroll.service";
import { getSalaryServices } from "@/modules/payroll/application/employee-salary.service";

export async function requirePayrollContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export async function requireSalaryContext(permission: string) {
  return requirePayrollContext(permission);
}

export { getPayrollServices, getSalaryServices };
