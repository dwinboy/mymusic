import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";
import { isSupportedAudioType, extractAudioMetadata } from "@/lib/audio/metadata";
import { isAudioR2Enabled, createOriginalUploadTarget, buildStreamingKey, buildDownloadKey } from "@/lib/media/audio-service";
import { getStorageDriver } from "@/lib/storage";
import { getAudioProcessingService } from "@/lib/media/processing-service";
import { productionLocalStorageWarning } from "@/lib/media/production-guard";

function extFromFilename(filename: string, mimeType: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && /^(mp3|wav|flac|m4a|aac)$/.test(fromName)) return fromName;
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("flac")) return "flac";
  if (mimeType.includes("mp4") || mimeType.includes("m4a") || mimeType.includes("aac")) return "m4a";
  return "mp3";
}

/**
 * Starts a new track upload. Two shapes depending on AUDIO_STORAGE_DRIVER:
 *
 *  - r2:    the request carries only {artistId, title, filename, contentType} —
 *           no audio bytes. We create a draft Track row (processingStatus
 *           UPLOADING) and hand back a presigned R2 PUT URL; the browser
 *           uploads directly to R2 and then calls .../process to finish up.
 *  - local: the request carries the actual audio file (dev has no presigned-
 *           upload equivalent for the filesystem). We store + process it
 *           synchronously and return a READY track — the client skips the
 *           separate upload/process round trips entirely in this mode.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const artistId = String(formData.get("artistId") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!artistId || !title) {
    return NextResponse.json({ error: "An artist and a title are required to start an upload." }, { status: 400 });
  }

  const artist = await db.artist.findUnique({ where: { id: artistId } });
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 });

  const slug = await uniqueSlug(title, async (s) => !!(await db.track.findUnique({ where: { slug: s } })));

  if (isAudioR2Enabled()) {
    const filename = String(formData.get("filename") ?? "");
    const contentType = String(formData.get("contentType") ?? "");
    if (!filename || !contentType) {
      return NextResponse.json({ error: "filename and contentType are required." }, { status: 400 });
    }
    if (!isSupportedAudioType(contentType)) {
      return NextResponse.json({ error: `Unsupported audio format: ${contentType}` }, { status: 400 });
    }

    const track = await db.track.create({
      data: { title, slug, artistId, processingStatus: "UPLOADING", isPublished: false },
    });

    const ext = extFromFilename(filename, contentType);
    const target = await createOriginalUploadTarget(track.id, ext, contentType);
    if (target.mode !== "r2") {
      // Shouldn't happen given the isAudioR2Enabled() check above, but keep TS honest.
      return NextResponse.json({ error: "R2 is not configured." }, { status: 500 });
    }

    await db.track.update({
      where: { id: track.id },
      data: { originalStorageKey: target.key, originalFormat: ext, mimeType: contentType },
    });

    return NextResponse.json(
      { track: { ...track, originalStorageKey: target.key }, upload: { mode: "r2", uploadUrl: target.uploadUrl, key: target.key } },
      { status: 201 }
    );
  }

  // --- Local dev fallback: process synchronously, no direct-upload step. ---
  const prodWarning = productionLocalStorageWarning("audio");
  if (prodWarning) return NextResponse.json({ error: prodWarning }, { status: 500 });

  const audioFile = formData.get("audio") as File | null;
  if (!audioFile || audioFile.size === 0) {
    return NextResponse.json({ error: "An audio file is required." }, { status: 400 });
  }
  if (!isSupportedAudioType(audioFile.type)) {
    return NextResponse.json(
      { error: `Unsupported audio format: ${audioFile.type || "unknown"}. Use MP3, WAV, FLAC, or M4A.` },
      { status: 400 }
    );
  }
  const MAX_AUDIO_BYTES = 200 * 1024 * 1024;
  if (audioFile.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio file exceeds the 200MB limit." }, { status: 400 });
  }

  const track = await db.track.create({
    data: { title, slug, artistId, processingStatus: "PROCESSING", isPublished: false },
  });

  try {
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const metadata = await extractAudioMetadata(buffer, audioFile.type);
    const ext = extFromFilename(audioFile.name, audioFile.type);

    const storage = getStorageDriver();
    const originalStored = await storage.put({
      folder: "audio-original",
      filename: `${track.id}.${ext}`,
      contentType: audioFile.type,
      data: buffer,
    });

    const processed = await getAudioProcessingService().process({
      originalBuffer: buffer,
      sourceExtension: ext,
      createDownloadVersion: true,
    });

    const streamStored = await storage.put({
      folder: "audio",
      filename: `${buildStreamingKey(track.id).split("/").pop()}`,
      contentType: "audio/mpeg",
      data: processed.streamingBuffer,
    });

    const downloadStored = processed.downloadBuffer
      ? await storage.put({
          folder: "audio-download",
          filename: `${buildDownloadKey(track.id, "mp3").split("/").pop()}`,
          contentType: "audio/mpeg",
          data: processed.downloadBuffer,
        })
      : null;

    const updated = await db.track.update({
      where: { id: track.id },
      data: {
        duration: metadata.durationSeconds,
        audioUrl: streamStored.url,
        originalAudioUrl: originalStored.url,
        downloadAudioUrl: downloadStored?.url,
        fileSize: streamStored.size,
        mimeType: "audio/mpeg",
        streamingSize: streamStored.size,
        streamingFormat: "mp3",
        downloadSize: downloadStored?.size,
        downloadFormat: downloadStored ? "mp3" : null,
        originalSize: originalStored.size,
        originalFormat: ext,
        processingStatus: "READY",
        processingError: null,
      },
    });

    return NextResponse.json({ track: updated, upload: { mode: "local" } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed.";
    await db.track.update({
      where: { id: track.id },
      data: { processingStatus: "FAILED", processingError: message },
    });
    return NextResponse.json(
      { error: "Couldn't process this audio file. The draft was kept so you can retry.", detail: message },
      { status: 422 }
    );
  }
}
