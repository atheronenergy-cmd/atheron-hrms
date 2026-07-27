import { BranchTable } from "@/modules/organization/components/branch-table";
import { branchQuerySchema, getOrgServices, parseListQuery, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Branches" };

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function BranchesPage({ searchParams }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.BRANCH.PROFILE.READ);
  const query = parseListQuery(await searchParams, branchQuerySchema);
  const { branch } = await getOrgServices(companyId);
  const data = await branch.list(query);
  return <BranchTable data={data} />;
}
