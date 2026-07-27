import { getPayrollServices } from "@/modules/payroll/application/payroll.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { payrollLockSchema } from "@/modules/payroll/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL.LOCK);
    const body = await request.json();
    const parsed = payrollLockSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 422);
    if (!parsed.data.lock) await requireApiAuth(PERMISSIONS.PAYROLL.UNLOCK);
    const row = await getPayrollServices(auth.companyId).payroll.lock(parsed.data.payrollId, parsed.data.version, auth.userId, parsed.data.lock);
    return apiSuccess({ id: row.id, status: row.status });
  } catch (error) {
    return handleApiError(error);
  }
}
