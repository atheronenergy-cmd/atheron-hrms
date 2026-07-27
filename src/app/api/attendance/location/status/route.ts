import { getGpsAttendanceServices } from "@/modules/attendance/gps/application/gps-attendance.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { locationPermissionStateSchema } from "@/modules/attendance/gps/validation/schemas";
import { prisma } from "@/infrastructure/database/prisma-client";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.GPS_ATTENDANCE.RECORD.READ);
    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get("employeeId");
    const permissionState = locationPermissionStateSchema.safeParse(
      searchParams.get("permissionState") ?? "granted",
    );
    if (!permissionState.success) {
      return apiError("Invalid permission state", 422);
    }

    let employeeId = employeeIdParam ?? undefined;
    if (!employeeId) {
      const emp = await prisma.employee.findFirst({
        where: { userId: auth.userId, companyId: auth.companyId, deletedAt: null },
        select: { id: true },
      });
      if (!emp) return apiError("Employee profile not linked to user", 404);
      employeeId = emp.id;
    }

    const status = await getGpsAttendanceServices(auth.companyId).gps.getLocationStatus(
      employeeId,
      permissionState.data,
    );

    return apiSuccess(status);
  } catch (error) {
    return handleApiError(error);
  }
}
