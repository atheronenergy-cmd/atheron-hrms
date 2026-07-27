import type { FileCategory } from "@prisma/client";

import { createR2StorageProvider } from "@/infrastructure/storage/r2-storage-provider";
import { LocalStorageProvider } from "@/infrastructure/storage/storage-provider";
import type { StorageProvider } from "@/infrastructure/storage/storage-provider.interface";
import {
  getStorageTier,
  isCloudStorageConfigured,
  type StorageTier,
} from "@/shared/constants/storage";
import { env } from "@/shared/config/env";

let cloudProvider: StorageProvider | null = null;
let uploadLocalProvider: StorageProvider | null = null;
let exportLocalProvider: StorageProvider | null = null;

function getCloudProvider(): StorageProvider {
  if (!cloudProvider) cloudProvider = createR2StorageProvider();
  return cloudProvider;
}

function getUploadLocalProvider(): StorageProvider {
  if (!uploadLocalProvider) uploadLocalProvider = new LocalStorageProvider(env.STORAGE_LOCAL_PATH);
  return uploadLocalProvider;
}

function getExportLocalProvider(): StorageProvider {
  const exportPath = process.env.STORAGE_EXPORT_PATH ?? "./exports";
  if (!exportLocalProvider) exportLocalProvider = new LocalStorageProvider(exportPath);
  return exportLocalProvider;
}

export function resolveStorageTier(category: FileCategory, metadata?: Record<string, unknown> | null): StorageTier {
  const fromMetadata = metadata?.storageTier;
  if (fromMetadata === "cloud" || fromMetadata === "local") return fromMetadata;
  return getStorageTier(category);
}

export function getProviderForTier(tier: StorageTier): StorageProvider {
  if (tier === "cloud") {
    if (isCloudStorageConfigured()) return getCloudProvider();
    return getUploadLocalProvider();
  }
  return getExportLocalProvider();
}

export function getProviderForCategory(
  category: FileCategory,
  metadata?: Record<string, unknown> | null,
): StorageProvider {
  return getProviderForTier(resolveStorageTier(category, metadata));
}

export function getStorageTierForCategory(category: FileCategory): StorageTier {
  const tier = getStorageTier(category);
  if (tier === "cloud" && !isCloudStorageConfigured()) return "local";
  return tier;
}
