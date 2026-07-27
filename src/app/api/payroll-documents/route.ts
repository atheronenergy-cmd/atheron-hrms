import { getPayrollDocumentServices } from "@/modules/payroll-documents/application/payroll-document.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import {
  emailDistributionSchema,
  payrollDocumentReportSchema,
  payrollExportSchema,
  payslipBulkGenerateSchema,
  payslipGenerateSchema,
  payslipQuerySchema,
  salaryCertificateSchema,
} from "@/modules/payroll-documents/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYSLIP.VIEW);
    const { searchParams } = new URL(request.url);
    const svc = getPayrollDocumentServices(auth.companyId);

    const reportType = searchParams.get("reportType");
    if (reportType) {
      const parsed = payrollDocumentReportSchema.safeParse({
        reportType,
        periodStart: searchParams.get("periodStart") ?? undefined,
        periodEnd: searchParams.get("periodEnd") ?? undefined,
      });
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.report.buildReport(parsed.data));
    }

    const entity = searchParams.get("entity");
    if (entity === "payslips") {
      const parsed = payslipQuerySchema.safeParse({
        employeeId: searchParams.get("employeeId") ?? undefined,
        payrollId: searchParams.get("payrollId") ?? undefined,
        month: searchParams.get("month") ?? undefined,
        year: searchParams.get("year") ?? undefined,
      });
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.payslip.list(parsed.data));
    }
    if (entity === "certificates") return apiSuccess(await svc.certificate.list(searchParams.get("employeeId") ?? undefined));
    if (entity === "archive") return apiSuccess(await svc.archive.list({ payrollId: searchParams.get("payrollId") ?? undefined }));
    if (entity === "email-history") return apiSuccess(await svc.email.listHistory({ status: searchParams.get("status") ?? undefined }));

    return apiSuccess(await svc.report.getDashboardStats());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "generate_payslip") {
      const auth = await requireApiAuth(PERMISSIONS.PAYSLIP.GENERATE);
      const parsed = payslipGenerateSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollDocumentServices(auth.companyId).payslip.generate(parsed.data, auth.id));
    }

    if (action === "generate_bulk") {
      const auth = await requireApiAuth(PERMISSIONS.PAYSLIP.GENERATE);
      const parsed = payslipBulkGenerateSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollDocumentServices(auth.companyId).payslip.generateBulk(parsed.data, auth.id));
    }

    if (action === "export_payroll") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL_EXPORT.GENERATE);
      const parsed = payrollExportSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollDocumentServices(auth.companyId).export.export(parsed.data, auth.id));
    }

    if (action === "generate_certificate") {
      const auth = await requireApiAuth(PERMISSIONS.SALARY_CERTIFICATE.GENERATE);
      const parsed = salaryCertificateSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollDocumentServices(auth.companyId).certificate.generate(parsed.data, auth.id));
    }

    if (action === "send_email") {
      const auth = await requireApiAuth(PERMISSIONS.PAYSLIP.EMAIL);
      const parsed = emailDistributionSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollDocumentServices(auth.companyId).email.queueDistribution(parsed.data, auth.id));
    }

    return apiError("Unknown action", 400);
  } catch (error) {
    return handleApiError(error);
  }
}
