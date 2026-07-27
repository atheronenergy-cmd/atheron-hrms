import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { getPayrollReportingServices } from "@/modules/payroll-reporting/application/payroll-reporting.service";

export async function requirePayrollReportingContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export { getPayrollReportingServices };
