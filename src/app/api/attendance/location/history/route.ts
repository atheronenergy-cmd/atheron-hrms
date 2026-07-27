import { getGpsAttendanceServices } from "@/modules/attendance/gps/application/gps-attendance.service";
import { getGpsActorMeta, recordGpsAudit } from "@/modules/attendance/gps/application/gps-audit.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { locationHistoryQuerySchema } from "@/modules/attendance/gps/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.LOCATION.HISTORY.READ);
    const { searchParams } = new URL(request.url);
    const parsed = locationHistoryQuerySchema.safeParse({
      employeeId: searchParams.get("employeeId") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      activityType: searchParams.get("activityType") ?? undefined,
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 25,
    });
    if (!parsed.success) {
      return apiError("Validation failed", 422);
    }

    const result = await getGpsAttendanceServices(auth.companyId).history.list(parsed.data);
    const actorMeta = await getGpsActorMeta();
    await recordGpsAudit("location_viewed", {
      companyId: auth.companyId,
      employeeId: parsed.data.employeeId ?? auth.userId,
      actorUserId: auth.userId,
      ...actorMeta,
      metadata: { query: parsed.data },
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
