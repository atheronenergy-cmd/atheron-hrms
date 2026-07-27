import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { DesignationForm } from "@/modules/organization/components/entity-forms";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditDesignationPage({ params }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.DESIGNATION.PROFILE.UPDATE);
  const { id } = await params;
  const { designation, department } = await getOrgServices(companyId);
  const [item, depts] = await Promise.all([
    designation.getById(id).catch(() => null),
    department.list({ page: 1, pageSize: 200 }),
  ]);
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Designation" description={item.name} />
      <DesignationForm
        mode="edit"
        departments={depts.items.map((d) => ({ id: d.id, name: d.name }))}
        defaultValues={{
          id: item.id,
          version: item.version,
          name: item.name,
          code: item.code,
          level: item.level,
          departmentId: item.departmentId ?? undefined,
          description: item.description ?? "",
          status: item.status,
        }}
      />
    </div>
  );
}
