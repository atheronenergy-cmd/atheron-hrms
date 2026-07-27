import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { authorizationService } from "@/infrastructure/authorization/authorization.service";
import { getFinancialServices } from "@/modules/employee-financial/application/employee-financial.service";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function requireFinancialContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export function getEmployeeFinancialServices(companyId: string) {
  return getFinancialServices(companyId);
}

export async function resolveFinancialViewOptions(userId: string, companyId: string) {
  const [canViewBank, canViewFamily, canViewTax, canViewStatutory, canViewInsurance] = await Promise.all([
    authorizationService.hasPermission(userId, PERMISSIONS.EMPLOYEE.BANK.MANAGE, companyId),
    authorizationService.hasPermission(userId, PERMISSIONS.EMPLOYEE.FAMILY.MANAGE, companyId),
    authorizationService.hasPermission(userId, PERMISSIONS.EMPLOYEE.TAX.MANAGE, companyId),
    authorizationService.hasPermission(userId, PERMISSIONS.EMPLOYEE.STATUTORY.MANAGE, companyId),
    authorizationService.hasPermission(userId, PERMISSIONS.EMPLOYEE.INSURANCE.MANAGE, companyId),
  ]);

  return {
    bank: { canViewSensitive: canViewBank },
    family: { canViewSensitive: canViewFamily },
    tax: { canViewSensitive: canViewTax },
    statutory: { canViewSensitive: canViewStatutory },
    insurance: { canViewSensitive: canViewInsurance },
    combined: { canViewSensitive: canViewBank || canViewFamily || canViewTax || canViewStatutory || canViewInsurance },
  };
}
