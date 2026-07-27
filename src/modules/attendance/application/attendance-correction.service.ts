import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createAttendanceApprovalService } from "@/modules/attendance/application/attendance-approval.service";
import type { AttendanceCorrectionItem } from "@/modules/attendance/domain/types";
import type { CorrectionRequestInput } from "@/modules/attendance/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class AttendanceCorrectionService extends BaseRepository {
  async list(employeeId?: string): Promise<AttendanceCorrectionItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.attendanceCorrection.findMany({
      where: { companyId, deletedAt: null, ...(employeeId ? { employeeId } : {}) },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: [r.employee.firstName, r.employee.lastName].filter(Boolean).join(" "),
      attendanceDate: r.attendanceDate.toISOString().slice(0, 10),
      correctionType: r.correctionType,
      reason: r.reason,
      status: r.status,
      version: r.version,
    }));
  }

  async request(input: CorrectionRequestInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    const row = await prisma.attendanceCorrection.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        attendanceId: input.attendanceId ?? null,
        attendanceDate: input.attendanceDate,
        correctionType: input.correctionType,
        requestedCheckIn: input.requestedCheckIn ?? null,
        requestedCheckOut: input.requestedCheckOut ?? null,
        reason: input.reason,
        status: "submitted",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await createAttendanceApprovalService(companyId).initCorrectionWorkflow(row.id, actorUserId);
    return row;
  }

  async applyApproved(correctionId: string, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const correction = await prisma.attendanceCorrection.findFirst({
      where: { id: correctionId, companyId, status: "hr_approved" },
    });
    if (!correction) throw new NotFoundError("Attendance correction", correctionId);

    const day = correction.attendanceDate;
    const attendance = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: correction.employeeId, date: day } },
      create: {
        companyId,
        employeeId: correction.employeeId,
        date: day,
        checkInAt: correction.requestedCheckIn,
        checkOutAt: correction.requestedCheckOut,
        isRegularized: true,
        approvalStatus: "approved",
        status: "present",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: {
        checkInAt: correction.requestedCheckIn ?? undefined,
        checkOutAt: correction.requestedCheckOut ?? undefined,
        isRegularized: true,
        approvalStatus: "approved",
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    return attendance;
  }

  private async assertEmployee(employeeId: string, companyId: string) {
    const emp = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
    if (!emp) throw new NotFoundError("Employee", employeeId);
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createAttendanceCorrectionService(companyId: string) {
  return new AttendanceCorrectionService(companyId);
}
