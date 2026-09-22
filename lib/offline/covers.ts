import type { OfflineTrackRecord } from "./db";
import type { PlayerTrack } from "@/lib/types";

// One object URL per downloaded cover for the life of the page. They aren't
// revoked when the Downloads page unmounts, because the player keeps showing
// the artwork of whatever is playing.
const objectUrls = new Map<string, string>();

/** The track as saved for offline, pointing at its locally stored artwork when there is one. */
export function offlinePlayerTrack(record: OfflineTrackRecord): PlayerTrack {
  const cover = coverBlobOf(record);
  if (!cover) return record.track;
  let url = objectUrls.get(record.track.id);
  if (!url) {
    url = URL.createObjectURL(cover);
    objectUrls.set(record.track.id, url);
  }
  return { ...record.track, coverUrl: url };
}

/** Downloads saved before the move to bytes still hold a Blob directly. */
function coverBlobOf(record: OfflineTrackRecord): Blob | null {
  if (record.coverBytes) return new Blob([record.coverBytes], { type: record.coverType || "image/jpeg" });
  return record.coverBlob ?? null;
}
