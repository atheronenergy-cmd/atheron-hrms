import { DesignationTable } from "@/modules/organization/components/entity-tables";
import {
  designationQuerySchema,
  getOrgServices,
  parseListQuery,
  requireOrgContext,
} from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Designations" };

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function DesignationsPage({ searchParams }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.DESIGNATION.PROFILE.READ);
  const query = parseListQuery(await searchParams, designationQuerySchema);
  const { designation } = await getOrgServices(companyId);
  const data = await designation.list(query);
  return <DesignationTable data={data} />;
}
