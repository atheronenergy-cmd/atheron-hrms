import { getPayrollServices } from "@/modules/payroll/application/payroll.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { payrollGenerateSchema, payrollQuerySchema } from "@/modules/payroll/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL.VIEW);
    const { searchParams } = new URL(request.url);
    const parsed = payrollQuerySchema.safeParse({
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 25,
      status: searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) return apiError("Validation failed", 422);
    const result = await getPayrollServices(auth.companyId).payroll.list(parsed.data);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL.GENERATE);
    const body = await request.json();
    const parsed = payrollGenerateSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 422);
    const result = await getPayrollServices(auth.companyId).payroll.generate(parsed.data, auth.userId);
    return apiSuccess(result, "Success", parsed.data.previewOnly ? 200 : 201);
  } catch (error) {
    return handleApiError(error);
  }
}
