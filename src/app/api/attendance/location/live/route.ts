import { getGpsAttendanceServices } from "@/modules/attendance/gps/application/gps-attendance.service";
import { apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET() {
  try {
    const auth = await requireApiAuth(PERMISSIONS.GPS_ATTENDANCE.RECORD.READ);
    const shares = await getGpsAttendanceServices(auth.companyId).history.listLiveShares();
    return apiSuccess(shares);
  } catch (error) {
    return handleApiError(error);
  }
}
