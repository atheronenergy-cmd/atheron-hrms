import { prisma } from "@/infrastructure/database/prisma-client";
import type { OrgDashboardStats, OrgStructureNode } from "@/modules/organization/domain/types";

export class OrganizationService {
  constructor(private readonly companyId: string) {}

  async getDashboardStats(): Promise<OrgDashboardStats> {
    const base = { companyId: this.companyId, deletedAt: null };
    const [branchCount, departmentCount, designationCount, activePolicyCount, employeeCount, holidayCount, scheduleCount] =
      await Promise.all([
        prisma.branch.count({ where: { ...base } }),
        prisma.department.count({ where: { ...base } }),
        prisma.designation.count({ where: { ...base } }),
        prisma.hRPolicy.count({ where: { ...base, status: "active" } }),
        prisma.employee.count({ where: { companyId: this.companyId, deletedAt: null } }),
        prisma.holiday.count({ where: { ...base, status: "active" } }),
        prisma.shift.count({ where: { ...base, status: "active" } }),
      ]);

    return {
      branchCount,
      departmentCount,
      designationCount,
      activePolicyCount,
      employeeCount,
      holidayCount,
      scheduleCount,
    };
  }

  async getStructureTree(): Promise<OrgStructureNode | null> {
    const company = await prisma.company.findFirst({
      where: { id: this.companyId, deletedAt: null },
      include: {
        branches: {
          where: { deletedAt: null },
          orderBy: { name: "asc" },
          include: {
            departments: {
              where: { deletedAt: null },
              orderBy: { name: "asc" },
              include: {
                designations: {
                  where: { deletedAt: null },
                  orderBy: { level: "asc" },
                },
              },
            },
          },
        },
        departments: {
          where: { deletedAt: null, branchId: null },
          orderBy: { name: "asc" },
          include: {
            designations: {
              where: { deletedAt: null },
              orderBy: { level: "asc" },
            },
          },
        },
        designations: {
          where: { deletedAt: null, departmentId: null },
          orderBy: { level: "asc" },
        },
      },
    });

    if (!company) return null;

    const mapDesignations = (
      designations: { id: string; name: string; code: string; status: string }[],
    ): OrgStructureNode[] =>
      designations.map((d) => ({
        id: d.id,
        type: "designation" as const,
        label: d.name,
        code: d.code,
        status: d.status,
      }));

    const mapDepartments = (
      departments: {
        id: string;
        name: string;
        code: string;
        status: string;
        designations: { id: string; name: string; code: string; status: string }[];
      }[],
    ): OrgStructureNode[] =>
      departments.map((d) => ({
        id: d.id,
        type: "department" as const,
        label: d.name,
        code: d.code,
        status: d.status,
        children: mapDesignations(d.designations),
      }));

    const branchNodes: OrgStructureNode[] = company.branches.map((b) => ({
      id: b.id,
      type: "branch",
      label: b.name,
      code: b.code,
      status: b.status,
      children: mapDepartments(b.departments),
    }));

    const rootDepartments = mapDepartments(company.departments);
    const rootDesignations = mapDesignations(company.designations);

    return {
      id: company.id,
      type: "company",
      label: company.name,
      code: company.companyCode ?? undefined,
      status: company.status,
      children: [...branchNodes, ...rootDepartments, ...rootDesignations],
    };
  }
}

export function createOrganizationService(companyId: string) {
  return new OrganizationService(companyId);
}
