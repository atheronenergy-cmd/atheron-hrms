import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createLeaveAttendanceIntegrationService } from "@/modules/leave/application/leave-attendance-integration.service";
import { createLeaveBalanceService } from "@/modules/leave/application/leave-balance.service";
import { recordLeaveHistory } from "@/modules/leave/application/leave-audit.service";
import type { LeaveApprovalItem } from "@/modules/leave/domain/types";
import type { LeaveApprovalInput } from "@/modules/leave/validation/schemas";
import { ConflictError, NotFoundError } from "@/shared/errors";

export class LeaveApprovalService extends BaseRepository {
  async initWorkflow(leaveId: string) {
    const companyId = this.requireCompanyId();
    const leave = await prisma.leave.findFirst({
      where: { id: leaveId, companyId },
      include: { leaveType: true },
    });
    if (!leave) throw new NotFoundError("Leave", leaveId);

    const levels: Array<{ role: "manager" | "department_head" | "hr"; level: number }> = [];
    let level = 1;
    if (leave.leaveType.managerApprovalRequired) {
      levels.push({ role: "manager", level: level++ });
    }
    levels.push({ role: "department_head", level: level++ });
    if (leave.leaveType.hrApprovalRequired) {
      levels.push({ role: "hr", level: level++ });
    }

    await prisma.leaveApproval.createMany({
      data: levels.map((l) => ({
        companyId,
        leaveId,
        approverRole: l.role,
        level: l.level,
        status: l.level === 1 ? "pending" : "draft",
      })),
    });

    await prisma.leave.update({
      where: { id: leaveId },
      data: { currentApprovalLevel: 1 },
    });
  }

  async listPending() {
    const companyId = this.requireCompanyId();
    const rows = await prisma.leave.findMany({
      where: { companyId, deletedAt: null, status: { in: ["pending", "sent_back"] } },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return rows.map(
      (r): LeaveApprovalItem => ({
        id: r.id,
        leaveId: r.id,
        employeeName: [r.employee.firstName, r.employee.lastName].filter(Boolean).join(" "),
        leaveTypeName: r.leaveType.name,
        startDate: r.startDate.toISOString().slice(0, 10),
        endDate: r.endDate.toISOString().slice(0, 10),
        totalDays: Number(r.totalDays),
        status: r.status,
        currentApprovalLevel: r.currentApprovalLevel,
        version: r.version,
      }),
    );
  }

  async process(input: LeaveApprovalInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const leave = await prisma.leave.findFirst({
      where: { id: input.leaveId, companyId, deletedAt: null },
      include: { leaveType: true },
    });
    if (!leave) throw new NotFoundError("Leave", input.leaveId);
    if (leave.version !== input.version) throw new ConflictError("Leave was modified. Refresh and try again.");

    const currentApproval = await prisma.leaveApproval.findFirst({
      where: { leaveId: leave.id, level: leave.currentApprovalLevel, status: "pending" },
    });

    switch (input.action) {
      case "reject":
        return this.finalize(leave, "rejected", actorUserId, input.comments, false);
      case "send_back":
        await this.updateCurrentApproval(currentApproval?.id, "sent_back", actorUserId, input.comments);
        await createLeaveBalanceService(companyId).releasePending(
          leave.employeeId,
          leave.leaveTypeId,
          leave.startDate.getFullYear(),
          Number(leave.totalDays),
        );
        return this.updateLeaveStatus(leave, "sent_back", actorUserId, input.comments);
      case "cancel":
        return this.finalize(leave, "cancelled", actorUserId, input.comments, true);
      case "escalate":
        return this.advanceLevel(leave, actorUserId, input.comments, true);
      case "approve":
      default:
        if (currentApproval) {
          await this.updateCurrentApproval(currentApproval.id, "approved", actorUserId, input.comments);
        }
        const next = await prisma.leaveApproval.findFirst({
          where: { leaveId: leave.id, level: leave.currentApprovalLevel + 1 },
        });
        if (next) {
          await prisma.leaveApproval.update({ where: { id: next.id }, data: { status: "pending" } });
          return this.advanceLevel(leave, actorUserId, input.comments, false);
        }
        return this.finalize(leave, "approved", actorUserId, input.comments, false);
    }
  }

  private async finalize(
    leave: { id: string; employeeId: string; leaveTypeId: string; startDate: Date; totalDays: Prisma.Decimal; leaveType: { isPaid: boolean }; status: string; version: number },
    status: "approved" | "rejected" | "cancelled",
    actorUserId: string,
    comments?: string,
    releaseBalance = false,
  ) {
    const companyId = this.requireCompanyId();
    await prisma.leaveApproval.updateMany({
      where: { leaveId: leave.id, status: "pending" },
      data: { status: status === "approved" ? "approved" : status, approverUserId: actorUserId, comments: comments ?? null, actedAt: new Date() },
    });

    const updated = await this.updateLeaveStatus(leave, status, actorUserId, comments);
    const balance = createLeaveBalanceService(companyId);
    const year = leave.startDate.getFullYear();
    const days = Number(leave.totalDays);

    if (leave.leaveType.isPaid) {
      if (status === "approved") {
        await balance.releasePending(leave.employeeId, leave.leaveTypeId, year, days, true);
        await createLeaveAttendanceIntegrationService(companyId).syncApprovedLeave(leave.id, actorUserId);
      } else if (releaseBalance || status === "rejected") {
        await balance.releasePending(leave.employeeId, leave.leaveTypeId, year, days);
      }
    } else if (status === "approved") {
      await createLeaveAttendanceIntegrationService(companyId).syncApprovedLeave(leave.id, actorUserId);
    }

    await recordLeaveHistory({
      companyId,
      leaveId: leave.id,
      employeeId: leave.employeeId,
      action: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "cancelled",
      fromStatus: leave.status,
      toStatus: status,
      actorUserId,
      metadata: { comments },
    });

    return updated;
  }

  private async advanceLevel(
    leave: { id: string; employeeId: string; currentApprovalLevel: number; status: string; version: number },
    actorUserId: string,
    comments?: string,
    escalate = false,
  ) {
    const companyId = this.requireCompanyId();
    const nextLevel = escalate ? leave.currentApprovalLevel + 1 : leave.currentApprovalLevel + 1;
    return prisma.leave.update({
      where: { id: leave.id, version: leave.version },
      data: {
        currentApprovalLevel: nextLevel,
        status: "pending",
        updatedBy: actorUserId,
        version: { increment: 1 },
        remarks: comments ?? undefined,
      },
    });
  }

  private async updateLeaveStatus(
    leave: { id: string; employeeId: string; status: string; version: number },
    status: string,
    actorUserId: string,
    comments?: string,
  ) {
    return prisma.leave.update({
      where: { id: leave.id, version: leave.version },
      data: {
        status: status as never,
        updatedBy: actorUserId,
        version: { increment: 1 },
        ...(status === "cancelled" ? { cancelledAt: new Date(), cancellationReason: comments ?? null } : {}),
        remarks: comments ?? undefined,
      },
    });
  }

  private async updateCurrentApproval(id: string | undefined, status: string, actorUserId: string, comments?: string) {
    if (!id) return;
    await prisma.leaveApproval.update({
      where: { id },
      data: { status: status as never, approverUserId: actorUserId, comments: comments ?? null, actedAt: new Date() },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLeaveApprovalService(companyId: string) {
  return new LeaveApprovalService(companyId);
}
