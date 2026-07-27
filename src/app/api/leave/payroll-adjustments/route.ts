import { getLeaveServices } from "@/modules/leave/application/leave-report.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL.PAYRUN.READ);
    const { searchParams } = new URL(request.url);
    const periodStart = searchParams.get("periodStart");
    const periodEnd = searchParams.get("periodEnd");
    if (!periodStart || !periodEnd) return apiError("periodStart and periodEnd are required", 422);

    const adjustments = await getLeaveServices(auth.companyId).payroll.getPayrollAdjustments({
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      employeeId: searchParams.get("employeeId") ?? undefined,
    });
    return apiSuccess({ adjustments });
  } catch (error) {
    return handleApiError(error);
  }
}
