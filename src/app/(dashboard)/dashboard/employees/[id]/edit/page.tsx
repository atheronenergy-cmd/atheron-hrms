import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { EmployeeForm } from "@/modules/employee/components/employee-form";
import {
  getEmployeeServices,
  requireEmployeeContext,
} from "@/modules/employee/server/page-utils";
import { getOrgServices } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Edit Employee" };

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEmployeePage({ params }: PageProps) {
  const { companyId } = await requireEmployeeContext(PERMISSIONS.EMPLOYEE.PROFILE.UPDATE);
  const { id } = await params;
  const { employee } = getEmployeeServices(companyId);
  const { branch, department, designation } = await getOrgServices(companyId);

  try {
    const [profile, branches, departments, designations, managers] = await Promise.all([
      employee.getById(id),
      branch.list({ page: 1, pageSize: 200 }),
      department.list({ page: 1, pageSize: 200 }),
      designation.list({ page: 1, pageSize: 200 }),
      employee.list({ page: 1, pageSize: 200, employmentStatus: "active", sortBy: "createdAt", sortOrder: "desc" }),
    ]);

    return (
      <div className="space-y-6">
        <PageHeader title="Edit Employee" description={profile.fullName} />
        <EmployeeForm
          mode="edit"
          branches={branches.items.map((b) => ({ id: b.id, name: b.name }))}
          departments={departments.items.map((d) => ({ id: d.id, name: d.name }))}
          designations={designations.items.map((d) => ({ id: d.id, name: d.name }))}
          managers={managers.items.filter((m) => m.id !== id).map((m) => ({ id: m.id, name: m.fullName }))}
          defaultValues={{
            id: profile.id,
            version: profile.version,
            branchId: profile.branchId,
            departmentId: profile.departmentId,
            designationId: profile.designationId,
            reportingManagerId: profile.reportingManagerId,
            firstName: profile.firstName,
            middleName: profile.middleName,
            lastName: profile.lastName,
            preferredName: profile.preferredName,
            email: profile.email,
            personalEmail: profile.personalEmail,
            phone: profile.phone,
            alternatePhone: profile.alternatePhone,
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            bloodGroup: profile.bloodGroup,
            nationality: profile.nationality,
            maritalStatus: profile.maritalStatus,
            fatherName: profile.fatherName,
            motherName: profile.motherName,
            spouseName: profile.spouseName,
            emergencyContact: profile.emergencyContact,
            dateOfJoining: profile.dateOfJoining,
            confirmationDate: profile.confirmationDate,
            employmentType: profile.employmentType,
            employmentStatus: profile.employmentStatus,
            probationStatus: profile.probationStatus,
            noticePeriodDays: profile.noticePeriodDays,
            workLocation: profile.workLocation,
            remarks: profile.remarks,
          }}
        />
      </div>
    );
  } catch {
    notFound();
  }
}
