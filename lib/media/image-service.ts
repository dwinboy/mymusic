import { getCloudinary, isCloudinaryConfigured } from "./cloudinary-client";
import { getStorageDriver } from "@/lib/storage";

export type ImageProvider = "local" | "cloudinary";

export function imageProvider(): ImageProvider {
  return process.env.IMAGE_PROVIDER === "cloudinary" ? "cloudinary" : "local";
}

export function isImageCloudinaryEnabled(): boolean {
  return imageProvider() === "cloudinary";
}

/** Named breakpoints so every call site asks for a size, not raw pixels. */
export const IMAGE_SIZES = {
  thumbnail: 150,
  small: 300,
  medium: 500,
  large: 1000,
  hero: 1600,
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

/**
 * Direct-upload signature for the browser to POST straight to Cloudinary.
 * Only the fields included here are covered by the signature — the client
 * must send exactly these plus `file` and `api_key`, or Cloudinary rejects it.
 */
export async function createImageUploadSignature(folder: string) {
  const cloudinary = getCloudinary();
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

  return {
    timestamp,
    folder,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  };
}

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured()) return;
  const cloudinary = getCloudinary();
  await cloudinary.uploader.destroy(publicId).catch(() => {
    // Best-effort — an already-missing asset shouldn't block the caller.
  });
}

/**
 * Server-side image upload for the local-dev fallback path (no Cloudinary
 * configured): writes through the existing local StorageDriver exactly as
 * before, so nothing regresses when IMAGE_PROVIDER isn't set.
 */
export async function uploadImageLocally(params: {
  folder: "covers" | "avatars";
  filename: string;
  contentType: string;
  data: Buffer;
}): Promise<{ url: string }> {
  const driver = getStorageDriver();
  const stored = await driver.put(params);
  return { url: stored.url };
}

interface ImageRef {
  publicId?: string | null;
  fallbackUrl?: string | null;
}

/**
 * Resolves the URL to render for an image reference, applying a Cloudinary
 * transform when the asset lives there, or returning the plain stored URL
 * for the local-dev fallback. Every call site asks for a named size instead
 * of picking pixel dimensions itself, so the homepage never ships a
 * multi-megabyte original just because one exists.
 */
export function resolveImageUrl(ref: ImageRef, size: ImageSize): string | null {
  if (ref.publicId && isCloudinaryConfigured()) {
    const cloudinary = getCloudinary();
    const width = IMAGE_SIZES[size];
    return cloudinary.url(ref.publicId, {
      width,
      height: width,
      crop: "fill",
      gravity: "auto",
      fetch_format: "auto",
      quality: "auto",
      secure: true,
    });
  }
  return ref.fallbackUrl ?? null;
}
