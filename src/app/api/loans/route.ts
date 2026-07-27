import { getLoanRecoveryServices } from "@/modules/loan-recovery/application/loan-recovery.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import {
  employeeLoanSchema,
  foreclosureSchema,
  loanApprovalActionSchema,
  loanCalculateSchema,
  loanDisburseSchema,
  loanPolicySchema,
  loanReportQuerySchema,
  loanTypeSchema,
  recoveryAdjustmentSchema,
  salaryAdvanceSchema,
} from "@/modules/loan-recovery/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.LOAN.VIEW);
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("reportType");
    const svc = getLoanRecoveryServices(auth.companyId);

    if (reportType) {
      const parsed = loanReportQuerySchema.safeParse({
        reportType,
        periodStart: searchParams.get("periodStart") ?? undefined,
        periodEnd: searchParams.get("periodEnd") ?? undefined,
        departmentId: searchParams.get("departmentId") ?? undefined,
      });
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.report.buildReport(parsed.data));
    }

    const entity = searchParams.get("entity");
    if (entity === "types") return apiSuccess(await svc.loan.listLoanTypes());
    if (entity === "policies") return apiSuccess(await svc.module.listPolicies());
    if (entity === "loans") {
      return apiSuccess(await svc.loan.list({
        employeeId: searchParams.get("employeeId") ?? undefined,
        status: searchParams.get("status") ?? undefined,
      }));
    }
    if (entity === "advances") {
      return apiSuccess(await svc.advance.list({
        employeeId: searchParams.get("employeeId") ?? undefined,
        status: searchParams.get("status") ?? undefined,
      }));
    }
    if (entity === "emi") {
      return apiSuccess(await svc.emi.list({
        loanId: searchParams.get("loanId") ?? undefined,
        employeeId: searchParams.get("employeeId") ?? undefined,
        status: searchParams.get("status") ?? undefined,
      }));
    }
    if (entity === "history") {
      return apiSuccess(await svc.recovery.listHistory({
        employeeId: searchParams.get("employeeId") ?? undefined,
      }));
    }

    return apiSuccess(await svc.report.getDashboardStats());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.LOAN.CREATE);
    const body = await request.json();
    const svc = getLoanRecoveryServices(auth.companyId);
    const action = body.action as string | undefined;

    if (action === "calculate") {
      const parsed = loanCalculateSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.orchestrator.calculateForEmployee({
        employeeId: parsed.data.employeeId,
        periodStart: new Date(parsed.data.periodStart),
        periodEnd: new Date(parsed.data.periodEnd),
      }));
    }

    if (action === "create_loan_type") {
      const parsed = loanTypeSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.loan.createLoanType(parsed.data, auth.id));
    }

    if (action === "create_policy") {
      const parsed = loanPolicySchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.module.createPolicy(parsed.data, auth.id));
    }

    if (action === "create_loan") {
      const parsed = employeeLoanSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.loan.create(parsed.data, auth.id));
    }

    if (action === "create_advance") {
      const parsed = salaryAdvanceSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.advance.create(parsed.data, auth.id));
    }

    if (action === "approve_loan") {
      const parsed = loanApprovalActionSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.approval.processAction(parsed.data, auth.id));
    }

    if (action === "disburse_loan") {
      const parsed = loanDisburseSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.loan.disburse(parsed.data.loanId, parsed.data.disbursementDate, auth.id));
    }

    if (action === "foreclose") {
      const parsed = foreclosureSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.loan.processForeclosure(parsed.data, auth.id));
    }

    if (action === "adjust_recovery") {
      const parsed = recoveryAdjustmentSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.recovery.createAdjustment(parsed.data, auth.id));
    }

    if (action === "approve_advance") {
      return apiSuccess(await svc.advance.approve(body.advanceId, auth.id));
    }

    if (action === "submit_advance") {
      return apiSuccess(await svc.advance.submit(body.advanceId, auth.id));
    }

    return apiError("Unknown action", 400);
  } catch (error) {
    return handleApiError(error);
  }
}
