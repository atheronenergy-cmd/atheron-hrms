import { getGpsAttendanceServices } from "@/modules/attendance/gps/application/gps-attendance.service";
import { getGpsActorMeta, recordGpsAudit } from "@/modules/attendance/gps/application/gps-audit.service";
import { apiError, apiSuccess, getRequestMeta, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { gpsCheckOutSchema } from "@/modules/attendance/gps/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.GPS_ATTENDANCE.RECORD.CREATE);
    const body = await request.json();
    const parsed = gpsCheckOutSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 422, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    if (parsed.data.overrideValidation) {
      await requireApiAuth(PERMISSIONS.GPS_ATTENDANCE.RECORD.OVERRIDE);
    }

    const meta = getRequestMeta(request);
    const actorMeta = await getGpsActorMeta();
    const result = await getGpsAttendanceServices(auth.companyId).gps.checkOut(
      parsed.data,
      { actorUserId: auth.userId, ipAddress: meta.ipAddress, userAgent: meta.userAgent },
      parsed.data.overrideValidation,
    );

    await recordGpsAudit("gps_attendance_created", {
      companyId: auth.companyId,
      employeeId: result.gpsRecord.employeeId,
      actorUserId: auth.userId,
      entityId: result.gpsRecord.id,
      ...actorMeta,
      metadata: { activityType: parsed.data.activityType, validationStatus: result.validation.status },
    });

    return apiSuccess(
      {
        attendanceId: result.attendance.id,
        gpsAttendanceId: result.gpsRecord.id,
        validation: result.validation,
      },
      "GPS check-out recorded.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
