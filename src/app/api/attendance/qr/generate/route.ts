import { getQrAttendanceServices } from "@/modules/attendance/qr/application/qr-scan.service";
import { getQrActorMeta, recordQrAudit } from "@/modules/attendance/qr/application/qr-audit.service";
import { apiError, apiSuccess, getRequestMeta, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { generateQrSchema } from "@/modules/attendance/qr/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.QR.CODE.CREATE);
    const body = await request.json();
    const parsed = generateQrSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 422, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const meta = getRequestMeta(request);
    const actorMeta = await getQrActorMeta();
    const result = await getQrAttendanceServices(auth.companyId).generator.generate(parsed.data, auth.userId);

    await recordQrAudit("qr_generated", {
      companyId: auth.companyId,
      actorUserId: auth.userId,
      entityId: result.qrCode.id,
      ...actorMeta,
      metadata: { codeType: parsed.data.codeType, expirySeconds: parsed.data.expirySeconds },
    });

    return apiSuccess(result, "QR code generated.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.QR.CODE.REVOKE);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return apiError("QR code id required", 400);

    await getQrAttendanceServices(auth.companyId).generator.revoke(id, auth.userId);
    const actorMeta = await getQrActorMeta();
    await recordQrAudit("qr_revoked", {
      companyId: auth.companyId,
      actorUserId: auth.userId,
      entityId: id,
      ...actorMeta,
    });

    return apiSuccess({ id }, "QR code revoked.");
  } catch (error) {
    return handleApiError(error);
  }
}
