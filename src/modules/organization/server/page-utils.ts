import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { createBranchService } from "@/modules/organization/application/branch.service";
import { createCompanyService } from "@/modules/organization/application/company.service";
import { createDepartmentService } from "@/modules/organization/application/department.service";
import { createDesignationService } from "@/modules/organization/application/designation.service";
import { createHolidayService } from "@/modules/organization/application/holiday.service";
import { createOrganizationService } from "@/modules/organization/application/organization.service";
import { createPolicyService } from "@/modules/organization/application/policy.service";
import {
  createSettingsService,
  createWorkingScheduleService,
} from "@/modules/organization/application/working-schedule.service";
import {
  branchQuerySchema,
  departmentQuerySchema,
  designationQuerySchema,
  holidayQuerySchema,
  policyQuerySchema,
  scheduleQuerySchema,
} from "@/modules/organization/validation/schemas";

export async function requireOrgContext(permission: string) {
  await guardPagePermission(permission);
  const auth = await requireAuth();
  if (!auth.companyId) throw new Error("Company context required");
  return { auth, companyId: auth.companyId };
}

export async function getOrgServices(companyId: string) {
  return {
    org: createOrganizationService(companyId),
    company: createCompanyService(companyId),
    branch: createBranchService(companyId),
    department: createDepartmentService(companyId),
    designation: createDesignationService(companyId),
    holiday: createHolidayService(companyId),
    policy: createPolicyService(companyId),
    schedule: createWorkingScheduleService(companyId),
    settings: createSettingsService(companyId),
  };
}

export function parseListQuery<T extends { page?: number; pageSize?: number }>(
  searchParams: Record<string, string | undefined>,
  schema: { parse: (v: unknown) => T },
): T {
  return schema.parse(searchParams);
}

export { branchQuerySchema, departmentQuerySchema, designationQuerySchema, holidayQuerySchema, policyQuerySchema, scheduleQuerySchema };
