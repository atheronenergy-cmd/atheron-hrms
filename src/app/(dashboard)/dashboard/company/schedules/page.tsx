import { ScheduleTable } from "@/modules/organization/components/entity-tables";
import { getOrgServices, parseListQuery, requireOrgContext, scheduleQuerySchema } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Working Schedules" };

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function SchedulesPage({ searchParams }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.SHIFT.SCHEDULE.READ);
  const query = parseListQuery(await searchParams, scheduleQuerySchema);
  const { schedule } = await getOrgServices(companyId);
  const data = await schedule.list(query);
  return <ScheduleTable data={data} />;
}
