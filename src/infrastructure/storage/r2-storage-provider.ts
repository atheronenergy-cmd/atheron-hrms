import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { StorageProvider, StorageResult, UploadOptions } from "./storage-provider.interface";

function getR2Client() {
  const accountId = process.env.STORAGE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.STORAGE_R2_ACCESS_KEY;
  const secretAccessKey = process.env.STORAGE_R2_SECRET_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 credentials are not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(bucket = process.env.STORAGE_R2_BUCKET) {
    if (!bucket) throw new Error("STORAGE_R2_BUCKET is required");
    this.client = getR2Client();
    this.bucket = bucket;
  }

  async upload(key: string, data: Buffer, options?: UploadOptions): Promise<StorageResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
      }),
    );
    return { key, size: data.length };
  }

  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const body = response.Body;
    if (!body) throw new Error(`R2 object not found: ${key}`);
    return Buffer.from(await body.transformToByteArray());
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}

export function createR2StorageProvider(): StorageProvider {
  return new R2StorageProvider();
}
