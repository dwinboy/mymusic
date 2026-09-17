import type { OfflineTrackRecord } from "./db";
import type { PlayerTrack } from "@/lib/types";

// One object URL per downloaded cover for the life of the page. They aren't
// revoked when the Downloads page unmounts, because the player keeps showing
// the artwork of whatever is playing.
const objectUrls = new Map<string, string>();

/** The track as saved for offline, pointing at its locally stored artwork when there is one. */
export function offlinePlayerTrack(record: OfflineTrackRecord): PlayerTrack {
  if (!record.coverBlob) return record.track;
  let url = objectUrls.get(record.track.id);
  if (!url) {
    url = URL.createObjectURL(record.coverBlob);
    objectUrls.set(record.track.id, url);
  }
  return { ...record.track, coverUrl: url };
}
