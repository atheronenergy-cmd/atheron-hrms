import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { CompanyForm } from "@/modules/organization/components/company-form";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Company Profile" };

export default async function CompanyProfilePage() {
  const { companyId } = await requireOrgContext(PERMISSIONS.COMPANY.PROFILE.READ);
  const { company } = await getOrgServices(companyId);
  const profile = await company.getCurrent();
  if (!profile) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Company Profile" description="Legal identity, tax registration, and contact information" />
      <CompanyForm company={profile} />
    </div>
  );
}
