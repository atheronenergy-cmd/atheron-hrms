import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { getLeaveServices } from "@/modules/leave/application/leave-report.service";

export async function requireLeaveContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export function getEmployeeLeaveServices(companyId: string) {
  return getLeaveServices(companyId);
}
