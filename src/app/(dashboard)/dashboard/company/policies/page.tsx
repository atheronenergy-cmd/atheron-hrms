import { PolicyTable } from "@/modules/organization/components/entity-tables";
import { getOrgServices, parseListQuery, policyQuerySchema, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "HR Policies" };

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function PoliciesPage({ searchParams }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.HR.POLICY.READ);
  const query = parseListQuery(await searchParams, policyQuerySchema);
  const { policy } = await getOrgServices(companyId);
  const data = await policy.list(query);
  return <PolicyTable data={data} />;
}
