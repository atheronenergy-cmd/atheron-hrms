import { getLeaveServices } from "@/modules/leave/application/leave-report.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { leaveApprovalSchema } from "@/modules/leave/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.LEAVE.APPROVE);
    const body = await request.json();
    const parsed = leaveApprovalSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 422);

    const row = await getLeaveServices(auth.companyId).approval.process(parsed.data, auth.userId);
    return apiSuccess({ id: row.id, status: row.status });
  } catch (error) {
    return handleApiError(error);
  }
}
