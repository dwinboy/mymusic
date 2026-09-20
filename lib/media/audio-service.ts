import { originalAudioKey, streamingAudioKey, downloadAudioKey } from "./audio-keys";
import { createPresignedUploadUrl, createPresignedGetUrl, publicUrlForKey, deleteObjects, isR2Configured } from "./r2-client";
import { getStorageDriver } from "@/lib/storage";

export type AudioStorageMode = "local" | "r2";

export function audioStorageMode(): AudioStorageMode {
  return process.env.AUDIO_STORAGE_DRIVER === "r2" ? "r2" : "local";
}

export function isAudioR2Enabled(): boolean {
  return audioStorageMode() === "r2";
}

interface TrackAudioRefs {
  id: string;
  audioUrl?: string | null;
  originalAudioUrl?: string | null;
  downloadAudioUrl?: string | null;
  streamingStorageKey?: string | null;
  downloadStorageKey?: string | null;
  originalStorageKey?: string | null;
  downloadEnabled: boolean;
}

/**
 * Direct-upload target for a new track's master audio file. In R2 mode the
 * browser PUTs straight to R2 with this presigned URL — the bytes never
 * pass through our server. In local mode there's no presigned-upload
 * equivalent, so callers fall back to the legacy multipart POST endpoint.
 */
export async function createOriginalUploadTarget(
  trackId: string,
  extension: string,
  contentType: string,
  version?: string
): Promise<{ mode: "r2"; uploadUrl: string; key: string } | { mode: "local" }> {
  if (isAudioR2Enabled()) {
    const key = originalAudioKey(trackId, extension, version);
    const uploadUrl = await createPresignedUploadUrl(key, contentType);
    return { mode: "r2", uploadUrl, key };
  }
  return { mode: "local" };
}

/**
 * Public streaming URL used by the player. Never a presigned URL — R2
 * public bucket, permanent. Null while a track is still uploading/processing.
 */
export function getStreamingUrl(track: TrackAudioRefs): string | null {
  if (track.streamingStorageKey) return publicUrlForKey(track.streamingStorageKey);
  if (track.audioUrl) return track.audioUrl;
  return null;
}

/** Download URL, respecting downloadEnabled. Falls back to the streaming copy if no distinct download file exists. */
export function getDownloadUrl(track: TrackAudioRefs): string | null {
  if (!track.downloadEnabled) return null;
  if (track.downloadStorageKey) return publicUrlForKey(track.downloadStorageKey);
  if (track.downloadAudioUrl) return track.downloadAudioUrl;
  if (track.streamingStorageKey) return publicUrlForKey(track.streamingStorageKey);
  if (track.audioUrl) return track.audioUrl;
  return null;
}

/**
 * The higher-bitrate copy, for listeners who ask for it — or null when the
 * track only has the streaming encode, in which case there is nothing better
 * to play. Unlike getDownloadUrl this never falls back to the streaming file:
 * the caller needs to know whether a real upgrade exists.
 *
 * No longer gated on downloadEnabled. It used to be, so that a creator who
 * withheld the file wasn't serving it under another name — but the effect was
 * that one switch about keeping a file silently dropped everyone listening to
 * that track from 320k to 192k, which is not what anyone toggling it meant.
 *
 * The file this serves is a derived encode, not the master: the master is
 * private and only ever reachable through a signed, time-limited URL.
 */
export function getHighQualityUrl(track: TrackAudioRefs): string | null {
  if (track.downloadStorageKey) return publicUrlForKey(track.downloadStorageKey);
  if (track.downloadAudioUrl) return track.downloadAudioUrl;
  return null;
}

/** Original/master file — admin-only, time-limited signed URL when stored in R2 (never a permanent public link). */
export async function getOriginalUrl(track: TrackAudioRefs): Promise<string | null> {
  if (track.originalStorageKey) return createPresignedGetUrl(track.originalStorageKey);
  if (track.originalAudioUrl) return track.originalAudioUrl;
  return null;
}

export function buildStreamingKey(trackId: string, extension = "mp3", version?: string): string {
  return streamingAudioKey(trackId, extension, version);
}

export function buildDownloadKey(trackId: string, extension: string, version?: string): string {
  return downloadAudioKey(trackId, extension, version);
}

/** Removes every audio object associated with a track, across whichever storage mode created them. */
export async function deleteTrackAudio(track: TrackAudioRefs): Promise<void> {
  const r2Keys = [track.originalStorageKey, track.streamingStorageKey, track.downloadStorageKey].filter(
    (k): k is string => !!k
  );
  if (r2Keys.length > 0 && isR2Configured()) {
    await deleteObjects(r2Keys).catch(() => {
      // Best-effort cleanup — a missing/already-deleted object shouldn't block track deletion.
    });
  }

  // Legacy local-driver files (pre-R2 tracks, or R2 disabled).
  if (audioStorageMode() === "local") {
    const driver = getStorageDriver();
    for (const legacyUrl of [track.audioUrl, track.originalAudioUrl]) {
      if (!legacyUrl) continue;
      const key = legacyUrl.replace(/^\/uploads\//, "");
      if (key !== legacyUrl) {
        await driver.remove(key).catch(() => {});
      }
    }
  }
}
