import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { DepartmentForm } from "@/modules/organization/components/department-form";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditDepartmentPage({ params }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.DEPARTMENT.PROFILE.UPDATE);
  const { id } = await params;
  const { department, branch } = await getOrgServices(companyId);
  const [item, branches] = await Promise.all([
    department.getById(id).catch(() => null),
    branch.list({ page: 1, pageSize: 100 }),
  ]);
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Department" description={item.name} />
      <DepartmentForm
        mode="edit"
        branches={branches.items.map((b) => ({ id: b.id, name: b.name }))}
        defaultValues={{
          id: item.id,
          version: item.version,
          name: item.name,
          code: item.code,
          description: item.description ?? "",
          branchId: item.branchId ?? undefined,
          status: item.status,
        }}
      />
    </div>
  );
}
