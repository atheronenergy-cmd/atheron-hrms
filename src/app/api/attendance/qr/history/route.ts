import { getQrAttendanceServices } from "@/modules/attendance/qr/application/qr-scan.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { qrScanHistoryQuerySchema } from "@/modules/attendance/qr/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.QR.REPORT.READ);
    const { searchParams } = new URL(request.url);
    const parsed = qrScanHistoryQuerySchema.safeParse({
      employeeId: searchParams.get("employeeId") ?? undefined,
      result: searchParams.get("result") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 25,
    });
    if (!parsed.success) return apiError("Validation failed", 422);

    const result = await getQrAttendanceServices(auth.companyId).report.listHistory(parsed.data);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
