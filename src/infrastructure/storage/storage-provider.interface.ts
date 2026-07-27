export type UploadOptions = {
  contentType?: string;
  metadata?: Record<string, string>;
};

export type StorageResult = {
  key: string;
  url?: string;
  size: number;
};

export interface StorageProvider {
  upload(key: string, data: Buffer, options?: UploadOptions): Promise<StorageResult>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
