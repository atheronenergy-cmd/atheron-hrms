import { PageHeader } from "@/components/ui/page-header";
import { CompanySettingsForm } from "@/modules/organization/components/entity-forms";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Company Settings" };

export default async function CompanySettingsPage() {
  const { companyId } = await requireOrgContext(PERMISSIONS.COMPANY.PROFILE.CONFIGURE);
  const { settings } = await getOrgServices(companyId);
  const data = await settings.get();

  return (
    <div className="space-y-6">
      <PageHeader title="Company Settings" description="Currency, payroll date, and notification preferences" />
      <CompanySettingsForm settings={data} />
    </div>
  );
}
