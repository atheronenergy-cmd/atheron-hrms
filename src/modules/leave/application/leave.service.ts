import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createLeaveApprovalService } from "@/modules/leave/application/leave-approval.service";
import { createLeaveBalanceService } from "@/modules/leave/application/leave-balance.service";
import { leaveDayCalculator } from "@/modules/leave/application/leave-day-calculator";
import { recordLeaveHistory } from "@/modules/leave/application/leave-audit.service";
import type { LeaveListItem } from "@/modules/leave/domain/types";
import type { LeaveApplicationInput, LeaveQueryInput } from "@/modules/leave/validation/schemas";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export class LeaveService extends BaseRepository {
  private get balance() {
    return createLeaveBalanceService(this.requireCompanyId());
  }

  async resolveEmployee(userId: string, employeeId?: string) {
    const companyId = this.requireCompanyId();
    if (employeeId) {
      const emp = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
      if (!emp) throw new NotFoundError("Employee", employeeId);
      return emp;
    }
    const emp = await prisma.employee.findFirst({ where: { userId, companyId, deletedAt: null } });
    if (!emp) throw new NotFoundError("Employee for user", userId);
    return emp;
  }

  async list(query: LeaveQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.LeaveWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.leaveTypeId ? { leaveTypeId: query.leaveTypeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            startDate: {
              ...(query.dateTo ? { lte: dateOnly(query.dateTo) } : {}),
            },
            endDate: {
              ...(query.dateFrom ? { gte: dateOnly(query.dateFrom) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            employee: {
              OR: [
                { firstName: { contains: query.search, mode: "insensitive" } },
                { lastName: { contains: query.search, mode: "insensitive" } },
                { employeeCode: { contains: query.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.leave.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [query.sortBy ?? "startDate"]: query.sortOrder ?? "desc" },
        include: {
          employee: { select: { employeeCode: true, firstName: true, lastName: true } },
          leaveType: { select: { code: true, name: true } },
        },
      }),
      prisma.leave.count({ where }),
    ]);

    return buildPaginatedResult(rows.map((r) => this.toListItem(r)), totalItems, page, pageSize);
  }

  async apply(input: LeaveApplicationInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const employee = await this.resolveEmployee(actorUserId, input.employeeId);
    const leaveType = await prisma.leaveType.findFirst({
      where: { id: input.leaveTypeId, companyId, deletedAt: null, status: "active" },
    });
    if (!leaveType) throw new NotFoundError("Leave type", input.leaveTypeId);

    await this.validateLeaveTypeRules(leaveType, employee, input);

    let totalDays = 0;
    let totalHours = 0;
    if (input.leaveUnit === "hours") {
      if (!leaveType.hourlyLeaveAllowed) throw new BusinessRuleError("Hourly leave is not allowed for this leave type");
      if (!input.startTime || !input.endTime) throw new BusinessRuleError("Start and end time are required for hourly leave");
      totalHours = leaveDayCalculator.calculateHours(input.startTime, input.endTime);
      totalDays = totalHours / 8;
    } else {
      totalDays = await leaveDayCalculator.calculateWorkingDays({
        companyId,
        employeeId: employee.id,
        branchId: employee.branchId,
        startDate: input.startDate,
        endDate: input.endDate,
        halfDayType: input.halfDayType,
      });
    }

    if (totalDays <= 0) throw new BusinessRuleError("No working days in selected range");

    const year = input.startDate.getFullYear();
    if (!leaveType.isPaid) {
      // LWP — no balance check
    } else {
      const balances = await this.balance.getEmployeeBalances(employee.id, year);
      const bal = balances.find((b) => b.leaveTypeId === leaveType.id);
      const closing = bal?.closingBalance ?? 0;
      const policy = await prisma.leavePolicy.findFirst({
        where: { companyId, leaveTypeId: leaveType.id, status: "active" },
      });
      if (closing < totalDays && !policy?.allowNegativeBalance) {
        throw new BusinessRuleError(`Insufficient leave balance. Available: ${closing}, requested: ${totalDays}`);
      }
    }

    const status = input.submit ? "pending" : "draft";
    const leave = await prisma.leave.create({
      data: {
        companyId,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        branchId: employee.branchId,
        departmentId: employee.departmentId,
        startDate: dateOnly(input.startDate),
        endDate: dateOnly(input.endDate),
        startTime: input.startTime ? new Date(`1970-01-01T${input.startTime}:00`) : null,
        endTime: input.endTime ? new Date(`1970-01-01T${input.endTime}:00`) : null,
        totalDays,
        totalHours,
        leaveUnit: input.leaveUnit,
        halfDayType: input.halfDayType,
        reason: input.reason,
        status,
        attachmentFileId: input.attachmentFileId ?? null,
        emergencyContact: (input.emergencyContact ?? {}) as object,
        delegateEmployeeId: input.delegateEmployeeId ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    if (input.attachmentFileId) {
      await prisma.leaveAttachment.create({
        data: {
          companyId,
          leaveId: leave.id,
          fileId: input.attachmentFileId,
          createdBy: actorUserId,
        },
      });
    }

    if (status === "pending" && leaveType.isPaid) {
      await this.balance.reservePending(employee.id, leaveType.id, year, totalDays);
      await createLeaveApprovalService(companyId).initWorkflow(leave.id);
    }

    await recordLeaveHistory({
      companyId,
      leaveId: leave.id,
      employeeId: employee.id,
      action: "applied",
      fromStatus: "draft",
      toStatus: status,
      actorUserId,
      metadata: { totalDays, totalHours },
    });

    return leave;
  }

  async cancel(leaveId: string, version: number, actorUserId: string, reason?: string) {
    const companyId = this.requireCompanyId();
    const leave = await prisma.leave.findFirst({ where: { id: leaveId, companyId, deletedAt: null } });
    if (!leave) throw new NotFoundError("Leave", leaveId);

    if (leave.status === "approved") {
      throw new BusinessRuleError("Approved leave requires cancellation request through approval workflow");
    }
    if (!["draft", "pending", "sent_back"].includes(leave.status)) {
      throw new ConflictError(`Cannot cancel leave in status ${leave.status}`);
    }

    const updated = await prisma.leave.update({
      where: { id: leaveId, version },
      data: {
        status: "cancelled",
        cancellationReason: reason ?? null,
        cancelledAt: new Date(),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    if (leave.status === "pending") {
      const leaveType = await prisma.leaveType.findUnique({ where: { id: leave.leaveTypeId } });
      if (leaveType?.isPaid) {
        await this.balance.releasePending(
          leave.employeeId,
          leave.leaveTypeId,
          leave.startDate.getFullYear(),
          Number(leave.totalDays),
        );
      }
    }

    await recordLeaveHistory({
      companyId,
      leaveId,
      employeeId: leave.employeeId,
      action: "cancelled",
      fromStatus: leave.status,
      toStatus: "cancelled",
      actorUserId,
    });

    return updated;
  }

  async listLeaveTypes() {
    return prisma.leaveType.findMany({
      where: { companyId: this.requireCompanyId(), deletedAt: null, status: "active" },
      orderBy: { code: "asc" },
    });
  }

  private async validateLeaveTypeRules(
    leaveType: {
      genderRestriction: string | null;
      probationRestricted: boolean;
      noticePeriodRestricted: boolean;
      minDaysNotice: number;
      halfDayAllowed: boolean;
      requiresAttachment: boolean;
      medicalCertificateRequired: boolean;
      minDaysPerRequest: Prisma.Decimal;
      maxDaysPerRequest: Prisma.Decimal | null;
      maxPerMonth: Prisma.Decimal | null;
      maxPerYear: Prisma.Decimal | null;
    },
    employee: { id: string; branchId: string; gender: string | null; probationStatus: string | null; noticePeriodDays: number | null },
    input: LeaveApplicationInput,
  ) {
    if (leaveType.genderRestriction && employee.gender !== leaveType.genderRestriction) {
      throw new BusinessRuleError("This leave type is not applicable for your gender");
    }
    if (leaveType.probationRestricted && employee.probationStatus === "active") {
      throw new BusinessRuleError("Leave type not allowed during probation");
    }
    if (leaveType.noticePeriodRestricted && (employee.noticePeriodDays ?? 0) > 0) {
      throw new BusinessRuleError("Leave type not allowed during notice period");
    }
    if (input.halfDayType !== "none" && !leaveType.halfDayAllowed) {
      throw new BusinessRuleError("Half-day leave is not allowed for this leave type");
    }
    if (leaveType.requiresAttachment && !input.attachmentFileId) {
      throw new BusinessRuleError("Attachment is required for this leave type");
    }
    const days =
      input.leaveUnit === "hours"
        ? leaveDayCalculator.calculateHours(input.startTime!, input.endTime!) / 8
        : await leaveDayCalculator.calculateWorkingDays({
            companyId: this.requireCompanyId(),
            employeeId: employee.id,
            branchId: employee.branchId,
            startDate: input.startDate,
            endDate: input.endDate,
            halfDayType: input.halfDayType,
          });

    if (days < Number(leaveType.minDaysPerRequest)) {
      throw new BusinessRuleError(`Minimum ${leaveType.minDaysPerRequest} day(s) required`);
    }
    if (leaveType.maxDaysPerRequest && days > Number(leaveType.maxDaysPerRequest)) {
      throw new BusinessRuleError(`Maximum ${leaveType.maxDaysPerRequest} day(s) per request`);
    }
    if (leaveType.minDaysNotice > 0) {
      const noticeMs = input.startDate.getTime() - Date.now();
      const noticeDays = noticeMs / 86400000;
      if (noticeDays < leaveType.minDaysNotice) {
        throw new BusinessRuleError(`Minimum ${leaveType.minDaysNotice} day(s) notice required`);
      }
    }
  }

  private toListItem(
    r: Prisma.LeaveGetPayload<{
      include: {
        employee: { select: { employeeCode: true; firstName: true; lastName: true } };
        leaveType: { select: { code: true; name: true } };
      };
    }>,
  ): LeaveListItem {
    return {
      id: r.id,
      employeeId: r.employeeId,
      employeeName: [r.employee.firstName, r.employee.lastName].filter(Boolean).join(" "),
      employeeCode: r.employee.employeeCode,
      leaveTypeCode: r.leaveType.code,
      leaveTypeName: r.leaveType.name,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      totalDays: Number(r.totalDays),
      halfDayType: r.halfDayType,
      status: r.status,
      version: r.version,
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createLeaveService(companyId: string) {
  return new LeaveService(companyId);
}
