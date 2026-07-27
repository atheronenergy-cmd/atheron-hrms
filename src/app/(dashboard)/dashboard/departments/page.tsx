import { DepartmentTable } from "@/modules/organization/components/department-table";
import {
  departmentQuerySchema,
  getOrgServices,
  parseListQuery,
  requireOrgContext,
} from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Departments" };

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function DepartmentsPage({ searchParams }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.DEPARTMENT.PROFILE.READ);
  const query = parseListQuery(await searchParams, departmentQuerySchema);
  const { department } = await getOrgServices(companyId);
  const data = await department.list(query);
  return <DepartmentTable data={data} />;
}
