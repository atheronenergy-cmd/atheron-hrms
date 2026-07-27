import { getPayrollServices } from "@/modules/payroll/application/payroll.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { payrollCalculateSchema, payrollApproveSchema, payrollLockSchema } from "@/modules/payroll/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL.CALCULATE);
    const body = await request.json();
    const parsed = payrollCalculateSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 422);
    const row = await getPayrollServices(auth.companyId).payroll.calculate(parsed.data.payrollId, parsed.data.version, auth.userId);
    return apiSuccess({ id: row.id, status: row.status });
  } catch (error) {
    return handleApiError(error);
  }
}
