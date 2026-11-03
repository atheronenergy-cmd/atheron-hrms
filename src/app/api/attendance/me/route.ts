import { z } from "zod";

import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma-client";
import { getGpsAttendanceServices } from "@/modules/attendance/gps/application/gps-attendance.service";
import { getGpsActorMeta, recordGpsAudit } from "@/modules/attendance/gps/application/gps-audit.service";
import { apiError, apiSuccess, getRequestMeta } from "@/modules/attendance/gps/server/api-utils";
import { LIVE_SHARE_WINDOW_MS } from "@/modules/attendance/gps/domain/types";
import { gpsCoordinatesSchema, gpsDeviceInfoSchema, locationPermissionStateSchema } from "@/modules/attendance/gps/validation/schemas";
import { handleApiError } from "@/shared/errors";

const selfAttendanceSchema = z.object({
  action: z.enum(["in", "out", "ping"]),
  coordinates: gpsCoordinatesSchema,
  permissionState: locationPermissionStateSchema.default("granted"),
  deviceInfo: gpsDeviceInfoSchema.optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return apiError("Authentication required", 401);
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, companyId: session.user.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) return apiSuccess({ checkedIn: false });

    const since = new Date(Date.now() - LIVE_SHARE_WINDOW_MS);
    const latest = await prisma.attendanceLog.findFirst({
      where: {
        companyId: session.user.companyId,
        employeeId: employee.id,
        punchType: { in: ["in", "out"] },
        punchedAt: { gte: since },
      },
      orderBy: { punchedAt: "desc" },
      select: { punchType: true },
    });

    return apiSuccess({ checkedIn: latest?.punchType === "in" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return apiError("Authentication required", 401);
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, companyId: session.user.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) {
      return apiError("Your login is not linked to an employee record.", 403);
    }

    const parsed = selfAttendanceSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("Validation failed", 422);

    const meta = getRequestMeta(request);
    const actorMeta = await getGpsActorMeta();
    const context = { actorUserId: session.user.id, ipAddress: meta.ipAddress, userAgent: meta.userAgent };
    const gps = getGpsAttendanceServices(session.user.companyId).gps;
    const input = {
      employeeId: employee.id,
      coordinates: parsed.data.coordinates,
      permissionState: parsed.data.permissionState,
      deviceInfo: parsed.data.deviceInfo,
      overrideValidation: false,
    };

    if (parsed.data.action === "ping") {
      await gps.fieldDuty({ ...input, action: "punch", activityType: "location_punch" }, context, false);
      return apiSuccess({ sharing: true }, "Location updated.");
    }

    const action = parsed.data.action === "in" ? "start" : "end";
    const activityType = parsed.data.action === "in" ? "remote_work" : "duty_end";
    const result = await gps.fieldDuty({ ...input, action, activityType }, context, false);

    await recordGpsAudit("gps_attendance_created", {
      companyId: session.user.companyId,
      employeeId: employee.id,
      actorUserId: session.user.id,
      entityId: "attendance" in result ? result.attendance.id : undefined,
      ...actorMeta,
      metadata: { action: parsed.data.action, selfService: true },
    });

    return apiSuccess(
      { attendanceId: "attendance" in result ? result.attendance.id : null },
      parsed.data.action === "in" ? "Attendance marked. Your location is now shared." : "Checked out. Location sharing stopped.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
