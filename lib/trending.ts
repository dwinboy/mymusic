import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { TRACK_WITH_RELATIONS } from "@/lib/taxonomy";

/**
 * Trending is recent momentum, not lifetime totals: a track with a million
 * plays last year and none this week isn't trending. Scored over a rolling
 * window from several weighted signals, so a single listener looping one song
 * can't dominate — breadth of audience counts for more than repeat plays.
 */

const WINDOW_DAYS = 7;
const MOMENTUM_DAYS = 2;

/**
 * Plays from one listener beyond this many don't add to a track's score.
 * Without a cap, one person looping a song outranks a song several people
 * each heard once — the opposite of what trending should measure.
 */
const MAX_PLAYS_PER_LISTENER = 3;

/** Relative weight of each signal within the window. */
const WEIGHTS = {
  countedPlay: 1,
  /** Added on top for plays inside the momentum window — rewards growth. */
  recentPlay: 1,
  uniqueListener: 3,
  completion: 0.5,
  favorite: 3,
  playlistAdd: 2,
  download: 2,
};

export type TrendingTrack = Prisma.TrackGetPayload<{ include: typeof TRACK_WITH_RELATIONS }>;

export interface TrendingResult {
  tracks: TrendingTrack[];
  /**
   * False when the platform had too little recent activity and the list was
   * topped up with featured/new releases. Lets the UI avoid calling a
   * curated list "Trending", which would be dishonest.
   */
  organic: boolean;
}

/** Uncached ranking. Exported for scripts and tests; pages use `trendingService`. */
export async function rankTrendingIds(limit: number): Promise<string[]> {
  const window = Prisma.sql`NOW() - INTERVAL '${Prisma.raw(String(WINDOW_DAYS))} days'`;
  const momentum = Prisma.sql`NOW() - INTERVAL '${Prisma.raw(String(MOMENTUM_DAYS))} days'`;

  // Every branch filters on an indexed timestamp first, so cost scales with
  // activity inside the window rather than with table size.
  const rows = await db.$queryRaw<{ trackId: string }[]>(Prisma.sql`
    WITH per_listener AS (
      -- One row per (track, listener). Play counts are capped here, which is
      -- what keeps a single looping listener from dominating.
      SELECT "trackId",
             COUNT(*)                                        AS plays_window,
             COUNT(*) FILTER (WHERE "createdAt" > ${momentum}) AS plays_momentum,
             BOOL_OR(completed)                              AS completed_any
        FROM plays
       WHERE "countedAsPlay" AND "createdAt" > ${window}
       GROUP BY "trackId", COALESCE("userId", "sessionId")
    ),
    signals AS (
      SELECT "trackId",
             LEAST(plays_window, ${MAX_PLAYS_PER_LISTENER}) * ${WEIGHTS.countedPlay}::numeric
           + LEAST(plays_momentum, ${MAX_PLAYS_PER_LISTENER}) * ${WEIGHTS.recentPlay}::numeric
           + ${WEIGHTS.uniqueListener}::numeric
           + CASE WHEN completed_any THEN ${WEIGHTS.completion}::numeric ELSE 0 END AS w
        FROM per_listener
      UNION ALL
      SELECT "trackId", ${WEIGHTS.favorite}::numeric
        FROM favorites WHERE "createdAt" > ${window}
      UNION ALL
      SELECT "trackId", ${WEIGHTS.playlistAdd}::numeric
        FROM playlist_tracks WHERE "addedAt" > ${window}
      UNION ALL
      SELECT "trackId", ${WEIGHTS.download}::numeric
        FROM downloads WHERE "createdAt" > ${window}
    )
    SELECT s."trackId"
    FROM signals s
    JOIN tracks t ON t.id = s."trackId"
    WHERE t."isPublished" = true AND t."processingStatus" = 'READY'
    GROUP BY s."trackId", t."createdAt"
    ORDER BY SUM(s.w) DESC, t."createdAt" DESC
    LIMIT ${limit}
  `);

  return rows.map((r) => r.trackId);
}

/**
 * Cached because this aggregates across the whole platform's recent activity
 * — recomputing per page view would be wasteful and it only needs to feel
 * current, not be real-time. Only ids are cached (always serialisable); rows
 * are hydrated fresh so they reflect edits like a changed title or cover.
 */
const cachedTrendingIds = unstable_cache(rankTrendingIds, ["trending-track-ids"], {
  revalidate: 600,
  tags: ["trending"],
});

export const trendingService = {
  async tracks(limit = 12): Promise<TrendingResult> {
    const rankedIds = await cachedTrendingIds(limit);
    const organic = rankedIds.length >= Math.min(limit, 4);

    const ids = [...rankedIds];
    if (ids.length < limit) {
      const filler = await db.track.findMany({
        where: { isPublished: true, processingStatus: "READY", id: { notIn: ids } },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: limit - ids.length,
        select: { id: true },
      });
      ids.push(...filler.map((t) => t.id));
    }
    if (ids.length === 0) return { tracks: [], organic: false };

    const rows = await db.track.findMany({
      where: { id: { in: ids }, isPublished: true },
      include: TRACK_WITH_RELATIONS,
    });
    const byId = new Map(rows.map((t) => [t.id, t]));
    return { tracks: ids.map((id) => byId.get(id)).filter((t): t is TrendingTrack => !!t), organic };
  },

  /**
   * Creators gaining listeners recently. Falls back to the newest creators
   * with published work, so the section is useful on a young platform too.
   */
  async risingArtists(limit = 10) {
    const rows = await db.$queryRaw<{ artistId: string }[]>(Prisma.sql`
      SELECT t."artistId"
      FROM plays p
      JOIN tracks t ON t.id = p."trackId"
      WHERE p."countedAsPlay" AND p."createdAt" > NOW() - INTERVAL '${Prisma.raw(String(WINDOW_DAYS))} days'
        AND t."isPublished" = true
      GROUP BY t."artistId"
      ORDER BY COUNT(DISTINCT COALESCE(p."userId", p."sessionId")) DESC
      LIMIT ${limit}
    `);
    const ids = rows.map((r) => r.artistId);

    if (ids.length < limit) {
      const filler = await db.artist.findMany({
        where: { id: { notIn: ids }, tracks: { some: { isPublished: true } } },
        orderBy: { createdAt: "desc" },
        take: limit - ids.length,
        select: { id: true },
      });
      ids.push(...filler.map((a) => a.id));
    }

    const artists = await db.artist.findMany({ where: { id: { in: ids } } });
    const byId = new Map(artists.map((a) => [a.id, a]));
    return ids.map((id) => byId.get(id)).filter((a): a is NonNullable<typeof a> => !!a);
  },
};
