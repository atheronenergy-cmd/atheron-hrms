import { PageHeader } from "@/components/ui/page-header";
import { HolidayForm } from "@/modules/organization/components/entity-forms";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export default async function NewHolidayPage() {
  const { companyId } = await requireOrgContext(PERMISSIONS.HOLIDAY.CALENDAR.CREATE);
  const { branch } = await getOrgServices(companyId);
  const branches = await branch.list({ page: 1, pageSize: 100 });
  return (
    <div className="space-y-6">
      <PageHeader title="Create Holiday" />
      <HolidayForm mode="create" branches={branches.items.map((b) => ({ id: b.id, name: b.name }))} />
    </div>
  );
}
