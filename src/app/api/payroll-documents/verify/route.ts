import { prisma } from "@/infrastructure/database/prisma-client";
import { checkRateLimit } from "@/infrastructure/security/security";
import { getPayrollDocumentServices } from "@/modules/payroll-documents/application/payroll-document.service";
import { documentVerifySchema } from "@/modules/payroll-documents/validation/schemas";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = checkRateLimit(`payslip-verify:${ip}`, 30, 60_000);
  if (!limit.allowed) {
    return Response.json({ valid: false, message: "Too many verification attempts." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = documentVerifySchema.safeParse({
    documentNumber: searchParams.get("documentNumber") ?? "",
    verificationHash: searchParams.get("hash") ?? undefined,
  });
  if (!parsed.success || !parsed.data.verificationHash) {
    return Response.json({ valid: false, message: "Document number and verification hash are required." }, { status: 422 });
  }

  const verification = await prisma.payrollDocumentVerification.findFirst({
    where: { documentNumber: parsed.data.documentNumber, isValid: true },
    select: { companyId: true },
  });
  if (!verification) {
    return Response.json({ valid: false, message: "Document could not be verified." });
  }

  const result = await getPayrollDocumentServices(verification.companyId).verification.verify(
    parsed.data.documentNumber,
    parsed.data.verificationHash,
  );
  if (!result.valid) {
    return Response.json({ valid: false, message: "Document could not be verified." });
  }

  return Response.json({
    valid: true,
    documentType: result.documentType,
    verifiedAt: result.verifiedAt,
  });
}
