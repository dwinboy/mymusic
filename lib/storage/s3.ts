import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { StorageDriver, StoredFile } from "./types";

/**
 * S3-compatible driver (AWS S3, Cloudflare R2, Backblaze B2, MinIO, ...).
 * Activated by setting STORAGE_DRIVER=s3 and the S3_* env vars — no other
 * code changes required, callers only ever see the StorageDriver interface.
 */
export class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor() {
    const {
      S3_ENDPOINT,
      S3_REGION,
      S3_BUCKET,
      S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY,
      S3_PUBLIC_BASE_URL,
    } = process.env;

    if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      throw new Error(
        "STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY to be set."
      );
    }

    this.bucket = S3_BUCKET;
    this.publicBaseUrl = S3_PUBLIC_BASE_URL || `https://${S3_BUCKET}.s3.amazonaws.com`;
    this.client = new S3Client({
      region: S3_REGION || "auto",
      endpoint: S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async put({
    folder,
    filename,
    contentType,
    data,
  }: {
    folder: string;
    filename: string;
    contentType: string;
    data: Buffer;
  }): Promise<StoredFile> {
    const key = `${folder}/${filename}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        // Same reasoning as r2-client's putObject: these objects are written
        // once per key, so a stored file may be cached for as long as the
        // client likes rather than re-fetched on every play.
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    return {
      url: `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`,
      key,
      size: data.byteLength,
    };
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
