import type { FileCategory } from "@prisma/client";

/** User-uploaded files — store in cloud (R2) when configured. */
export const CLOUD_STORAGE_CATEGORIES: FileCategory[] = [
  "employee_photo",
  "document",
  "company_logo",
  "attendance_capture",
];

/** Generated exports/downloads — always stored locally and safe to purge quarterly. */
export const LOCAL_EXPORT_CATEGORIES: FileCategory[] = ["report", "payslip", "certificate"];

export type StorageTier = "cloud" | "local";

export function getStorageTier(category: FileCategory): StorageTier {
  if (CLOUD_STORAGE_CATEGORIES.includes(category)) return "cloud";
  return "local";
}

export function isCloudStorageConfigured(): boolean {
  return Boolean(
    process.env.STORAGE_R2_ACCOUNT_ID?.trim() &&
      process.env.STORAGE_R2_ACCESS_KEY?.trim() &&
      process.env.STORAGE_R2_SECRET_KEY?.trim() &&
      process.env.STORAGE_R2_BUCKET?.trim(),
  );
}
