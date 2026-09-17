/**
 * Migrates existing locally-stored media (from STORAGE_DRIVER=local /
 * public/uploads) to Cloudflare R2 (audio) and/or Cloudinary (images),
 * following the safe staged approach: upload -> verify -> only then update
 * the database pointer. Nothing is deleted automatically — local files are
 * left in place so a track keeps working from its legacy URL if anything
 * about the migration turns out to be wrong, until you've confirmed
 * playback in production and choose to clean them up yourself.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-r2-cloudinary.ts [--dry-run] [--audio-only] [--images-only]
 *
 * Requires AUDIO_STORAGE_DRIVER=r2 (+ R2_* vars) to migrate audio, and/or
 * IMAGE_PROVIDER=cloudinary (+ CLOUDINARY_* vars) to migrate images — set
 * whichever you're ready to move to; the script only touches what's
 * configured.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { isAudioR2Enabled, buildStreamingKey, buildDownloadKey } from "@/lib/media/audio-service";
import { originalAudioKey } from "@/lib/media/audio-keys";
import { putObject, headObject } from "@/lib/media/r2-client";
import { isImageCloudinaryEnabled } from "@/lib/media/image-service";
import { getCloudinary } from "@/lib/media/cloudinary-client";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const AUDIO_ONLY = args.includes("--audio-only");
const IMAGES_ONLY = args.includes("--images-only");

const UPLOADS_ROOT = path.join(process.cwd(), "public");

function localPathFor(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  return path.join(UPLOADS_ROOT, url);
}

function extFromUrl(url: string): string {
  const ext = url.split(".").pop();
  return ext && /^[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : "mp3";
}

async function migrateAudio() {
  console.log("\n=== Audio -> Cloudflare R2 ===");
  if (!isAudioR2Enabled()) {
    console.log("Skipped: AUDIO_STORAGE_DRIVER is not \"r2\". Set it (and the R2_* vars) to migrate audio.");
    return;
  }

  const candidates = await db.track.findMany({
    where: { streamingStorageKey: null, audioUrl: { not: null } },
    select: { id: true, title: true, audioUrl: true, originalAudioUrl: true, downloadAudioUrl: true },
  });

  console.log(`Found ${candidates.length} track(s) with local audio not yet on R2.`);

  let migrated = 0;
  let failed = 0;

  for (const track of candidates) {
    try {
      const streamingLocalPath = localPathFor(track.audioUrl!);
      if (!streamingLocalPath) {
        console.log(`  - skip "${track.title}": audioUrl isn't a local /uploads/ path (${track.audioUrl}).`);
        continue;
      }

      const streamingBuffer = await readFile(streamingLocalPath);
      const streamingExt = extFromUrl(track.audioUrl!);

      if (DRY_RUN) {
        console.log(`  - would migrate "${track.title}" (${(streamingBuffer.byteLength / 1024).toFixed(0)} KB streaming)`);
        continue;
      }

      const streamingKey = buildStreamingKey(track.id, streamingExt);
      await putObject(streamingKey, streamingBuffer, `audio/${streamingExt === "mp3" ? "mpeg" : streamingExt}`);

      let originalKey: string | null = null;
      if (track.originalAudioUrl) {
        const originalLocalPath = localPathFor(track.originalAudioUrl);
        if (originalLocalPath) {
          const originalBuffer = await readFile(originalLocalPath);
          const originalExt = extFromUrl(track.originalAudioUrl);
          originalKey = originalAudioKey(track.id, originalExt);
          await putObject(originalKey, originalBuffer, `audio/${originalExt}`);
        }
      }

      let downloadKey: string | null = null;
      if (track.downloadAudioUrl) {
        const downloadLocalPath = localPathFor(track.downloadAudioUrl);
        if (downloadLocalPath) {
          const downloadBuffer = await readFile(downloadLocalPath);
          const downloadExt = extFromUrl(track.downloadAudioUrl);
          downloadKey = buildDownloadKey(track.id, downloadExt);
          await putObject(downloadKey, downloadBuffer, `audio/${downloadExt === "mp3" ? "mpeg" : downloadExt}`);
        }
      }

      // Verify before switching the pointer — the whole point of the staged approach.
      const verify = await headObject(streamingKey);
      if (!verify || verify.ContentLength !== streamingBuffer.byteLength) {
        throw new Error("Post-upload verification failed (object missing or size mismatch).");
      }

      await db.track.update({
        where: { id: track.id },
        data: {
          streamingStorageKey: streamingKey,
          streamingFormat: streamingExt,
          streamingSize: streamingBuffer.byteLength,
          originalStorageKey: originalKey,
          downloadStorageKey: downloadKey,
        },
      });

      console.log(`  ✓ migrated "${track.title}" -> ${streamingKey}`);
      migrated++;
    } catch (err) {
      console.error(`  ✗ failed "${track.title}":`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`Audio: ${migrated} migrated, ${failed} failed, ${candidates.length - migrated - failed} skipped.`);
}

async function migrateImages() {
  console.log("\n=== Images -> Cloudinary ===");
  if (!isImageCloudinaryEnabled()) {
    console.log("Skipped: IMAGE_PROVIDER is not \"cloudinary\". Set it (and the CLOUDINARY_* vars) to migrate images.");
    return;
  }

  const cloudinary = getCloudinary();

  const tracks = await db.track.findMany({
    where: { coverImagePublicId: null, coverUrl: { not: null } },
    select: { id: true, title: true, coverUrl: true },
  });
  const artists = await db.artist.findMany({
    where: { avatarImagePublicId: null, avatarUrl: { not: null } },
    select: { id: true, name: true, avatarUrl: true },
  });

  console.log(`Found ${tracks.length} track cover(s) and ${artists.length} artist avatar(s) not yet on Cloudinary.`);

  let migrated = 0;
  let failed = 0;

  for (const track of tracks) {
    const localPath = localPathFor(track.coverUrl!);
    if (!localPath) continue;
    if (DRY_RUN) {
      console.log(`  - would migrate cover for "${track.title}"`);
      continue;
    }
    try {
      const result = await cloudinary.uploader.upload(localPath, { folder: "vibebanger/covers" });
      await db.track.update({
        where: { id: track.id },
        data: {
          coverImagePublicId: result.public_id,
          coverImageUrl: result.secure_url,
          coverImageWidth: result.width,
          coverImageHeight: result.height,
        },
      });
      console.log(`  ✓ migrated cover for "${track.title}"`);
      migrated++;
    } catch (err) {
      console.error(`  ✗ failed cover for "${track.title}":`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  for (const artist of artists) {
    const localPath = localPathFor(artist.avatarUrl!);
    if (!localPath) continue;
    if (DRY_RUN) {
      console.log(`  - would migrate avatar for "${artist.name}"`);
      continue;
    }
    try {
      const result = await cloudinary.uploader.upload(localPath, { folder: "vibebanger/avatars" });
      await db.artist.update({
        where: { id: artist.id },
        data: { avatarImagePublicId: result.public_id },
      });
      console.log(`  ✓ migrated avatar for "${artist.name}"`);
      migrated++;
    } catch (err) {
      console.error(`  ✗ failed avatar for "${artist.name}":`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`Images: ${migrated} migrated, ${failed} failed.`);
}

async function main() {
  console.log(`Media migration${DRY_RUN ? " (dry run — no changes will be made)" : ""}`);

  if (!IMAGES_ONLY) await migrateAudio();
  if (!AUDIO_ONLY) await migrateImages();

  console.log("\nDone. Local files under public/uploads were left in place — verify playback/artwork in the");
  console.log("app before deleting them yourself.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
