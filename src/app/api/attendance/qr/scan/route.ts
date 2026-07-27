import { getQrAttendanceServices } from "@/modules/attendance/qr/application/qr-scan.service";
import { getQrActorMeta, recordQrAudit } from "@/modules/attendance/qr/application/qr-audit.service";
import { apiError, apiSuccess, getRequestMeta, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { scanQrSchema } from "@/modules/attendance/qr/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.QR.SCAN.CREATE);
    const body = await request.json();
    const parsed = scanQrSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 422, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const meta = getRequestMeta(request);
    const actorMeta = await getQrActorMeta();
    const result = await getQrAttendanceServices(auth.companyId).scan.scan(parsed.data, {
      actorUserId: auth.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    if (result.success) {
      await recordQrAudit("qr_scanned", {
        companyId: auth.companyId,
        actorUserId: auth.userId,
        entityId: result.attendanceLogId,
        ...actorMeta,
        metadata: { punchType: parsed.data.punchType, result: result.result },
      });
    } else {
      await recordQrAudit(
        ["replay_detected", "fraud_suspected", "invalid_signature", "clock_tampering"].includes(result.result)
          ? "qr_fraud_attempt"
          : "qr_invalid_scan",
        {
          companyId: auth.companyId,
          actorUserId: auth.userId,
          ...actorMeta,
          metadata: { result: result.result, message: result.message },
        },
      );
    }

    return apiSuccess(result, result.message, result.success ? 201 : 400);
  } catch (error) {
    return handleApiError(error);
  }
}
