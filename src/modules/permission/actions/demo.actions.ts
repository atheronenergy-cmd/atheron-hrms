"use server";

import { requirePermission } from "@/infrastructure/authorization/server/guards";

/** Example protected server action — future modules follow this pattern. */
export async function demoProtectedAction(): Promise<{ success: boolean; message: string }> {
  await requirePermission("employee.profile.read");
  return { success: true, message: "Authorized access granted." };
}

export async function demoDeniedAction(): Promise<{ success: boolean; message: string }> {
  await requirePermission("role.profile.configure");
  return { success: true, message: "Should not reach here." };
}
