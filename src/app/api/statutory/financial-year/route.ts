import { getStatutoryServices } from "@/modules/statutory/application/statutory.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { financialYearSchema } from "@/modules/statutory/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET() {
  try {
    const auth = await requireApiAuth(PERMISSIONS.STATUTORY.VIEW);
    const years = await getStatutoryServices(auth.companyId).config.listFinancialYears();
    return apiSuccess(years);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.STATUTORY.MANAGE);
    const body = await request.json();
    const parsed = financialYearSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 422);
    const fy = await getStatutoryServices(auth.companyId).config.createFinancialYear(parsed.data, auth.userId);
    return apiSuccess(fy, "Financial year created", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
