import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { HolidayForm } from "@/modules/organization/components/entity-forms";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditHolidayPage({ params }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.HOLIDAY.CALENDAR.UPDATE);
  const { id } = await params;
  const { holiday, branch } = await getOrgServices(companyId);
  const [item, branches] = await Promise.all([
    holiday.getById(id).catch(() => null),
    branch.list({ page: 1, pageSize: 100 }),
  ]);
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Holiday" description={item.name} />
      <HolidayForm
        mode="edit"
        branches={branches.items.map((b) => ({ id: b.id, name: b.name }))}
        defaultValues={{
          id: item.id,
          version: item.version,
          name: item.name,
          date: item.date,
          holidayType: item.holidayType,
          description: item.description ?? "",
          branchId: item.branchId ?? undefined,
          applicableDepartmentIds: Array.isArray(item.applicableDepartmentIds)
            ? (item.applicableDepartmentIds as string[])
            : [],
          status: item.status,
        }}
      />
    </div>
  );
}
