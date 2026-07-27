import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { createDocumentCategoryService } from "@/modules/document/application/document-category.service";
import { createDocumentExpiryService } from "@/modules/document/application/document-expiry.service";
import { createDocumentVerificationService } from "@/modules/document/application/document-verification.service";
import { createEmployeeDocumentService } from "@/modules/document/application/employee-document.service";
import { documentSearchSchema } from "@/modules/document/validation/schemas";

export async function requireDocumentContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export function getDocumentServices(companyId: string) {
  return {
    documents: createEmployeeDocumentService(companyId),
    categories: createDocumentCategoryService(companyId),
    verification: createDocumentVerificationService(companyId),
    expiry: createDocumentExpiryService(companyId),
  };
}

export function parseDocumentListQuery(searchParams: Record<string, string | undefined>) {
  return documentSearchSchema.parse(searchParams);
}

export { documentSearchSchema };
