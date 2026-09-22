import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import type { PlayerTrack } from "@/lib/types";

/**
 * What a listener's own history adds up to.
 *
 * Every play already records how far it got — clamped to the track's length
 * by the play route, so this is real listening rather than a count of times
 * something was opened. Nothing here is new data collection; it is the
 * history that has been recorded all along, finally shown to the person it
 * belongs to.
 */
export interface ListeningStats {
  /** Seconds actually listened, partial plays included. */
  seconds: number;
  /** Plays that passed the threshold — skips don't count. */
  plays: number;
  /** How many different songs those plays covered. */
  distinctTracks: number;
  topTracks: { track: PlayerTrack; plays: number }[];
  topArtists: { id: string; name: string; slug: string; plays: number }[];
  /** When they first played anything, or null if they never have. */
  firstPlayedAt: Date | null;
}

export const EMPTY_STATS: ListeningStats = {
  seconds: 0,
  plays: 0,
  distinctTracks: 0,
  topTracks: [],
  topArtists: [],
  firstPlayedAt: null,
};

/** `days` of history, or null for everything since they joined. */
export async function listeningStats(userId: string, days: number | null): Promise<ListeningStats> {
  const since = days === null ? null : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const window = since ? { gte: since } : undefined;
  const base = { userId, ...(window ? { createdAt: window } : {}) };

  const [totals, counted, grouped, first] = await Promise.all([
    // Partial plays count toward time listened: half a song is half a song.
    db.play.aggregate({ where: base, _sum: { progressSeconds: true } }),
    db.play.count({ where: { ...base, countedAsPlay: true } }),
    // Grouped in the database, so this is bounded by how many different
    // songs they played rather than by how many times they pressed play.
    db.play.groupBy({
      by: ["trackId"],
      where: { ...base, countedAsPlay: true },
      _count: { _all: true },
      orderBy: { _count: { trackId: "desc" } },
    }),
    db.play.findFirst({ where: { userId }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);

  const playsByTrack = new Map(grouped.map((row) => [row.trackId, row._count._all]));
  const rows = grouped.length
    ? await db.track.findMany({
        where: { id: { in: grouped.map((row) => row.trackId) }, isPublished: true },
        include: { artist: true, album: true },
      })
    : [];

  const byId = new Map(rows.map((row) => [row.id, row]));
  const topTracks = grouped
    .map((row) => byId.get(row.trackId))
    .filter((row): row is NonNullable<typeof row> => !!row)
    .slice(0, 10)
    .map((row) => ({ track: toPlayerTrack(row), plays: playsByTrack.get(row.id) ?? 0 }));

  // Artists are totalled from the same grouped counts rather than a second
  // pass over every play row.
  const artistTotals = new Map<string, { id: string; name: string; slug: string; plays: number }>();
  for (const row of rows) {
    const current = artistTotals.get(row.artistId) ?? {
      id: row.artistId,
      name: row.artist.name,
      slug: row.artist.slug,
      plays: 0,
    };
    current.plays += playsByTrack.get(row.id) ?? 0;
    artistTotals.set(row.artistId, current);
  }

  return {
    seconds: totals._sum.progressSeconds ?? 0,
    plays: counted,
    // Only songs still published are shown, so count those rather than the
    // raw groups — otherwise the number wouldn't match the list beneath it.
    distinctTracks: rows.length,
    topTracks,
    topArtists: [...artistTotals.values()].sort((a, b) => b.plays - a.plays).slice(0, 5),
    firstPlayedAt: first?.createdAt ?? null,
  };
}

/** "3 hours 20 minutes", "12 minutes", "under a minute". */
export function formatListeningTime(seconds: number): string {
  if (seconds < 60) return "under a minute";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (hours === 0) return plural(minutes, "minute");
  if (minutes === 0) return plural(hours, "hour");
  return `${plural(hours, "hour")} ${plural(minutes, "minute")}`;
}
