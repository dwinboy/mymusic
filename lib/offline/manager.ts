import type { PlayerTrack } from "@/lib/types";
import { putOfflineTrack, removeOfflineTrack, getOfflineTrack } from "./db";
import { cacheAudioResponse, removeCachedAudio } from "./audio-cache";
import { warmOfflinePages } from "./warm";
import { ensurePersistentStorage } from "./persistence";
import { readStoredQuality } from "@/lib/audio/quality";

export type DownloadStatus = "idle" | "downloading" | "downloaded" | "failed";

/**
 * Downloads a track's audio for offline playback: streams the response
 * (reporting progress along the way), stores it in Cache Storage keyed by
 * its exact request URL — so the service worker's fetch handler serves it
 * automatically when offline — and records the track metadata in
 * IndexedDB so the Downloads page can list it without a network round trip.
 */
export async function downloadTrackForOffline(
  track: PlayerTrack,
  onProgress?: (percent: number) => void
): Promise<void> {
  // Ask before writing, so what we save is protected from the moment it
  // lands. A refusal is not a reason to stop: an unprotected download still
  // plays, it just isn't safe from an automatic clear-out.
  void ensurePersistentStorage();

  // Save the encode this listener would be played, not always the standard
  // one. Someone on High was downloading the 160k stream while the player
  // went on asking for the 320k file — which was never cached, so their
  // downloads didn't play offline at all.
  const source = preferredSource(track);

  const response = await fetch(source);
  if (!response.ok || !response.body) {
    throw new Error("Couldn't fetch this track's audio.");
  }

  const contentLength = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (contentLength > 0 && onProgress) {
        onProgress(Math.min(100, Math.round((received / contentLength) * 100)));
      }
    }
  }

  const blob = new Blob(chunks as BlobPart[], { type: response.headers.get("content-type") ?? "audio/mpeg" });
  const cachedResponse = new Response(blob, {
    headers: {
      "Content-Type": blob.type,
      "Content-Length": String(blob.size),
      "Accept-Ranges": "bytes",
    },
  });

  await cacheAudioResponse(source, cachedResponse);

  const cover = await fetchCover(track.coverUrl);
  const record = { track, byteSize: blob.size, downloadedAt: Date.now(), sourceUrl: source };
  try {
    await putOfflineTrack({ ...record, coverBytes: cover?.bytes, coverType: cover?.type });
  } catch {
    // The audio is already cached and playable by this point, so a record
    // that won't store is not a reason to call the download a failure. Try
    // once more with nothing but the metadata — artwork is the only part
    // that has ever been refused, and a download without it still plays.
    await putOfflineTrack(record);
  }
  // Make sure there's a page to play it from when the connection is gone.
  void warmOfflinePages({ force: true }).catch(() => {});

  onProgress?.(100);
}

/** Best effort: a download without artwork still plays. */
async function fetchCover(url: string | null): Promise<{ bytes: ArrayBuffer; type: string } | undefined> {
  if (!url) return undefined;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    return {
      bytes: await response.arrayBuffer(),
      type: response.headers.get("content-type") || "image/jpeg",
    };
  } catch {
    return undefined;
  }
}

/** The encode to save: whichever one this listener's quality setting plays. */
function preferredSource(track: PlayerTrack): string {
  return readStoredQuality() === "high" && track.highQualityUrl ? track.highQualityUrl : track.audioUrl;
}

export async function removeOfflineDownload(track: Pick<PlayerTrack, "id" | "audioUrl">): Promise<void> {
  // Whichever encode was saved, plus the other one in case the quality
  // setting changed between downloading and removing — deleting a key that
  // isn't there costs nothing, and leaving audio behind costs the device.
  const record = await getOfflineTrack(track.id);
  for (const url of new Set([record?.sourceUrl, record?.track.audioUrl, record?.track.highQualityUrl, track.audioUrl])) {
    if (url) await removeCachedAudio(url);
  }
  await removeOfflineTrack(track.id);
}

export async function isDownloadedOffline(trackId: string): Promise<boolean> {
  const record = await getOfflineTrack(trackId);
  return !!record;
}
