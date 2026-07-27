import { getStatutoryServices } from "@/modules/statutory/application/statutory.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { statutoryCalculateSchema, statutoryReportQuerySchema } from "@/modules/statutory/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.STATUTORY.VIEW);
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("reportType");
    if (reportType) {
      const parsed = statutoryReportQuerySchema.safeParse({
        reportType,
        financialYearId: searchParams.get("financialYearId") ?? undefined,
        periodStart: searchParams.get("periodStart") ?? undefined,
        periodEnd: searchParams.get("periodEnd") ?? undefined,
      });
      if (!parsed.success) return apiError("Validation failed", 422);
      const report = await getStatutoryServices(auth.companyId).report.buildReport(parsed.data);
      return apiSuccess(report);
    }
    const [stats, financialYears] = await Promise.all([
      getStatutoryServices(auth.companyId).config.getDashboardStats(),
      getStatutoryServices(auth.companyId).config.listFinancialYears(),
    ]);
    return apiSuccess({ stats, financialYears });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.STATUTORY.VIEW);
    const body = await request.json();
    const parsed = statutoryCalculateSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 422);
    const result = await getStatutoryServices(auth.companyId).orchestrator.calculateForEmployee(parsed.data);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
