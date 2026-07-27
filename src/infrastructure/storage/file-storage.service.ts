import { createHash } from "crypto";

import type { FileCategory } from "@prisma/client";

import { prisma } from "@/infrastructure/database/prisma-client";
import {
  getProviderForCategory,
  getProviderForTier,
  getStorageTierForCategory,
  resolveStorageTier,
} from "@/infrastructure/storage/storage-router";
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS } from "@/shared/constants/files";
import { ValidationError } from "@/shared/errors";
import { buildStorageKey, isAllowedMimeType } from "@/shared/utils/file.utils";
import { generateId } from "@/shared/utils/id.utils";

export type StoreFileInput = {
  companyId: string;
  category: FileCategory;
  entityId: string;
  originalName: string;
  mimeType: string;
  data: Buffer;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
};

export type StoredFileResult = {
  id: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  storageTier: "cloud" | "local";
};

/**
 * Hybrid storage:
 * - Uploads (documents, photos, logos, attendance) → Cloudflare R2 when configured
 * - Exports/downloads (reports, payslips, certificates) → local disk only
 */
export class FileStorageService {
  validateUpload(category: FileCategory, mimeType: string, sizeBytes: number) {
    const maxSize = FILE_SIZE_LIMITS[category];
    if (sizeBytes > maxSize) {
      throw new ValidationError(`File exceeds maximum size of ${Math.round(maxSize / (1024 * 1024))}MB`);
    }
    if (!isAllowedMimeType(mimeType, ALLOWED_MIME_TYPES[category])) {
      throw new ValidationError(`File type ${mimeType} is not allowed for ${category}`);
    }
  }

  async store(input: StoreFileInput): Promise<StoredFileResult> {
    this.validateUpload(input.category, input.mimeType, input.data.length);

    const storageTier = getStorageTierForCategory(input.category);
    const provider = getProviderForTier(storageTier);

    const ext = input.originalName.includes(".") ? input.originalName.split(".").pop() : "bin";
    const filename = `${generateId()}.${ext}`;
    const storageKey = buildStorageKey(input.companyId, input.category, input.entityId, filename);
    const checksum = createHash("sha256").update(input.data).digest("hex");

    await provider.upload(storageKey, input.data, { contentType: input.mimeType });

    const file = await prisma.file.create({
      data: {
        companyId: input.companyId,
        storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.data.length),
        category: input.category,
        checksum,
        metadata: {
          ...(input.metadata ?? {}),
          storageTier,
        } as object,
        createdBy: input.actorUserId ?? null,
      },
    });

    const url = await provider.getSignedUrl(storageKey);
    return {
      id: file.id,
      storageKey,
      url,
      mimeType: file.mimeType,
      sizeBytes: input.data.length,
      originalName: file.originalName,
      storageTier,
    };
  }

  async getDownloadBuffer(fileId: string, companyId: string): Promise<{ buffer: Buffer; mimeType: string; originalName: string }> {
    const file = await prisma.file.findFirst({
      where: { id: fileId, companyId, deletedAt: null },
    });
    if (!file) throw new ValidationError("File not found");

    const metadata = file.metadata as Record<string, unknown> | null;
    const provider = getProviderForCategory(file.category, metadata);
    const buffer = await provider.download(file.storageKey);
    return { buffer, mimeType: file.mimeType, originalName: file.originalName };
  }

  async getSignedUrl(fileId: string, companyId: string): Promise<string> {
    const file = await prisma.file.findFirst({
      where: { id: fileId, companyId, deletedAt: null },
    });
    if (!file) throw new ValidationError("File not found");

    const metadata = file.metadata as Record<string, unknown> | null;
    const provider = getProviderForCategory(file.category, metadata);
    return provider.getSignedUrl(file.storageKey);
  }

  async softDelete(fileId: string, companyId: string, actorUserId: string) {
    const file = await prisma.file.findFirst({ where: { id: fileId, companyId, deletedAt: null } });
    if (!file) return;

    const metadata = file.metadata as Record<string, unknown> | null;
    const provider = getProviderForCategory(file.category, metadata);
    await provider.delete(file.storageKey).catch(() => undefined);

    await prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date(), deletedBy: actorUserId },
    });
  }
}

export const fileStorageService = new FileStorageService();

export function createFileStorageService() {
  return new FileStorageService();
}
