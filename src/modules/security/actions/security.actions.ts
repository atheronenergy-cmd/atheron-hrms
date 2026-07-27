"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import { passwordPolicyService } from "@/modules/security/application/password-policy.service";
import { securityService } from "@/modules/security/application/security.service";
import { securityNotificationService } from "@/modules/security/application/security-notification.service";
import { securitySettingsSchema } from "@/modules/security/validation/schemas";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export type SecurityActionResult = {
  success: boolean;
  message: string;
};

export async function updateSecuritySettingsAction(
  input: unknown,
): Promise<SecurityActionResult> {
  await requirePermission(PERMISSIONS.SETTINGS.SECURITY.MANAGE);
  const user = await requireAuth();
  const companyId = user.companyId;
  if (!companyId) {
    return { success: false, message: "Company context required to update security settings." };
  }

  const parsed = securitySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid settings." };
  }

  await securityService.upsertSecurityPolicy(companyId, {
    ...parsed.data,
    updatedBy: user.id,
  });

  await securityNotificationService.notify({
    userId: user.id,
    companyId,
    eventType: "policy_updated",
    severity: "info",
    metadata: { section: "security_policy" },
  });

  revalidatePath("/dashboard/settings/security");
  revalidatePath("/dashboard/security");
  return { success: true, message: "Security settings saved." };
}

export async function getDefaultSecuritySettings() {
  const user = await requireAuth();
  const policy = await passwordPolicyService.getPolicy(user.companyId);
  return passwordPolicyService.toPolicyInput(policy);
}
