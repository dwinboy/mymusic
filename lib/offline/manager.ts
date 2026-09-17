import type { PlayerTrack } from "@/lib/types";
import { putOfflineTrack, removeOfflineTrack, getOfflineTrack } from "./db";
import { cacheAudioResponse, removeCachedAudio } from "./audio-cache";
import { warmOfflinePages } from "./warm";

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
  const response = await fetch(track.audioUrl);
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

  await cacheAudioResponse(track.audioUrl, cachedResponse);
  await putOfflineTrack({ track, byteSize: blob.size, downloadedAt: Date.now(), coverBlob: await fetchCover(track.coverUrl) });
  // Make sure there's a page to play it from when the connection is gone.
  void warmOfflinePages({ force: true }).catch(() => {});

  onProgress?.(100);
}

/** Best effort: a download without artwork still plays. */
async function fetchCover(url: string | null): Promise<Blob | undefined> {
  if (!url) return undefined;
  try {
    const response = await fetch(url);
    return response.ok ? await response.blob() : undefined;
  } catch {
    return undefined;
  }
}

export async function removeOfflineDownload(track: Pick<PlayerTrack, "id" | "audioUrl">): Promise<void> {
  await removeCachedAudio(track.audioUrl);
  await removeOfflineTrack(track.id);
}

export async function isDownloadedOffline(trackId: string): Promise<boolean> {
  const record = await getOfflineTrack(trackId);
  return !!record;
}
