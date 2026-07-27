import { getPayrollDocumentServices } from "@/modules/payroll-documents/application/payroll-document.service";
import { documentVerifySchema } from "@/modules/payroll-documents/validation/schemas";
import { prisma } from "@/infrastructure/database/prisma-client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = documentVerifySchema.safeParse({
    documentNumber: searchParams.get("documentNumber") ?? "",
    verificationHash: searchParams.get("hash") ?? undefined,
  });
  if (!parsed.success) return Response.json({ valid: false, message: "Invalid request" }, { status: 422 });

  const verification = await prisma.payrollDocumentVerification.findFirst({
    where: { documentNumber: parsed.data.documentNumber, isValid: true },
  });
  if (!verification) return Response.json({ valid: false, message: "Document not found" });

  const result = await getPayrollDocumentServices(verification.companyId).verification.verify(
    parsed.data.documentNumber,
    parsed.data.verificationHash,
  );
  return Response.json(result);
}
