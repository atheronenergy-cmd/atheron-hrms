import { addDays, format } from "date-fns";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { EmployeeDashboardStats } from "@/modules/employee/domain/types";

function fullName(first: string, middle: string | null, last: string) {
  return [first, middle, last].filter(Boolean).join(" ");
}

export class EmployeeDashboardService extends BaseRepository {
  async getStats(): Promise<EmployeeDashboardStats> {
    const companyId = this.requireCompanyId();
    const now = new Date();
    const thirtyDaysAgo = addDays(now, -30);
    const nextWeek = addDays(now, 7);

    const [totalEmployees, activeCount, inactiveCount, probationCount, newJoinersCount, employees] =
      await Promise.all([
        prisma.employee.count({ where: { companyId, deletedAt: null } }),
        prisma.employee.count({ where: { companyId, deletedAt: null, employmentStatus: "active" } }),
        prisma.employee.count({
          where: { companyId, deletedAt: null, OR: [{ status: "inactive" }, { employmentStatus: "inactive" }] },
        }),
        prisma.employee.count({ where: { companyId, deletedAt: null, employmentStatus: "probation" } }),
        prisma.employee.count({
          where: { companyId, deletedAt: null, dateOfJoining: { gte: thirtyDaysAgo } },
        }),
        prisma.employee.findMany({
          where: { companyId, deletedAt: null, dateOfBirth: { not: null } },
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            middleName: true,
            lastName: true,
            dateOfBirth: true,
            dateOfJoining: true,
          },
          take: 500,
        }),
      ]);

    const upcomingBirthdays = employees
      .filter((e) => e.dateOfBirth)
      .map((e) => {
        const dob = e.dateOfBirth!;
        const thisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1);
        return {
          id: e.id,
          employeeCode: e.employeeCode,
          fullName: fullName(e.firstName, e.middleName, e.lastName),
          date: format(thisYear, "yyyy-MM-dd"),
          label: "Birthday",
          sortDate: thisYear,
        };
      })
      .filter((e) => e.sortDate <= nextWeek)
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .slice(0, 5)
      .map(({ sortDate: _, ...rest }) => rest);

    const upcomingAnniversaries = employees
      .map((e) => {
        const join = e.dateOfJoining;
        const thisYear = new Date(now.getFullYear(), join.getMonth(), join.getDate());
        if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1);
        const years = now.getFullYear() - join.getFullYear();
        return {
          id: e.id,
          employeeCode: e.employeeCode,
          fullName: fullName(e.firstName, e.middleName, e.lastName),
          date: format(thisYear, "yyyy-MM-dd"),
          label: `${years} year anniversary`,
          sortDate: thisYear,
        };
      })
      .filter((e) => e.sortDate <= nextWeek)
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .slice(0, 5)
      .map(({ sortDate: _, ...rest }) => rest);

    return {
      totalEmployees,
      activeCount,
      inactiveCount,
      probationCount,
      newJoinersCount,
      upcomingBirthdays,
      upcomingAnniversaries,
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createEmployeeDashboardService(companyId: string) {
  return new EmployeeDashboardService(companyId);
}
