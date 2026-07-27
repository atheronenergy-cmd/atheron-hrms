import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { getQrAttendanceServices } from "@/modules/attendance/qr/application/qr-scan.service";

export async function requireQrAttendanceContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export function getQrServices(companyId: string) {
  return getQrAttendanceServices(companyId);
}
