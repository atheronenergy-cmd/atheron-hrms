import { getEarningsServices } from "@/modules/earnings/application/earnings.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { earningsCalculateSchema, earningsReportQuerySchema } from "@/modules/earnings/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.OVERTIME.VIEW);
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("reportType");
    if (reportType) {
      const parsed = earningsReportQuerySchema.safeParse({
        reportType,
        periodStart: searchParams.get("periodStart") ?? undefined,
        periodEnd: searchParams.get("periodEnd") ?? undefined,
      });
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getEarningsServices(auth.companyId).report.buildReport(parsed.data));
    }
    const stats = await getEarningsServices(auth.companyId).report.getDashboardStats();
    return apiSuccess(stats);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.OVERTIME.VIEW);
    const body = await request.json();
    const parsed = earningsCalculateSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 422);
    const result = await getEarningsServices(auth.companyId).orchestrator.calculateForEmployee(parsed.data);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
