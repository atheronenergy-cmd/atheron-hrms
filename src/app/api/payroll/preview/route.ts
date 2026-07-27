import { getPayrollServices } from "@/modules/payroll/application/payroll.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { payrollGenerateSchema } from "@/modules/payroll/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL.VIEW);
    const body = await request.json();
    const parsed = payrollGenerateSchema.safeParse({ ...body, previewOnly: true });
    if (!parsed.success) return apiError("Validation failed", 422);
    const result = await getPayrollServices(auth.companyId).payroll.preview(parsed.data);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
