import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { getPayrollGovernanceServices } from "@/modules/payroll-governance/application/payroll-governance.service";

export async function requirePayrollGovernanceContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export { getPayrollGovernanceServices };
