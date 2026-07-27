import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { EmployeeStatusChangeInput } from "@/modules/employee/validation/schemas";
import { NotFoundError } from "@/shared/errors";

import { createEmployeeTimelineService } from "./employee-timeline.service";

export class EmployeeLifecycleService extends BaseRepository {
  private timeline = createEmployeeTimelineService(this.companyId);

  async deactivate(id: string, version: number, actorUserId: string, reason?: string) {
    const companyId = this.requireCompanyId();
    const emp = await prisma.employee.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!emp) throw new NotFoundError("Employee", id);

    await prisma.employee.update({
      where: { id, version },
      data: {
        status: "inactive",
        employmentStatus: emp.employmentStatus === "active" ? "inactive" : emp.employmentStatus,
        updatedBy: actorUserId,
        version: { increment: 1 },
        remarks: reason ? `${emp.remarks ?? ""}\nDeactivated: ${reason}`.trim() : emp.remarks,
      },
    });

    await this.timeline.record({
      employeeId: id,
      eventType: "employee_deactivated",
      title: "Employee deactivated",
      description: reason,
      actorUserId,
    });
  }

  async reactivate(id: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await prisma.employee.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!emp) throw new NotFoundError("Employee", id);

    await prisma.employee.update({
      where: { id, version },
      data: {
        status: "active",
        employmentStatus: "active",
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await this.timeline.record({
      employeeId: id,
      eventType: "employee_reactivated",
      title: "Employee reactivated",
      actorUserId,
    });
  }

  async changeStatus(input: EmployeeStatusChangeInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await prisma.employee.findFirst({ where: { id: input.id, companyId, deletedAt: null } });
    if (!emp) throw new NotFoundError("Employee", input.id);

    await prisma.employee.update({
      where: { id: input.id, version: input.version },
      data: {
        employmentStatus: input.employmentStatus,
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await this.timeline.record({
      employeeId: input.id,
      eventType: "status_changed",
      title: "Employment status changed",
      description: input.reason,
      actorUserId,
      metadata: { from: emp.employmentStatus, to: input.employmentStatus },
    });
  }

  async softDelete(id: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await prisma.employee.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!emp) throw new NotFoundError("Employee", id);

    await prisma.employee.update({
      where: { id, version },
      data: {
        deletedAt: new Date(),
        deletedBy: actorUserId,
        status: "inactive",
        version: { increment: 1 },
      },
    });

    await this.timeline.record({
      employeeId: id,
      eventType: "employee_deleted",
      title: "Employee deleted",
      actorUserId,
    });
  }

  async restore(id: string, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await prisma.employee.findFirst({ where: { id, companyId, deletedAt: { not: null } } });
    if (!emp) throw new NotFoundError("Employee", id);

    await prisma.employee.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        status: "active",
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await this.timeline.record({
      employeeId: id,
      eventType: "employee_restored",
      title: "Employee restored",
      actorUserId,
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createEmployeeLifecycleService(companyId: string) {
  return new EmployeeLifecycleService(companyId);
}
