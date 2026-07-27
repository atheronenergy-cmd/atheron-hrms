import { getPayrollDocumentServices } from "@/modules/payroll-documents/application/payroll-document.service";
import { requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { payslipDownloadSchema } from "@/modules/payroll-documents/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYSLIP.DOWNLOAD);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const parsed = payslipDownloadSchema.safeParse({ payslipId: id, password: searchParams.get("password") ?? undefined });
    if (!parsed.success) return new Response("Validation failed", { status: 422 });

    const file = await getPayrollDocumentServices(auth.companyId).payslip.download(parsed.data.payslipId, auth.userId, parsed.data.password);
    return new Response(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${file.originalName}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
