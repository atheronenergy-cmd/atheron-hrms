import { getQrAttendanceServices } from "@/modules/attendance/qr/application/qr-scan.service";
import { getQrActorMeta, recordQrAudit } from "@/modules/attendance/qr/application/qr-audit.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { validateQrSchema } from "@/modules/attendance/qr/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.QR.SCAN.CREATE);
    const body = await request.json();
    const parsed = validateQrSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 422, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const result = await getQrAttendanceServices(auth.companyId).scan.validate(parsed.data, {
      actorUserId: auth.userId,
    });

    if (!result.success) {
      const actorMeta = await getQrActorMeta();
      await recordQrAudit(
        ["replay_detected", "fraud_suspected", "invalid_signature"].includes(result.result)
          ? "qr_fraud_attempt"
          : "qr_invalid_scan",
        {
          companyId: auth.companyId,
          actorUserId: auth.userId,
          employeeId: parsed.data.employeeId,
          ...actorMeta,
          metadata: { result: result.result, message: result.message },
        },
      );
    }

    return apiSuccess(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
