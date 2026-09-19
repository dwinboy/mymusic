import { db } from "@/lib/db";
import { normaliseTitle } from "./title-match";

/**
 * Catching the same song uploaded twice.
 *
 * A warning, never a block: a remaster, a radio edit and a live take are all
 * legitimately the same title by the same artist. What isn't legitimate is
 * finding out only when two identical cards sit side by side on the homepage.
 */

export interface DuplicateTrack {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
  createdAt: Date;
}

/**
 * Other tracks by the same artist whose title reads as the same song.
 * Compared in memory: an artist has tens of tracks, not thousands, and the
 * normalisation is more forgiving than anything SQL would do for us.
 */
export async function findDuplicateTracks(
  artistId: string,
  title: string,
  excludeTrackId?: string
): Promise<DuplicateTrack[]> {
  const target = normaliseTitle(title);
  if (target.length < 2) return [];

  const candidates = await db.track.findMany({
    where: { artistId, ...(excludeTrackId ? { id: { not: excludeTrackId } } : {}) },
    select: { id: true, slug: true, title: true, isPublished: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return candidates.filter((track) => normaliseTitle(track.title) === target);
}
