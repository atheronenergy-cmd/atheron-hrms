import { getSalaryServices } from "@/modules/payroll/application/employee-salary.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { employeeSalarySchema } from "@/modules/payroll/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL.SALARY.VIEW);
    const { searchParams } = new URL(request.url);
    const result = await getSalaryServices(auth.companyId).employeeSalary.list({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 25),
      employeeId: searchParams.get("employeeId") ?? undefined,
      approvalStatus: (searchParams.get("approvalStatus") as never) ?? undefined,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL.SALARY.ASSIGN);
    const body = await request.json();
    const parsed = employeeSalarySchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 422);
    const row = await getSalaryServices(auth.companyId).employeeSalary.assign(parsed.data, auth.userId);
    return apiSuccess({ id: row.id, approvalStatus: row.approvalStatus }, "Salary assigned", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
