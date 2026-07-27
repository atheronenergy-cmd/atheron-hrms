import { PageHeader } from "@/components/ui/page-header";
import { EmployeeForm } from "@/modules/employee/components/employee-form";
import {
  getEmployeeServices,
  requireEmployeeContext,
} from "@/modules/employee/server/page-utils";
import { getOrgServices } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Add Employee" };

export default async function NewEmployeePage() {
  const { companyId } = await requireEmployeeContext(PERMISSIONS.EMPLOYEE.PROFILE.CREATE);
  const { branch, department, designation } = await getOrgServices(companyId);
  const { employee } = getEmployeeServices(companyId);

  const [branches, departments, designations, managers] = await Promise.all([
    branch.list({ page: 1, pageSize: 200 }),
    department.list({ page: 1, pageSize: 200 }),
    designation.list({ page: 1, pageSize: 200 }),
    employee.list({ page: 1, pageSize: 200, employmentStatus: "active", sortBy: "createdAt", sortOrder: "desc" }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Add Employee" description="Create a new employee record" />
      <EmployeeForm
        mode="create"
        branches={branches.items.map((b) => ({ id: b.id, name: b.name }))}
        departments={departments.items.map((d) => ({ id: d.id, name: d.name }))}
        designations={designations.items.map((d) => ({ id: d.id, name: d.name }))}
        managers={managers.items.map((m) => ({ id: m.id, name: m.fullName }))}
      />
    </div>
  );
}
