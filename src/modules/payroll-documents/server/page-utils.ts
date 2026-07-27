import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { getPayrollDocumentServices } from "@/modules/payroll-documents/application/payroll-document.service";
import { prisma } from "@/infrastructure/database/prisma-client";

export async function requirePayrollDocumentContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export async function resolveEmployeeForPayslips(userId: string, companyId: string) {
  return prisma.employee.findFirst({ where: { userId, companyId, deletedAt: null } });
}

export { getPayrollDocumentServices };
