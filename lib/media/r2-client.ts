import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Audio lives in an S3-compatible bucket (Cloudflare R2 in production).
 * R2 speaks the S3 API, so the AWS SDK works against it unmodified — only
 * the endpoint/credentials differ. This same client also targets a local
 * MinIO instance in development (see .env.example), which is how the whole
 * upload/stream/delete path below is exercised without needing a live R2
 * account.
 */

export interface R2Config {
  accountId?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
}

function readConfig(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const explicitEndpoint = process.env.R2_ENDPOINT;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 is not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME " +
        "(and either R2_ACCOUNT_ID or R2_ENDPOINT). See .env.example."
    );
  }

  const endpoint = explicitEndpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
  if (!endpoint) {
    throw new Error("R2 is not configured. Set R2_ACCOUNT_ID or R2_ENDPOINT.");
  }
  if (!publicBaseUrl) {
    throw new Error(
      "R2 is not configured. Set R2_PUBLIC_BASE_URL to the bucket's public/custom domain " +
        "(e.g. a Cloudflare R2 custom domain, or an r2.dev subdomain)."
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint, publicBaseUrl };
}

let cachedClient: { client: S3Client; config: R2Config } | null = null;

function getClient(): { client: S3Client; config: R2Config } {
  if (cachedClient) return cachedClient;

  const config = readConfig();
  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    // R2 (and MinIO) want path-style addressing rather than the
    // virtual-hosted-style AWS uses by default.
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  cachedClient = { client, config };
  return cachedClient;
}

export function isR2Configured(): boolean {
  try {
    readConfig();
    return true;
  } catch {
    return false;
  }
}

export function publicUrlForKey(key: string): string {
  const { config } = getClient();
  return `${config.publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

/** Presigned PUT URL the browser uploads directly to — the file never touches our server. */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 900
): Promise<string> {
  const { client, config } = getClient();
  const command = new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/** Time-limited GET URL for objects that must stay private (originals). */
export async function createPresignedGetUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const { client, config } = getClient();
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const command = new GetObjectCommand({ Bucket: config.bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function putObject(key: string, data: Buffer, contentType: string): Promise<number> {
  const { client, config } = getClient();
  await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: data, ContentType: contentType }));
  return data.byteLength;
}

export async function deleteObject(key: string): Promise<void> {
  const { client, config } = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const { client, config } = getClient();
  // S3's batch-delete API caps at 1000 keys per request.
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await client.send(
      new DeleteObjectsCommand({ Bucket: config.bucket, Delete: { Objects: batch.map((Key) => ({ Key })) } })
    );
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const { client, config } = getClient();
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  const body = response.Body;
  if (!body) throw new Error(`Object ${key} has no body.`);
  const chunks: Uint8Array[] = [];
  // @ts-expect-error - Node's SdkStreamMixin supports async iteration at runtime.
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function headObject(key: string): Promise<HeadObjectCommandOutput | null> {
  const { client, config } = getClient();
  try {
    return await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "NotFound" || name === "NoSuchKey") return null;
    throw err;
  }
}
