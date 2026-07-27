import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { getLifecycleServices } from "@/modules/employee-lifecycle/application/employee-lifecycle.service";

export async function requireLifecycleContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export function getEmployeeLifecycleServices(companyId: string) {
  return getLifecycleServices(companyId);
}
