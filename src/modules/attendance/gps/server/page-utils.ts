import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { getGpsAttendanceServices } from "@/modules/attendance/gps/application/gps-attendance.service";

export async function requireGpsAttendanceContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export function getGpsServices(companyId: string) {
  return getGpsAttendanceServices(companyId);
}
