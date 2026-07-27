import type { AttendanceStatus } from "@prisma/client";

import { DEFAULT_ATTENDANCE_RULE } from "@/modules/attendance/domain/types";
import type { AttendanceRuleItem } from "@/modules/attendance/domain/types";

export type ShiftWindow = {
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number;
  isOvernight: boolean;
};

export type CalculationInput = {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  breakMinutes: number;
  shift: ShiftWindow | null;
  rule: AttendanceRuleItem | typeof DEFAULT_ATTENDANCE_RULE;
};

export type CalculationResult = {
  totalWorkMinutes: number;
  effectiveWorkMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  earlyLeavingMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
};

export class AttendanceCalculationService {
  calculate(input: CalculationInput): CalculationResult {
    const breakMinutes = input.breakMinutes;
    let totalWorkMinutes = 0;
    let lateMinutes = 0;
    let earlyLeavingMinutes = 0;
    let overtimeMinutes = 0;

    if (input.checkInAt && input.checkOutAt) {
      totalWorkMinutes = Math.max(0, Math.round((input.checkOutAt.getTime() - input.checkInAt.getTime()) / 60000) - breakMinutes);
    }

    if (input.shift && input.checkInAt) {
      const checkInMinutes = this.toMinutesOfDay(input.checkInAt);
      lateMinutes = Math.max(0, checkInMinutes - input.shift.startMinutes - input.rule.gracePeriodMinutes);
    }

    if (input.shift && input.checkOutAt) {
      const checkOutMinutes = this.toMinutesOfDay(input.checkOutAt);
      earlyLeavingMinutes = Math.max(0, input.shift.endMinutes - input.rule.earlyLeavingGraceMinutes - checkOutMinutes);
    }

    if (input.shift) {
      const shiftDuration = this.shiftDuration(input.shift) - input.shift.breakMinutes;
      const overtimeThreshold = shiftDuration + input.rule.overtimeStartMinutes;
      overtimeMinutes = Math.max(0, totalWorkMinutes - overtimeThreshold);
    }

    const effectiveWorkMinutes = Math.max(0, totalWorkMinutes);
    const status = this.resolveStatus({
      checkInAt: input.checkInAt,
      checkOutAt: input.checkOutAt,
      effectiveWorkMinutes,
      lateMinutes,
      earlyLeavingMinutes,
      overtimeMinutes,
      rule: input.rule,
    });

    return {
      totalWorkMinutes,
      effectiveWorkMinutes,
      breakMinutes,
      lateMinutes,
      earlyLeavingMinutes,
      overtimeMinutes,
      status,
    };
  }

  shiftFromTimes(startTime: Date, endTime: Date, breakDurationMinutes: number, isOvernight: boolean): ShiftWindow {
    return {
      startMinutes: this.toMinutesOfDay(startTime),
      endMinutes: this.toMinutesOfDay(endTime),
      breakMinutes: breakDurationMinutes,
      isOvernight,
    };
  }

  formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  private resolveStatus(params: {
    checkInAt: Date | null;
    checkOutAt: Date | null;
    effectiveWorkMinutes: number;
    lateMinutes: number;
    earlyLeavingMinutes: number;
    overtimeMinutes: number;
    rule: AttendanceRuleItem | typeof DEFAULT_ATTENDANCE_RULE;
  }): AttendanceStatus {
    if (!params.checkInAt && !params.checkOutAt) return "absent";
    if (params.overtimeMinutes > 0 && params.effectiveWorkMinutes >= params.rule.minimumWorkMinutes) return "overtime";
    if (params.effectiveWorkMinutes > 0 && params.effectiveWorkMinutes < params.rule.halfDayThresholdMinutes) return "half_day";
    if (params.lateMinutes > params.rule.lateLimitMinutes) return "late";
    if (params.earlyLeavingMinutes > 0) return "early_leaving";
    return "present";
  }

  private toMinutesOfDay(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }

  private shiftDuration(shift: ShiftWindow): number {
    if (shift.isOvernight && shift.endMinutes <= shift.startMinutes) {
      return 24 * 60 - shift.startMinutes + shift.endMinutes;
    }
    return Math.max(0, shift.endMinutes - shift.startMinutes);
  }
}

export const attendanceCalculationService = new AttendanceCalculationService();
