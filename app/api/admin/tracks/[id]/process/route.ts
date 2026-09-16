import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { extractAudioMetadata } from "@/lib/audio/metadata";
import { getAudioProcessingService } from "@/lib/media/processing-service";
import { buildStreamingKey, buildDownloadKey } from "@/lib/media/audio-service";
import { getObjectBuffer, putObject } from "@/lib/media/r2-client";

// Transcoding a multi-minute master can run past the default serverless
// timeout; extend it. (Vercel: requires a plan that allows >10s/60s functions.)
export const maxDuration = 300;

/**
 * Runs after the browser finishes a direct-to-R2 upload: reads the master
 * back from R2, transcodes streaming + download copies, uploads those, and
 * flips the track to READY. Kept as a plain awaited request for now (see
 * FfmpegAudioProcessingService) rather than a queue — simplest thing that
 * works at this catalogue size; swap the processing service, not this route,
 * if that changes.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const track = await db.track.findUnique({ where: { id } });
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!track.originalStorageKey) {
    return NextResponse.json({ error: "This track has no uploaded audio to process." }, { status: 400 });
  }

  await db.track.update({ where: { id }, data: { processingStatus: "PROCESSING", processingError: null } });

  try {
    const originalBuffer = await getObjectBuffer(track.originalStorageKey);
    const metadata = await extractAudioMetadata(originalBuffer, track.mimeType || "audio/mpeg");

    const processed = await getAudioProcessingService().process({
      originalBuffer,
      sourceExtension: track.originalFormat || "mp3",
      createDownloadVersion: track.downloadEnabled,
    });

    const streamingKey = buildStreamingKey(track.id, processed.streamingFormat);
    await putObject(streamingKey, processed.streamingBuffer, "audio/mpeg");

    let downloadKey: string | null = null;
    if (processed.downloadBuffer && processed.downloadFormat) {
      downloadKey = buildDownloadKey(track.id, processed.downloadFormat);
      await putObject(downloadKey, processed.downloadBuffer, "audio/mpeg");
    }

    const updated = await db.track.update({
      where: { id },
      data: {
        duration: metadata.durationSeconds,
        streamingStorageKey: streamingKey,
        streamingFormat: processed.streamingFormat,
        streamingSize: processed.streamingBuffer.byteLength,
        downloadStorageKey: downloadKey,
        downloadFormat: processed.downloadFormat ?? null,
        downloadSize: processed.downloadBuffer?.byteLength ?? null,
        originalSize: originalBuffer.byteLength,
        processingStatus: "READY",
        processingError: null,
      },
      include: { artist: true, album: true },
    });

    return NextResponse.json({ track: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed.";
    await db.track.update({ where: { id }, data: { processingStatus: "FAILED", processingError: message } });
    return NextResponse.json({ error: "Audio processing failed.", detail: message }, { status: 422 });
  }
}
