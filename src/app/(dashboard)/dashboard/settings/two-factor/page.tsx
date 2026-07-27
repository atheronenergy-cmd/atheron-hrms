import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/infrastructure/auth/server";
import { twoFactorService } from "@/modules/security/application/two-factor.service";
import { TwoFactorSetup } from "@/modules/security/components/two-factor-setup";

export const metadata = { title: "Two-Factor Authentication" };

export default async function TwoFactorPage() {
  const user = await requireAuth();
  const status = await twoFactorService.getTwoFactorStatus(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Two-factor authentication"
        description="Protect your account with an authenticator app (Google, Microsoft, or any RFC 6238 app)"
      />
      <TwoFactorSetup
        enabled={status.enabled}
        remainingBackupCodes={status.remainingBackupCodes}
      />
    </div>
  );
}
