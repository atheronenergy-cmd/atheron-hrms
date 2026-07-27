import { getLeaveServices } from "@/modules/leave/application/leave-report.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { leaveApplicationSchema, leaveQuerySchema } from "@/modules/leave/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.LEAVE.VIEW);
    const { searchParams } = new URL(request.url);
    const parsed = leaveQuerySchema.safeParse({
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 25,
      employeeId: searchParams.get("employeeId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? "startDate",
      sortOrder: searchParams.get("sortOrder") ?? "desc",
    });
    if (!parsed.success) return apiError("Validation failed", 422);

    const result = await getLeaveServices(auth.companyId).leave.list(parsed.data);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.LEAVE.APPLY);
    const body = await request.json();
    const parsed = leaveApplicationSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 422);

    const row = await getLeaveServices(auth.companyId).leave.apply(parsed.data, auth.userId);
    return apiSuccess({ id: row.id, status: row.status }, "Leave application submitted", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
