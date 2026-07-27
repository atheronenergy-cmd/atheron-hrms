import { access,mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

import { getProviderForCategory } from "@/infrastructure/storage/storage-router";
import type { StorageProvider, StorageResult, UploadOptions } from "./storage-provider.interface";

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
  }

  private resolveKey(key: string): string {
    return path.join(this.basePath, key);
  }

  async upload(key: string, data: Buffer, _options?: UploadOptions): Promise<StorageResult> {
    const filePath = this.resolveKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return { key, size: data.length };
  }

  async download(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }

  async getSignedUrl(key: string): Promise<string> {
    return `/api/storage/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolveKey(key));
    } catch {
      // File may not exist
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }
}

/** @deprecated Use getProviderForCategory() — kept for backwards compatibility. */
export function createStorageProvider(): StorageProvider {
  return {
    upload: async (key, data, options) => {
      const category = options?.metadata?.category;
      const provider = category
        ? getProviderForCategory(category as never)
        : new LocalStorageProvider(process.env.STORAGE_LOCAL_PATH ?? "./uploads");
      return provider.upload(key, data, options);
    },
    download: async (key) => {
      const provider = new LocalStorageProvider(process.env.STORAGE_LOCAL_PATH ?? "./uploads");
      return provider.download(key);
    },
    getSignedUrl: async (key) => `/api/storage/${encodeURIComponent(key)}`,
    delete: async (key) => {
      const provider = new LocalStorageProvider(process.env.STORAGE_LOCAL_PATH ?? "./uploads");
      return provider.delete(key);
    },
    exists: async (key) => {
      const provider = new LocalStorageProvider(process.env.STORAGE_LOCAL_PATH ?? "./uploads");
      return provider.exists(key);
    },
  };
}

export const storage = createStorageProvider();
