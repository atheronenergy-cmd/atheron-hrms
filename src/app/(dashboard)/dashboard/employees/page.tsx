import { PageHeader } from "@/components/ui/page-header";
import { EmployeeDashboard } from "@/modules/employee/components/employee-dashboard";
import { EmployeeTable } from "@/modules/employee/components/employee-table";
import {
  getEmployeeServices,
  parseEmployeeListQuery,
  requireEmployeeContext,
} from "@/modules/employee/server/page-utils";
import { getOrgServices } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Employees" };

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function EmployeesPage({ searchParams }: PageProps) {
  const { companyId } = await requireEmployeeContext(PERMISSIONS.EMPLOYEE.PROFILE.READ);
  const params = await searchParams;
  const query = parseEmployeeListQuery(params);

  const { employee, dashboard } = getEmployeeServices(companyId);
  const { branch, department } = await getOrgServices(companyId);

  const [stats, data, branches, departments] = await Promise.all([
    dashboard.getStats(),
    employee.list(query),
    branch.list({ page: 1, pageSize: 200 }),
    department.list({ page: 1, pageSize: 200 }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Employees" description="Workforce registry, analytics, and lifecycle management" />
      <EmployeeDashboard stats={stats} />
      <EmployeeTable
        data={data}
        branches={branches.items.map((b) => ({ id: b.id, name: b.name }))}
        departments={departments.items.map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  );
}
