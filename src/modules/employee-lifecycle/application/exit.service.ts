import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { DEFAULT_EXIT_CLEARANCE_ITEMS } from "@/modules/employee-lifecycle/domain/types";
import type { AlumniRecordItem, ExitClearanceRecord, TerminationRecordItem } from "@/modules/employee-lifecycle/domain/types";
import { recordJourneyAndTimeline } from "@/modules/employee-lifecycle/application/lifecycle-audit.service";
import type { TerminationInput } from "@/modules/employee-lifecycle/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class ExitService extends BaseRepository {
  async getClearance(employeeId: string): Promise<ExitClearanceRecord | null> {
    const companyId = this.requireCompanyId();
    const row = await prisma.exitClearance.findFirst({
      where: { companyId, employeeId, status: "active" },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    if (!row) return null;
    return {
      id: row.id,
      employeeId: row.employeeId,
      status: row.status,
      version: row.version,
      items: row.items.map((i) => ({
        id: i.id,
        department: i.department,
        checklistItem: i.checklistItem,
        status: i.status,
      })),
    };
  }

  async initClearance(
    employeeId: string,
    actorUserId: string,
    options?: { resignationRecordId?: string; terminationRecordId?: string },
  ) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(employeeId, companyId);

    const clearance = await prisma.exitClearance.create({
      data: {
        companyId,
        employeeId,
        resignationRecordId: options?.resignationRecordId ?? null,
        terminationRecordId: options?.terminationRecordId ?? null,
        createdBy: actorUserId,
        items: {
          create: DEFAULT_EXIT_CLEARANCE_ITEMS.map((item) => ({
            department: item.department,
            checklistItem: item.item,
            status: "pending",
          })),
        },
      },
      include: { items: true },
    });

    await prisma.lifecycleNotification.create({
      data: {
        companyId,
        employeeId,
        type: "exit_pending",
        title: "Exit clearance pending",
        message: "Department clearances are pending.",
        metadata: { clearanceId: clearance.id } as object,
      },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId,
      stage: "exit_clearance",
      eventType: "exit_clearance_started",
      title: "Exit clearance started",
      entityType: "exit_clearance",
      entityId: clearance.id,
      actorUserId,
    });

    return clearance;
  }

  async updateClearanceItem(itemId: string, clearanceId: string, version: number, status: "pending" | "completed" | "waived", actorUserId: string, remarks?: string) {
    const companyId = this.requireCompanyId();
    const clearance = await prisma.exitClearance.findFirst({ where: { id: clearanceId, companyId } });
    if (!clearance) throw new NotFoundError("Exit clearance", clearanceId);

    await prisma.exitClearanceItem.update({
      where: { id: itemId },
      data: {
        status,
        completedAt: status === "completed" ? new Date() : null,
        completedBy: status === "completed" ? actorUserId : null,
        remarks: remarks ?? null,
      },
    });

    const pending = await prisma.exitClearanceItem.count({
      where: { exitClearanceId: clearanceId, status: "pending" },
    });

    if (pending === 0) {
      await prisma.exitClearance.update({
        where: { id: clearanceId, version },
        data: { status: "completed", completedAt: new Date(), completedBy: actorUserId, version: { increment: 1 } },
      });
    }

    return clearance;
  }

  async terminate(input: TerminationInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await this.assertEmployee(input.employeeId, companyId);

    const row = await prisma.terminationRecord.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        terminationDate: input.terminationDate,
        reason: input.reason,
        approvedBy: actorUserId,
        comments: input.comments ?? null,
        createdBy: actorUserId,
      },
    });

    await this.initClearance(input.employeeId, actorUserId, { terminationRecordId: row.id });

    await prisma.employee.update({
      where: { id: input.employeeId, version: emp.version },
      data: {
        employmentStatus: "terminated",
        dateOfSeparation: input.terminationDate,
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId: input.employeeId,
      stage: "termination",
      eventType: "terminated",
      title: "Employment terminated",
      description: input.reason,
      entityType: "termination_record",
      entityId: row.id,
      actorUserId,
    });

    return row;
  }

  async listTerminations(employeeId: string): Promise<TerminationRecordItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.terminationRecord.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { terminationDate: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      terminationDate: r.terminationDate.toISOString().slice(0, 10),
      reason: r.reason,
      comments: r.comments,
      version: r.version,
    }));
  }

  async finalizeExit(employeeId: string, exitDate: Date, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
      include: { department: { select: { name: true } }, designation: { select: { name: true } } },
    });
    if (!emp) throw new NotFoundError("Employee", employeeId);

    const journeyEvents = await prisma.employeeJourneyEvent.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { eventDate: "asc" },
      take: 50,
    });

    await prisma.alumniRecord.upsert({
      where: { employeeId },
      create: {
        companyId,
        employeeId,
        joiningDate: emp.dateOfJoining,
        exitDate,
        lastDesignation: emp.designation.name,
        lastDepartment: emp.department.name,
        employmentHistory: journeyEvents.map((e) => ({
          stage: e.stage,
          eventType: e.eventType,
          title: e.title,
          eventDate: e.eventDate.toISOString(),
        })) as object,
        createdBy: actorUserId,
      },
      update: {
        exitDate,
        lastDesignation: emp.designation.name,
        lastDepartment: emp.department.name,
        updatedAt: new Date(),
      },
    });

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        employmentStatus: "separated",
        dateOfSeparation: exitDate,
        status: "inactive",
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId,
      stage: "alumni",
      eventType: "exited",
      title: "Employee exited",
      entityType: "alumni_record",
      actorUserId,
    });

    await recordJourneyAndTimeline(companyId, {
      employeeId,
      stage: "alumni",
      eventType: "alumni_created",
      title: "Moved to alumni",
      actorUserId,
    });

    return emp;
  }

  async getAlumni(employeeId: string): Promise<AlumniRecordItem | null> {
    const companyId = this.requireCompanyId();
    const row = await prisma.alumniRecord.findFirst({ where: { companyId, employeeId } });
    if (!row) return null;
    return {
      id: row.id,
      employeeId: row.employeeId,
      joiningDate: row.joiningDate.toISOString().slice(0, 10),
      exitDate: row.exitDate.toISOString().slice(0, 10),
      lastDesignation: row.lastDesignation,
      lastDepartment: row.lastDepartment,
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

export function createExitService(companyId: string) {
  return new ExitService(companyId);
}
