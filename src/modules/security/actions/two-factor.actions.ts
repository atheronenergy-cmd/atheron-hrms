"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { securityNotificationService } from "@/modules/security/application/security-notification.service";
import { twoFactorService } from "@/modules/security/application/two-factor.service";
import {
  regenerateBackupCodesSchema,
  twoFactorDisableSchema,
  twoFactorSetupSchema,
} from "@/modules/security/validation/schemas";

export type TwoFactorActionResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
};

export async function startTwoFactorSetupAction(): Promise<
  TwoFactorActionResult<{ qrCodeDataUrl: string; secret: string }>
> {
  const user = await requireAuth();
  const setup = await twoFactorService.generateSetup(user.id, user.email);
  return {
    success: true,
    message: "Scan the QR code with your authenticator app.",
    data: { qrCodeDataUrl: setup.qrCodeDataUrl, secret: setup.secret },
  };
}

export async function enableTwoFactorAction(
  token: string,
): Promise<TwoFactorActionResult<{ backupCodes: string[] }>> {
  const user = await requireAuth();
  const parsed = twoFactorSetupSchema.safeParse({ token });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid code" };
  }

  try {
    const { backupCodes } = await twoFactorService.enableTwoFactor(user.id, token);
    await securityNotificationService.notify({
      userId: user.id,
      companyId: user.companyId,
      eventType: "two_factor_enabled",
      severity: "info",
    });
    revalidatePath("/dashboard/settings/two-factor");
    return {
      success: true,
      message: "Two-factor authentication enabled.",
      data: { backupCodes },
    };
  } catch {
    return { success: false, message: "Invalid verification code." };
  }
}

export async function disableTwoFactorAction(token: string): Promise<TwoFactorActionResult> {
  const user = await requireAuth();
  const parsed = twoFactorDisableSchema.safeParse({ token });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid code" };
  }

  try {
    await twoFactorService.disableTwoFactor(user.id, token);
    await securityNotificationService.notify({
      userId: user.id,
      companyId: user.companyId,
      eventType: "two_factor_disabled",
      severity: "warning",
    });
    revalidatePath("/dashboard/settings/two-factor");
    return { success: true, message: "Two-factor authentication disabled." };
  } catch {
    return { success: false, message: "Invalid verification code." };
  }
}

export async function regenerateBackupCodesAction(
  token: string,
): Promise<TwoFactorActionResult<{ backupCodes: string[] }>> {
  const user = await requireAuth();
  const parsed = regenerateBackupCodesSchema.safeParse({ token });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid code" };
  }

  try {
    const backupCodes = await twoFactorService.regenerateBackupCodes(user.id, token);
    revalidatePath("/dashboard/settings/two-factor");
    return {
      success: true,
      message: "Backup codes regenerated.",
      data: { backupCodes },
    };
  } catch {
    return { success: false, message: "Invalid verification code." };
  }
}
