import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";
import { isSupportedAudioType, extractAudioMetadata } from "@/lib/audio/metadata";
import { isAudioR2Enabled, createOriginalUploadTarget, buildStreamingKey, buildDownloadKey } from "@/lib/media/audio-service";
import { getStorageDriver } from "@/lib/storage";
import { getAudioProcessingService } from "@/lib/media/processing-service";
import { productionLocalStorageWarning } from "@/lib/media/production-guard";
import { getObjectBuffer, putObject } from "@/lib/media/r2-client";
import { computeWaveform } from "@/lib/media/waveform";

/**
 * The audio upload pipeline, shared by admin and creator routes so there is
 * one copy of the media handling. Callers do authorisation; these functions
 * assume the caller is allowed to act on the artist or track given.
 *
 * Flow (R2): startTrackUpload creates a draft and returns a presigned URL →
 * the browser PUTs the file straight to R2 → processTrackAudio transcodes it.
 * Local storage (development) has no presigned equivalent, so the file comes
 * with the start request and is processed synchronously.
 */

export class PipelineError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
  }
}

export const MAX_AUDIO_BYTES = 200 * 1024 * 1024;

export function extFromFilename(filename: string, mimeType: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && /^(mp3|wav|flac|m4a|aac)$/.test(fromName)) return fromName;
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("flac")) return "flac";
  if (mimeType.includes("mp4") || mimeType.includes("m4a") || mimeType.includes("aac")) return "m4a";
  return "mp3";
}

export async function startTrackUpload(input: {
  artistId: string;
  title: string;
  filename: string;
  contentType: string;
  /** Local-storage mode only. */
  file?: File | null;
}) {
  const title = input.title.trim();
  if (!input.artistId || !title) throw new PipelineError("An artist and a title are required to start an upload.", 400);

  const slug = await uniqueSlug(title, async (s) => !!(await db.track.findUnique({ where: { slug: s } })));

  if (isAudioR2Enabled()) {
    if (!input.filename || !input.contentType) throw new PipelineError("filename and contentType are required.", 400);
    if (!isSupportedAudioType(input.contentType)) {
      throw new PipelineError(`Unsupported audio format: ${input.contentType}`, 400);
    }

    const track = await db.track.create({
      data: { title, slug, artistId: input.artistId, processingStatus: "UPLOADING", isPublished: false },
    });
    const ext = extFromFilename(input.filename, input.contentType);
    const target = await createOriginalUploadTarget(track.id, ext, input.contentType);
    if (target.mode !== "r2") throw new PipelineError("R2 is not configured.", 500);

    const updated = await db.track.update({
      where: { id: track.id },
      data: { originalStorageKey: target.key, originalFormat: ext, mimeType: input.contentType },
    });
    return { track: updated, upload: { mode: "r2" as const, uploadUrl: target.uploadUrl, key: target.key } };
  }

  const prodWarning = productionLocalStorageWarning("audio");
  if (prodWarning) throw new PipelineError(prodWarning, 500);

  const audioFile = input.file;
  if (!audioFile || audioFile.size === 0) throw new PipelineError("An audio file is required.", 400);
  if (!isSupportedAudioType(audioFile.type)) {
    throw new PipelineError(
      `Unsupported audio format: ${audioFile.type || "unknown"}. Use MP3, WAV, FLAC, or M4A.`,
      400
    );
  }
  if (audioFile.size > MAX_AUDIO_BYTES) throw new PipelineError("Audio file exceeds the 200MB limit.", 400);

  const track = await db.track.create({
    data: { title, slug, artistId: input.artistId, processingStatus: "PROCESSING", isPublished: false },
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
    // Decorative, so a failure here never fails the upload.
    const waveform = await computeWaveform(processed.streamingBuffer, "mp3").catch(() => []);
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
        waveform,
        processingStatus: "READY",
        processingError: null,
      },
    });
    return { track: updated, upload: { mode: "local" as const } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed.";
    await db.track.update({ where: { id: track.id }, data: { processingStatus: "FAILED", processingError: message } });
    throw new PipelineError("Couldn't process this audio file. The draft was kept so you can retry.", 422, message);
  }
}

/** Transcodes an uploaded original into streaming and download copies. */
export async function processTrackAudio(trackId: string) {
  const track = await db.track.findUnique({ where: { id: trackId } });
  if (!track) throw new PipelineError("Not found", 404);
  if (!track.originalStorageKey) throw new PipelineError("This track has no uploaded audio to process.", 400);

  await db.track.update({ where: { id: trackId }, data: { processingStatus: "PROCESSING", processingError: null } });

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
    // Decorative, so a failure here never fails processing.
    const waveform = await computeWaveform(processed.streamingBuffer, "mp3").catch(() => []);

    return await db.track.update({
      where: { id: trackId },
      data: {
        duration: metadata.durationSeconds,
        waveform,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed.";
    await db.track.update({ where: { id: trackId }, data: { processingStatus: "FAILED", processingError: message } });
    throw new PipelineError("Audio processing failed.", 422, message);
  }
}
