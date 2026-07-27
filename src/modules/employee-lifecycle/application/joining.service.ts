import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { DEFAULT_JOINING_CHECKLIST } from "@/modules/employee-lifecycle/domain/types";
import type { JoiningRecordItem } from "@/modules/employee-lifecycle/domain/types";
import { recordJourneyAndTimeline } from "@/modules/employee-lifecycle/application/lifecycle-audit.service";
import type { JoiningInitInput } from "@/modules/employee-lifecycle/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class JoiningService extends BaseRepository {
  async getByEmployee(employeeId: string): Promise<JoiningRecordItem | null> {
    const companyId = this.requireCompanyId();
    const row = await prisma.employeeJoiningRecord.findFirst({ where: { companyId, employeeId } });
    if (!row) return null;
    return this.toItem(row);
  }

  async init(input: JoiningInitInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await this.assertEmployee(input.employeeId, companyId);

    const row = await prisma.employeeJoiningRecord.upsert({
      where: { employeeId: input.employeeId },
      create: {
        companyId,
        employeeId: input.employeeId,
        joiningDate: input.joiningDate,
        checklist: DEFAULT_JOINING_CHECKLIST.map((i) => ({ ...i })) as object,
        status: "in_progress",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: {
        joiningDate: input.joiningDate,
        status: "in_progress",
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId: input.employeeId,
      stage: "joining",
      eventType: "employee_joined",
      title: "Employee joined",
      description: `Joining date: ${input.joiningDate.toISOString().slice(0, 10)}`,
      entityType: "employee_joining_record",
      entityId: row.id,
      actorUserId,
    });

    if (emp.employmentStatus !== "probation" && emp.employmentStatus !== "active") {
      await prisma.employee.update({
        where: { id: input.employeeId },
        data: { employmentStatus: "probation", updatedBy: actorUserId, version: { increment: 1 } },
      });
    }

    return row;
  }

  async updateChecklist(employeeId: string, version: number, code: string, completed: boolean, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const row = await prisma.employeeJoiningRecord.findFirst({ where: { companyId, employeeId } });
    if (!row) throw new NotFoundError("Joining record", employeeId);

    const checklist = (row.checklist as Array<Record<string, unknown>>).map((item) =>
      item.code === code
        ? { ...item, completed, completedAt: completed ? new Date().toISOString() : null, completedBy: completed ? actorUserId : null }
        : item,
    );

    return prisma.employeeJoiningRecord.update({
      where: { employeeId, version },
      data: { checklist: checklist as object, updatedBy: actorUserId, version: { increment: 1 } },
    });
  }

  async approve(employeeId: string, version: number, approverType: "hr" | "manager", actorUserId: string) {
    const companyId = this.requireCompanyId();
    const row = await prisma.employeeJoiningRecord.findFirst({ where: { companyId, employeeId } });
    if (!row) throw new NotFoundError("Joining record", employeeId);

    const data =
      approverType === "hr"
        ? { hrApproved: true, hrApprovedBy: actorUserId, hrApprovedAt: new Date(), status: row.managerApproved ? "completed" as const : "hr_approved" as const }
        : { managerApproved: true, managerApprovedBy: actorUserId, managerApprovedAt: new Date(), status: row.hrApproved ? "completed" as const : "manager_approved" as const };

    const updated = await prisma.employeeJoiningRecord.update({
      where: { employeeId, version },
      data: {
        ...data,
        completedAt: data.status === "completed" ? new Date() : null,
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    if (updated.status === "completed") {
      await recordJourneyAndTimeline(companyId, {
        employeeId,
        stage: "joining",
        eventType: "document_verified",
        title: "Joining checklist completed",
        entityType: "employee_joining_record",
        entityId: updated.id,
        actorUserId,
      });
    }

    return updated;
  }

  private toItem(row: { id: string; employeeId: string; joiningDate: Date; checklist: unknown; status: string; hrApproved: boolean; managerApproved: boolean; version: number }): JoiningRecordItem {
    return {
      id: row.id,
      employeeId: row.employeeId,
      joiningDate: row.joiningDate.toISOString().slice(0, 10),
      checklist: (row.checklist as JoiningRecordItem["checklist"]) ?? [],
      status: row.status,
      hrApproved: row.hrApproved,
      managerApproved: row.managerApproved,
      version: row.version,
    };
  }

  private async assertEmployee(employeeId: string, companyId: string) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
    if (!employee) throw new NotFoundError("Employee", employeeId);
    return employee;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createJoiningService(companyId: string) {
  return new JoiningService(companyId);
}
