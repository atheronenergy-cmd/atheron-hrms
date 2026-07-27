import { getSalaryServices } from "@/modules/payroll/application/employee-salary.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { salaryQuerySchema, salaryStructureSchema } from "@/modules/payroll/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL.SALARY.VIEW);
    const { searchParams } = new URL(request.url);
    const parsed = salaryQuerySchema.safeParse({
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 25,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? "name",
      sortOrder: searchParams.get("sortOrder") ?? "asc",
    });
    if (!parsed.success) return apiError("Validation failed", 422);
    const result = await getSalaryServices(auth.companyId).structure.list(parsed.data);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL.SALARY.CREATE);
    const body = await request.json();
    const parsed = salaryStructureSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 422);
    const row = await getSalaryServices(auth.companyId).structure.create(parsed.data, auth.userId);
    return apiSuccess({ id: row.id, code: row.code }, "Salary structure created", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
