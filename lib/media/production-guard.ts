import { isAudioR2Enabled } from "./audio-service";
import { isImageCloudinaryEnabled } from "./image-service";

/**
 * `next start` (and any real host — Vercel's functions have an ephemeral/
 * read-only filesystem too) only serves the /public files that existed at
 * build time; files an admin uploads afterward write to disk successfully
 * but 404 for every visitor until the next deploy. Verified directly: a
 * file added to /public while `next start` is running returns 404 until
 * the process restarts, while the identical file under `next dev` serves
 * immediately. Local storage is a dev-only convenience — refuse new local
 * uploads in production instead of accepting them and silently breaking.
 */
export function productionLocalStorageWarning(kind: "audio" | "image"): string | null {
  if (process.env.NODE_ENV !== "production") return null;

  if (kind === "audio" && !isAudioR2Enabled()) {
    return "Audio storage is set to local disk, which doesn't work in production — Next.js's production server only serves /public files that existed at build time, so this upload would silently 404 for listeners. Set AUDIO_STORAGE_DRIVER=r2 and the R2_* env vars (see MEDIA_SETUP.md) before uploading in production.";
  }
  if (kind === "image" && !isImageCloudinaryEnabled()) {
    return "Image storage is set to local disk, which doesn't work in production — Next.js's production server only serves /public files that existed at build time, so this upload would silently 404 for visitors. Set IMAGE_PROVIDER=cloudinary and the CLOUDINARY_* env vars (see MEDIA_SETUP.md) before uploading in production.";
  }
  return null;
}
