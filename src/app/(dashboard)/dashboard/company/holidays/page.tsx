import { HolidayTable } from "@/modules/organization/components/entity-tables";
import { getOrgServices, holidayQuerySchema, parseListQuery, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Holidays" };

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function HolidaysPage({ searchParams }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.HOLIDAY.CALENDAR.READ);
  const query = parseListQuery(await searchParams, holidayQuerySchema);
  const { holiday } = await getOrgServices(companyId);
  const data = await holiday.list(query);
  return <HolidayTable data={data} />;
}
