import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { getAttendanceServices } from "@/modules/attendance/application/attendance-report.service";

export async function requireAttendanceContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export function getEmployeeAttendanceServices(companyId: string) {
  return getAttendanceServices(companyId);
}
