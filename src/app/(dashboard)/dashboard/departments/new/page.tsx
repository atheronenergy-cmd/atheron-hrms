import { PageHeader } from "@/components/ui/page-header";
import { DepartmentForm } from "@/modules/organization/components/department-form";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "New Department" };

export default async function NewDepartmentPage() {
  const { companyId } = await requireOrgContext(PERMISSIONS.DEPARTMENT.PROFILE.CREATE);
  const { branch } = await getOrgServices(companyId);
  const branches = await branch.list({ page: 1, pageSize: 100 });

  return (
    <div className="space-y-6">
      <PageHeader title="Create Department" description="Add an organizational unit" />
      <DepartmentForm mode="create" branches={branches.items.map((b) => ({ id: b.id, name: b.name }))} />
    </div>
  );
}
