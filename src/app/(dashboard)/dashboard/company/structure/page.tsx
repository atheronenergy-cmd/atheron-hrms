import { PageHeader } from "@/components/ui/page-header";
import { OrganizationStructure } from "@/modules/organization/components/organization-structure";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Organization Structure" };

export default async function StructurePage() {
  const { companyId } = await requireOrgContext(PERMISSIONS.COMPANY.PROFILE.READ);
  const { org } = await getOrgServices(companyId);
  const tree = await org.getStructureTree();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Structure"
        description="Company → Branch → Department → Designation hierarchy"
      />
      <OrganizationStructure tree={tree} />
    </div>
  );
}
