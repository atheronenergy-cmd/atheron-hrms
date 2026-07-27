import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { ScheduleForm } from "@/modules/organization/components/entity-forms";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

type PageProps = { params: Promise<{ id: string }> };

function dateToTimeString(date: Date): string {
  return date.toISOString().slice(11, 16);
}

export default async function EditSchedulePage({ params }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.SHIFT.SCHEDULE.UPDATE);
  const { id } = await params;
  const { schedule } = await getOrgServices(companyId);
  const item = await schedule.getById(id).catch(() => null);
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Working Schedule" description={item.name} />
      <ScheduleForm
        mode="edit"
        defaultValues={{
          id: item.id,
          version: item.version,
          name: item.name,
          code: item.code,
          shiftType: item.shiftType,
          startTime: dateToTimeString(item.startTime),
          endTime: dateToTimeString(item.endTime),
          breakDurationMinutes: item.breakDurationMinutes,
          workingDays: Array.isArray(item.workingDays) ? (item.workingDays as number[]) : [1, 2, 3, 4, 5],
          isOvernight: item.isOvernight,
          status: item.status,
        }}
      />
    </div>
  );
}
