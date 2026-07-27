import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { DEFAULT_ATTENDANCE_RULE, type AttendanceRuleItem } from "@/modules/attendance/domain/types";
import type { AttendanceRuleInput } from "@/modules/attendance/validation/schemas";
import { NotFoundError } from "@/shared/errors";

export class AttendanceRuleService extends BaseRepository {
  async list(): Promise<AttendanceRuleItem[]> {
    const companyId = this.requireCompanyId();
    const rows = await prisma.attendanceRule.findMany({
      where: { companyId, status: "active" },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return rows.map((r) => this.toItem(r));
  }

  async getDefault(): Promise<AttendanceRuleItem> {
    const companyId = this.requireCompanyId();
    const row = await prisma.attendanceRule.findFirst({
      where: { companyId, status: "active", isDefault: true },
    });
    if (!row) {
      return {
        id: "default",
        name: "Default Rule",
        ...DEFAULT_ATTENDANCE_RULE,
        isDefault: true,
        version: 1,
      };
    }
    return this.toItem(row);
  }

  async create(input: AttendanceRuleInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    if (input.isDefault) {
      await prisma.attendanceRule.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return prisma.attendanceRule.create({
      data: {
        companyId,
        branchId: input.branchId ?? null,
        name: input.name,
        gracePeriodMinutes: input.gracePeriodMinutes,
        lateLimitMinutes: input.lateLimitMinutes,
        halfDayThresholdMinutes: input.halfDayThresholdMinutes,
        overtimeStartMinutes: input.overtimeStartMinutes,
        minimumWorkMinutes: input.minimumWorkMinutes,
        earlyLeavingGraceMinutes: input.earlyLeavingGraceMinutes,
        isDefault: input.isDefault,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  async update(id: string, version: number, input: Partial<AttendanceRuleInput>, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.attendanceRule.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundError("Attendance rule", id);

    if (input.isDefault) {
      await prisma.attendanceRule.updateMany({
        where: { companyId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return prisma.attendanceRule.update({
      where: { id, version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.branchId !== undefined ? { branchId: input.branchId ?? null } : {}),
        ...(input.gracePeriodMinutes !== undefined ? { gracePeriodMinutes: input.gracePeriodMinutes } : {}),
        ...(input.lateLimitMinutes !== undefined ? { lateLimitMinutes: input.lateLimitMinutes } : {}),
        ...(input.halfDayThresholdMinutes !== undefined ? { halfDayThresholdMinutes: input.halfDayThresholdMinutes } : {}),
        ...(input.overtimeStartMinutes !== undefined ? { overtimeStartMinutes: input.overtimeStartMinutes } : {}),
        ...(input.minimumWorkMinutes !== undefined ? { minimumWorkMinutes: input.minimumWorkMinutes } : {}),
        ...(input.earlyLeavingGraceMinutes !== undefined ? { earlyLeavingGraceMinutes: input.earlyLeavingGraceMinutes } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  private toItem(r: {
    id: string;
    name: string;
    gracePeriodMinutes: number;
    lateLimitMinutes: number;
    halfDayThresholdMinutes: number;
    overtimeStartMinutes: number;
    minimumWorkMinutes: number;
    earlyLeavingGraceMinutes: number;
    isDefault: boolean;
    version: number;
  }): AttendanceRuleItem {
    return {
      id: r.id,
      name: r.name,
      gracePeriodMinutes: r.gracePeriodMinutes,
      lateLimitMinutes: r.lateLimitMinutes,
      halfDayThresholdMinutes: r.halfDayThresholdMinutes,
      overtimeStartMinutes: r.overtimeStartMinutes,
      minimumWorkMinutes: r.minimumWorkMinutes,
      earlyLeavingGraceMinutes: r.earlyLeavingGraceMinutes,
      isDefault: r.isDefault,
      version: r.version,
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createAttendanceRuleService(companyId: string) {
  return new AttendanceRuleService(companyId);
}
