import { salaryFormulaEngine } from "@/modules/payroll/application/salary-formula.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { formulaPreviewSchema } from "@/modules/payroll/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function POST(request: Request) {
  try {
    await requireApiAuth(PERMISSIONS.PAYROLL.SALARY.VIEW);
    const body = await request.json();
    const parsed = formulaPreviewSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 422);
    const result = salaryFormulaEngine.preview(parsed.data.expression, parsed.data.context);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
