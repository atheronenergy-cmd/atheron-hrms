import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createAttendanceCorrectionService } from "@/modules/attendance/application/attendance-correction.service";
import { NotFoundError } from "@/shared/errors";

export class AttendanceApprovalService extends BaseRepository {
  async initCorrectionWorkflow(correctionId: string, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await prisma.attendanceApproval.createMany({
      data: [
        { companyId, correctionId, approverRole: "manager", status: "pending" },
        { companyId, correctionId, approverRole: "hr", status: "pending" },
      ],
    });
    return { correctionId, actorUserId };
  }

  async processCorrection(
    correctionId: string,
    version: number,
    action: "manager_approve" | "hr_approve" | "reject",
    actorUserId: string,
    comments?: string,
  ) {
    const companyId = this.requireCompanyId();
    const correction = await prisma.attendanceCorrection.findFirst({
      where: { id: correctionId, companyId, deletedAt: null },
    });
    if (!correction) throw new NotFoundError("Attendance correction", correctionId);

    const role = action === "manager_approve" ? "manager" : action === "hr_approve" ? "hr" : null;

    if (action === "reject") {
      await prisma.attendanceApproval.updateMany({
        where: { correctionId, status: "pending" },
        data: { status: "rejected", approverUserId: actorUserId, comments: comments ?? null, actedAt: new Date() },
      });
      return prisma.attendanceCorrection.update({
        where: { id: correctionId, version },
        data: { status: "rejected", updatedBy: actorUserId, version: { increment: 1 } },
      });
    }

    await prisma.attendanceApproval.updateMany({
      where: { correctionId, approverRole: role!, status: "pending" },
      data: { status: "approved", approverUserId: actorUserId, comments: comments ?? null, actedAt: new Date() },
    });

    const nextStatus = action === "manager_approve" ? "manager_approved" : "hr_approved";
    const updated = await prisma.attendanceCorrection.update({
      where: { id: correctionId, version },
      data: { status: nextStatus, updatedBy: actorUserId, version: { increment: 1 } },
    });

    if (action === "hr_approve") {
      await createAttendanceCorrectionService(companyId).applyApproved(correctionId, actorUserId);
    }

    return updated;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createAttendanceApprovalService(companyId: string) {
  return new AttendanceApprovalService(companyId);
}
