import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createAttendanceService } from "@/modules/attendance/application/attendance.service";
import { locationValidationService } from "@/modules/attendance/gps/application/location-validation.service";
import { createQRCodePolicyService } from "@/modules/attendance/qr/application/qr-code-policy.service";
import { createQRGeneratorService } from "@/modules/attendance/qr/application/qr-generator.service";
import { createQrReportService } from "@/modules/attendance/qr/application/qr-report.service";
import { qrCodeSecurityService } from "@/modules/attendance/qr/application/qr-code-security.service";
import { qrValidationService } from "@/modules/attendance/qr/application/qr-validation.service";
import type { QrScanResultData } from "@/modules/attendance/qr/domain/types";
import type { ScanQrInput, ValidateQrInput } from "@/modules/attendance/qr/validation/schemas";
import { NotFoundError } from "@/shared/errors";

type ScanContext = {
  actorUserId: string;
  ipAddress?: string;
  userAgent?: string;
};

export class QRScanService extends BaseRepository {
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

  async validate(input: ValidateQrInput, context: ScanContext): Promise<QrScanResultData> {
    const companyId = this.requireCompanyId();
    const emp = await this.resolveEmployee(context.actorUserId, input.employeeId);
    const result = await qrValidationService.validateToken(input, {
      companyId,
      employeeId: emp.id,
      clientTimestamp: input.clientTimestamp,
    });
    if (!result.success) {
      await this.logFailedScan(
        companyId,
        { token: input.token, punchType: "in", employeeId: emp.id, clientTimestamp: input.clientTimestamp },
        emp.id,
        result,
        context,
      );
    }
    return result;
  }

  async scan(input: ScanQrInput, context: ScanContext): Promise<QrScanResultData> {
    const companyId = this.requireCompanyId();
    const emp = await this.resolveEmployee(context.actorUserId, input.employeeId);
    const validation = await qrValidationService.validateToken(
      { token: input.token, employeeId: emp.id, clientTimestamp: input.clientTimestamp },
      { companyId, employeeId: emp.id, clientTimestamp: input.clientTimestamp },
    );

    if (!validation.success) {
      await qrValidationService.logValidationSteps({
        companyId,
        employeeId: emp.id,
        steps: validation.steps,
      });
      await this.logFailedScan(companyId, input, emp.id, validation, context);
      return validation;
    }

    let payload;
    try {
      payload = qrCodeSecurityService.openToken(input.token);
    } catch {
      return validation;
    }

    const policy = await createQRCodePolicyService(companyId).getDefault(payload.bid);

    if (policy.validationMode === "qr_and_gps") {
      if (!input.coordinates) {
        const fail: QrScanResultData = {
          success: false,
          result: "policy_violation",
          message: "GPS coordinates required for this QR policy",
          steps: [...validation.steps, { step: "verify_gps", passed: false }],
        };
        await this.logFailedScan(companyId, input, emp.id, fail, context);
        return fail;
      }
      const gpsValidation = await locationValidationService.validate({
        companyId,
        branchId: emp.branchId,
        latitude: input.coordinates.latitude,
        longitude: input.coordinates.longitude,
        accuracy: input.coordinates.accuracy,
        permissionState: "granted",
      });
      if (!gpsValidation.isValid) {
        const fail: QrScanResultData = {
          success: false,
          result: "policy_violation",
          message: gpsValidation.rejectionReason ?? "GPS validation failed",
          steps: [...validation.steps, { step: "verify_gps", passed: false, details: gpsValidation.rejectionReason }],
        };
        await this.logFailedScan(companyId, input, emp.id, fail, context);
        return fail;
      }
      validation.steps.push({ step: "verify_gps", passed: true });
    }

    const scannedAt = input.clientTimestamp ?? new Date();
    const attendanceService = createAttendanceService(companyId);
    const attendance = await attendanceService.punch(
      {
        employeeId: emp.id,
        punchType: input.punchType,
        method: "qr",
        timestamp: scannedAt,
        location: input.coordinates
          ? { latitude: input.coordinates.latitude, longitude: input.coordinates.longitude }
          : undefined,
        deviceInfo: {
          ...(input.deviceInfo ?? {}),
          terminalId: input.terminalId,
          ipAddress: context.ipAddress,
        },
      },
      context.actorUserId,
    );

    const attendanceLog = await prisma.attendanceLog.findFirst({
      where: { attendanceId: attendance.id, employeeId: emp.id },
      orderBy: { punchedAt: "desc" },
    });

    const scanLog = await prisma.qrScanLog.create({
      data: {
        companyId,
        qrCodeId: payload.qid,
        employeeId: emp.id,
        attendanceLogId: attendanceLog?.id ?? null,
        punchType: input.punchType,
        scannedAt,
        result: "success",
        nonceHash: qrCodeSecurityService.hashNonce(payload.nonce),
        deviceInfo: (input.deviceInfo ?? null) as object,
        ipAddress: context.ipAddress,
      },
    });

    await prisma.qrAttendance.create({
      data: {
        companyId,
        employeeId: emp.id,
        attendanceId: attendance.id,
        qrCodeId: payload.qid,
        scanLogId: scanLog.id,
        qrTokenHash: qrCodeSecurityService.hashToken(input.token),
        scannedAt,
        terminalId: input.terminalId ?? null,
      },
    });

    if (policy.singleUse) {
      await prisma.qrCode.update({
        where: { id: payload.qid },
        data: { status: "used" },
      });
    }

    await qrValidationService.logValidationSteps({
      companyId,
      qrCodeId: payload.qid,
      employeeId: emp.id,
      scanLogId: scanLog.id,
      steps: validation.steps,
    });

    return {
      success: true,
      result: "success",
      message: `${input.punchType === "in" ? "Check-in" : "Check-out"} recorded via QR`,
      steps: validation.steps,
      attendanceLogId: attendanceLog?.id,
      punchType: input.punchType,
    };
  }

  private async logFailedScan(
    companyId: string,
    input: ScanQrInput,
    employeeId: string,
    result: QrScanResultData,
    context: ScanContext,
  ) {
    if (result.success) return;
    let nonceHash: string | null = null;
    let qrCodeId: string | null = null;
    try {
      const payload = qrCodeSecurityService.openToken(input.token);
      nonceHash = qrCodeSecurityService.hashNonce(payload.nonce);
      qrCodeId = payload.qid;
    } catch {
      // ignore
    }

    await prisma.qrScanLog.create({
      data: {
        companyId,
        qrCodeId,
        employeeId,
        punchType: input.punchType,
        scannedAt: input.clientTimestamp ?? new Date(),
        result: result.result as Prisma.QrScanLogCreateInput["result"],
        failureReason: result.message,
        nonceHash,
        deviceInfo: (input.deviceInfo ?? null) as object,
        ipAddress: context.ipAddress,
        riskScore: ["replay_detected", "fraud_suspected", "invalid_signature", "clock_tampering"].includes(result.result)
          ? 50
          : 0,
      },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createQRScanService(companyId: string) {
  return new QRScanService(companyId);
}

export function getQrAttendanceServices(companyId: string) {
  return {
    generator: createQRGeneratorService(companyId),
    policy: createQRCodePolicyService(companyId),
    scan: createQRScanService(companyId),
    report: createQrReportService(companyId),
  };
}
