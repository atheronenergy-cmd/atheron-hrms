"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { deviceService } from "@/modules/security/application/device.service";
import { securityNotificationService } from "@/modules/security/application/security-notification.service";
import { deviceTrustSchema } from "@/modules/security/validation/schemas";

export type DeviceActionResult = {
  success: boolean;
  message: string;
};

export async function setDeviceTrustedAction(
  deviceId: string,
  trusted: boolean,
): Promise<DeviceActionResult> {
  const user = await requireAuth();
  const parsed = deviceTrustSchema.safeParse({ deviceId, trusted });
  if (!parsed.success) {
    return { success: false, message: "Invalid request." };
  }

  const updated = await deviceService.setDeviceTrusted(deviceId, user.id, trusted);
  if (!updated) return { success: false, message: "Device not found." };

  revalidatePath("/dashboard/settings/devices");
  return {
    success: true,
    message: trusted ? "Device marked as trusted." : "Device trust removed.",
  };
}

export async function logoutDeviceAction(deviceId: string): Promise<DeviceActionResult> {
  const user = await requireAuth();
  const count = await deviceService.logoutDevice(deviceId, user.id);
  if (count === 0) return { success: false, message: "No active sessions on this device." };

  await securityNotificationService.notify({
    userId: user.id,
    companyId: user.companyId,
    eventType: "session_revoked",
    deviceId,
    metadata: { sessionsRevoked: count },
  });

  revalidatePath("/dashboard/settings/devices");
  revalidatePath("/dashboard/settings/sessions");
  return { success: true, message: `Signed out ${count} session(s) on this device.` };
}

export async function logoutAllDevicesAction(): Promise<DeviceActionResult> {
  const user = await requireAuth();
  const count = await deviceService.logoutAllDevices(user.id);
  revalidatePath("/dashboard/settings/devices");
  revalidatePath("/dashboard/settings/sessions");
  return { success: true, message: `Signed out ${count} session(s) on other devices.` };
}
