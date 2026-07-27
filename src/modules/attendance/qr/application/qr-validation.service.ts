import { prisma } from "@/infrastructure/database/prisma-client";
import { createQRCodePolicyService } from "@/modules/attendance/qr/application/qr-code-policy.service";
import { qrCodeSecurityService } from "@/modules/attendance/qr/application/qr-code-security.service";
import type { QrPayload, QrScanResultData, QrValidationStep } from "@/modules/attendance/qr/domain/types";
import type { ValidateQrInput } from "@/modules/attendance/qr/validation/schemas";

type ValidationContext = {
  companyId: string;
  employeeId?: string;
  clientTimestamp?: Date;
};

export class QRValidationService {
  async validateToken(input: ValidateQrInput, context: ValidationContext): Promise<QrScanResultData> {
    const steps: QrValidationStep[] = [];
    let payload: QrPayload;

    try {
      payload = qrCodeSecurityService.openToken(input.token);
      steps.push({ step: "decrypt", passed: true });
      steps.push({ step: "verify_signature", passed: true });
    } catch (error) {
      steps.push({
        step: "decrypt",
        passed: false,
        details: error instanceof Error ? error.message : "Invalid payload",
      });
      return this.fail("invalid_payload", "Invalid QR code", steps);
    }

    if (payload.cid !== context.companyId) {
      steps.push({ step: "verify_company", passed: false, details: "Company mismatch" });
      return this.fail("invalid_payload", "Invalid QR code", steps);
    }
    steps.push({ step: "verify_company", passed: true });

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSec) {
      steps.push({ step: "verify_expiry", passed: false, details: "QR expired" });
      await this.markExpired(payload.qid);
      return this.fail("expired", "QR code has expired", steps);
    }
    steps.push({ step: "verify_expiry", passed: true });

    if (context.clientTimestamp) {
      const drift = Math.abs(context.clientTimestamp.getTime() - Date.now());
      if (drift > 5 * 60 * 1000) {
        steps.push({ step: "verify_clock", passed: false, details: "Client clock drift detected" });
        return this.fail("clock_tampering", "Device clock appears incorrect", steps);
      }
      steps.push({ step: "verify_clock", passed: true });
    }

    const qrCode = await prisma.qrCode.findFirst({
      where: { id: payload.qid, companyId: context.companyId },
    });
    if (!qrCode) {
      steps.push({ step: "verify_qr_record", passed: false });
      return this.fail("invalid_payload", "QR code not found", steps);
    }

    if (qrCode.status === "revoked") {
      steps.push({ step: "verify_status", passed: false, details: "Revoked" });
      return this.fail("revoked", "QR code has been revoked", steps);
    }
    if (qrCode.status === "used") {
      steps.push({ step: "verify_replay", passed: false, details: "Already used" });
      return this.fail("replay_detected", "QR code already used", steps);
    }

    const nonceHash = qrCodeSecurityService.hashNonce(payload.nonce);
    if (nonceHash !== qrCode.nonceHash) {
      steps.push({ step: "verify_nonce", passed: false });
      return this.fail("invalid_signature", "QR tampering detected", steps);
    }
    steps.push({ step: "verify_nonce", passed: true });

    const replay = await prisma.qrScanLog.findFirst({
      where: {
        companyId: context.companyId,
        nonceHash,
        result: "success",
      },
    });
    if (replay) {
      steps.push({ step: "verify_replay", passed: false, details: "Nonce reused" });
      return this.fail("replay_detected", "QR replay detected", steps);
    }
    steps.push({ step: "verify_replay", passed: true });

    const policy = await createQRCodePolicyService(context.companyId).getDefault(payload.bid);

    if (context.employeeId) {
      const emp = await prisma.employee.findFirst({
        where: { id: context.employeeId, companyId: context.companyId, deletedAt: null },
      });
      if (!emp) {
        steps.push({ step: "verify_employee", passed: false });
        return this.fail("policy_violation", "Employee not found", steps);
      }

      if (policy.requireBranchMatch && payload.bid && emp.branchId !== payload.bid) {
        steps.push({ step: "verify_branch", passed: false, details: "Branch mismatch" });
        return this.fail("wrong_branch", "QR not valid for your branch", steps);
      }
      steps.push({ step: "verify_branch", passed: true });

      if (policy.requireDepartmentMatch && payload.did && emp.departmentId !== payload.did) {
        steps.push({ step: "verify_department", passed: false });
        return this.fail("wrong_department", "QR not valid for your department", steps);
      }
      steps.push({ step: "verify_department", passed: true });

      if (policy.requireShiftMatch && payload.sid) {
        const today = new Date();
        const assignment = await prisma.shiftAssignment.findFirst({
          where: {
            employeeId: emp.id,
            shiftId: payload.sid,
            effectiveFrom: { lte: today },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
          },
        });
        if (!assignment) {
          steps.push({ step: "verify_shift", passed: false });
          return this.fail("wrong_shift", "QR not valid for your shift", steps);
        }
      }
      steps.push({ step: "verify_shift", passed: true });
    }

    return {
      success: true,
      result: "success",
      message: "QR validated successfully",
      steps,
    };
  }

  private fail(result: string, message: string, steps: QrValidationStep[]): QrScanResultData {
    return { success: false, result, message, steps };
  }

  private async markExpired(qrCodeId: string) {
    await prisma.qrCode.updateMany({
      where: { id: qrCodeId, status: "active" },
      data: { status: "expired" },
    });
  }

  async logValidationSteps(params: {
    companyId: string;
    qrCodeId?: string;
    employeeId?: string;
    scanLogId?: string;
    steps: QrValidationStep[];
  }) {
    if (params.steps.length === 0) return;
    await prisma.qrValidationLog.createMany({
      data: params.steps.map((s) => ({
        companyId: params.companyId,
        qrCodeId: params.qrCodeId ?? null,
        employeeId: params.employeeId ?? null,
        scanLogId: params.scanLogId ?? null,
        step: s.step,
        passed: s.passed,
        details: s.details ?? null,
      })),
    });
  }
}

export const qrValidationService = new QRValidationService();
