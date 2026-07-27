import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { getLoanRecoveryServices } from "@/modules/loan-recovery/application/loan-recovery.service";

export async function requireLoanRecoveryContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export { getLoanRecoveryServices };
