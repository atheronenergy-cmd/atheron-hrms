import { PageHeader } from "@/components/ui/page-header";
import { DesignationForm } from "@/modules/organization/components/entity-forms";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export default async function NewDesignationPage() {
  const { companyId } = await requireOrgContext(PERMISSIONS.DESIGNATION.PROFILE.CREATE);
  const { department } = await getOrgServices(companyId);
  const depts = await department.list({ page: 1, pageSize: 200 });
  return (
    <div className="space-y-6">
      <PageHeader title="Create Designation" />
      <DesignationForm mode="create" departments={depts.items.map((d) => ({ id: d.id, name: d.name }))} />
    </div>
  );
}
