import { prisma } from "@/infrastructure/database/prisma-client";

export type LeaveNotificationEvent =
  | "leave_application_submitted"
  | "leave_approval_pending"
  | "leave_approved"
  | "leave_rejected"
  | "leave_cancelled"
  | "leave_balance_credited";

/**
 * Notification architecture hook — returns payloads for future notification service.
 */
export class LeaveNotificationService {
  async buildPayload(
    event: LeaveNotificationEvent,
    params: { companyId: string; leaveId?: string; employeeId: string; actorUserId?: string; metadata?: Record<string, unknown> },
  ) {
    const employee = await prisma.employee.findFirst({
      where: { id: params.employeeId, companyId: params.companyId },
      select: { firstName: true, lastName: true, email: true, reportingManagerId: true },
    });

    return {
      event,
      companyId: params.companyId,
      leaveId: params.leaveId,
      employeeId: params.employeeId,
      employeeName: employee ? [employee.firstName, employee.lastName].filter(Boolean).join(" ") : "Employee",
      employeeEmail: employee?.email,
      managerId: employee?.reportingManagerId,
      actorUserId: params.actorUserId,
      metadata: params.metadata ?? {},
      channel: "in_app",
    };
  }

  async notify(event: LeaveNotificationEvent, params: Parameters<LeaveNotificationService["buildPayload"]>[1]) {
    const payload = await this.buildPayload(event, params);
    await prisma.activityLog.create({
      data: {
        companyId: params.companyId,
        userId: params.actorUserId,
        action: event,
        entityType: "leave_notification",
        entityId: params.leaveId ?? params.employeeId,
        metadata: payload as object,
      },
    });
    return payload;
  }
}

export const leaveNotificationService = new LeaveNotificationService();
