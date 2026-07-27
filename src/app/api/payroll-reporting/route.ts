import { getPayrollReportingServices } from "@/modules/payroll-reporting/application/payroll-reporting.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import {
  accountingExportSchema,
  analyticsQuerySchema,
  bankBatchApproveSchema,
  bankBatchSchema,
  bankTransferStatusSchema,
  costCenterSchema,
  payrollReportSchema,
  salaryRegisterSchema,
} from "@/modules/payroll-reporting/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL_REPORTING.VIEW);
    const { searchParams } = new URL(request.url);
    const svc = getPayrollReportingServices(auth.companyId);
    const entity = searchParams.get("entity");

    if (entity === "reports") return apiSuccess(await svc.report.listReports());
    if (entity === "bank-batches") return apiSuccess(await svc.bankTransfer.listBatches(searchParams.get("payrollId") ?? undefined));
    if (entity === "accounting") return apiSuccess(await svc.accounting.list(searchParams.get("payrollId") ?? undefined));
    if (entity === "journal") return apiSuccess(await svc.journal.list(searchParams.get("payrollId") ?? undefined));
    if (entity === "cost-centers") return apiSuccess(await svc.costCenter.list());
    if (entity === "providers") return apiSuccess({ bank: svc.bankProviders, accounting: svc.accountingProviders });
    if (entity === "analytics") {
      const parsed = analyticsQuerySchema.safeParse({
        payrollId: searchParams.get("payrollId") ?? undefined,
        periodStart: searchParams.get("periodStart") ?? undefined,
        periodEnd: searchParams.get("periodEnd") ?? undefined,
        refresh: searchParams.get("refresh") === "true",
      });
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.analytics.getExecutiveDashboard(parsed.data, auth.userId));
    }

    const reportType = searchParams.get("reportType");
    if (reportType) {
      const parsed = payrollReportSchema.safeParse({
        reportType,
        payrollId: searchParams.get("payrollId") ?? undefined,
        filters: {},
      });
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.report.buildReport(parsed.data, auth.userId));
    }

    const metrics = await svc.analytics.computeMetrics({});
    return apiSuccess({ metrics, audit: await svc.audit.listRecent(5) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "generate_report") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL_REPORTING.EXPORT);
      const parsed = payrollReportSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollReportingServices(auth.companyId).report.buildReport(parsed.data, auth.userId));
    }

    if (action === "salary_register") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL_REPORTING.EXPORT);
      const parsed = salaryRegisterSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollReportingServices(auth.companyId).salaryRegister.generate(parsed.data, auth.userId));
    }

    if (action === "generate_bank_file") {
      const auth = await requireApiAuth(PERMISSIONS.BANK_TRANSFER.GENERATE);
      const parsed = bankBatchSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollReportingServices(auth.companyId).bankTransfer.generateBatch(parsed.data, auth.userId));
    }

    if (action === "approve_bank_batch") {
      const auth = await requireApiAuth(PERMISSIONS.BANK_TRANSFER.APPROVE);
      const parsed = bankBatchApproveSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollReportingServices(auth.companyId).bankTransfer.approve(parsed.data.batchId, auth.userId));
    }

    if (action === "update_transfer_status") {
      const auth = await requireApiAuth(PERMISSIONS.BANK_TRANSFER.GENERATE);
      const parsed = bankTransferStatusSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollReportingServices(auth.companyId).bankTransfer.updateRecordStatus(parsed.data, auth.userId));
    }

    if (action === "accounting_export") {
      const auth = await requireApiAuth(PERMISSIONS.ACCOUNTING.EXPORT);
      const parsed = accountingExportSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollReportingServices(auth.companyId).accounting.export(parsed.data, auth.userId));
    }

    if (action === "create_cost_center") {
      const auth = await requireApiAuth(PERMISSIONS.COST_CENTER.MANAGE);
      const parsed = costCenterSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollReportingServices(auth.companyId).costCenter.create(parsed.data, auth.userId));
    }

    return apiError("Unknown action", 400);
  } catch (error) {
    return handleApiError(error);
  }
}
