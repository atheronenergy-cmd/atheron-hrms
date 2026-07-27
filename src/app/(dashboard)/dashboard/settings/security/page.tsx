import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { passwordPolicyService } from "@/modules/security/application/password-policy.service";
import { PasswordPolicyForm } from "@/modules/security/components/password-policy-form";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Security Settings" };

export default async function SecuritySettingsPage() {
  await guardPagePermission(PERMISSIONS.SETTINGS.SECURITY.MANAGE);
  const user = await requireAuth();
  const policy = await passwordPolicyService.getPolicy(user.companyId);
  const defaultValues = passwordPolicyService.toPolicyInput(policy);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security policy"
        description="Configure password rules, session limits, and login protection"
      />
      <PasswordPolicyForm defaultValues={defaultValues} />
    </div>
  );
}
