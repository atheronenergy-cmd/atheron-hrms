import { PageHeader } from "@/components/ui/page-header";
import { ScheduleForm } from "@/modules/organization/components/entity-forms";
import { requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export default async function NewSchedulePage() {
  await requireOrgContext(PERMISSIONS.SHIFT.SCHEDULE.CREATE);
  return (
    <div className="space-y-6">
      <PageHeader title="Create Working Schedule" />
      <ScheduleForm mode="create" />
    </div>
  );
}
