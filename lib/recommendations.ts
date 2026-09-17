import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { TRACK_WITH_RELATIONS } from "@/lib/taxonomy";

/**
 * Recommendations sit behind an interface so the metadata implementation can
 * be swapped for a behavioural or embedding-based model later without
 * touching any page that shows "You May Also Like".
 */
export interface RecommendationService {
  similarTracks(trackId: string, opts?: SimilarTracksOptions): Promise<RecommendedTrack[]>;
  /**
   * "Because you listen to Ambient": the listener's dominant genre from recent
   * history, with tracks from it they haven't heard. Null when there isn't
   * enough history to say anything honest.
   */
  becauseYouListen(userId: string, opts?: { limit?: number }): Promise<{ genreName: string; genreSlug: string; tracks: RecommendedTrack[] } | null>;
}

export type RecommendedTrack = Prisma.TrackGetPayload<{ include: typeof TRACK_WITH_RELATIONS }>;

export interface SimilarTracksOptions {
  limit?: number;
  excludeArtistId?: string;
  /** Tracks to leave out, e.g. what a radio station has just played. */
  excludeIds?: string[];
}

/**
 * How much a shared term of each kind says about two tracks being alike.
 * Genre is the strongest signal; a shared language or loose tag is weak.
 */
const KIND_WEIGHT = {
  GENRE: 3,
  MOOD: 2,
  ACTIVITY: 2,
  OCCASION: 1.5,
  VOCAL: 1,
  INSTRUMENT: 1,
  TAG: 0.5,
  LANGUAGE: 0.5,
} as const;

const ENERGY_ORDER = ["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"];

class MetadataRecommendationService implements RecommendationService {
  async similarTracks(trackId: string, opts: SimilarTracksOptions = {}) {
    const limit = opts.limit ?? 12;
    const excluded = [trackId, ...(opts.excludeIds ?? [])];
    const source = await db.track.findUnique({
      where: { id: trackId },
      select: { energy: true, terms: { select: { termId: true } } },
    });
    if (!source) return [];

    const termIds = source.terms.map((t) => t.termId);
    const sourceEnergy = source.energy ? ENERGY_ORDER.indexOf(source.energy) : -1;

    let rankedIds: string[] = [];

    if (termIds.length > 0) {
      // Scored in Postgres: work scales with how many tracks share this
      // track's terms, not with catalogue size, and only ids come back.
      const weightCase = Prisma.raw(
        `CASE term.kind ${Object.entries(KIND_WEIGHT)
          .map(([kind, weight]) => `WHEN '${kind}' THEN ${weight}`)
          .join(" ")} ELSE 0 END`
      );
      const energyBonus =
        sourceEnergy >= 0
          ? Prisma.sql`
              + MAX(CASE
                  WHEN t.energy IS NULL THEN 0
                  WHEN ABS(array_position(ARRAY['VERY_LOW','LOW','MEDIUM','HIGH','VERY_HIGH']::text[], t.energy::text) - 1 - ${sourceEnergy}) = 0 THEN 1.5
                  WHEN ABS(array_position(ARRAY['VERY_LOW','LOW','MEDIUM','HIGH','VERY_HIGH']::text[], t.energy::text) - 1 - ${sourceEnergy}) = 1 THEN 0.5
                  ELSE 0
                END)`
          : Prisma.empty;

      const rows = await db.$queryRaw<{ trackId: string }[]>(Prisma.sql`
        SELECT tt."trackId"
        FROM track_terms tt
        JOIN taxonomy_terms term ON term.id = tt."termId"
        JOIN tracks t ON t.id = tt."trackId"
        WHERE tt."termId" IN (${Prisma.join(termIds)})
          AND tt."trackId" NOT IN (${Prisma.join(excluded)})
          AND t."isPublished" = true
          AND t."processingStatus" = 'READY'
          ${opts.excludeArtistId ? Prisma.sql`AND t."artistId" <> ${opts.excludeArtistId}` : Prisma.empty}
        GROUP BY tt."trackId", t."playCount"
        ORDER BY (SUM(${weightCase}) ${energyBonus}) DESC, t."playCount" DESC
        LIMIT ${limit}
      `);
      rankedIds = rows.map((r) => r.trackId);
    }

    // Never a dead end: a lightly-tagged track still gets suggestions, topped
    // up from what's popular so the section doesn't come back half empty.
    if (rankedIds.length < limit) {
      const filler = await db.track.findMany({
        where: {
          isPublished: true,
          processingStatus: "READY",
          id: { notIn: [...excluded, ...rankedIds] },
          ...(opts.excludeArtistId ? { artistId: { not: opts.excludeArtistId } } : {}),
        },
        orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
        take: limit - rankedIds.length,
        select: { id: true },
      });
      rankedIds.push(...filler.map((t) => t.id));
    }

    if (rankedIds.length === 0) return [];

    const tracks = await db.track.findMany({ where: { id: { in: rankedIds } }, include: TRACK_WITH_RELATIONS });
    const byId = new Map(tracks.map((t) => [t.id, t]));
    return rankedIds.map((id) => byId.get(id)).filter((t): t is RecommendedTrack => !!t);
  }

  async becauseYouListen(userId: string, opts: { limit?: number } = {}) {
    const limit = opts.limit ?? 12;
    const recent = await db.listeningHistory.findMany({
      where: { userId },
      orderBy: { playedAt: "desc" },
      take: 100,
      select: { trackId: true },
    });
    const heard = [...new Set(recent.map((r) => r.trackId))];
    // A couple of plays isn't a taste; don't pretend to know one.
    if (heard.length < 3) return null;

    const genreCounts = await db.trackTerm.groupBy({
      by: ["termId"],
      where: { trackId: { in: heard }, term: { kind: "GENRE", isActive: true } },
      _count: { _all: true },
      orderBy: { _count: { termId: "desc" } },
      take: 1,
    });
    const top = genreCounts[0];
    if (!top) return null;

    const [genre, tracks] = await Promise.all([
      db.taxonomyTerm.findUnique({ where: { id: top.termId }, select: { name: true, slug: true } }),
      db.track.findMany({
        where: {
          isPublished: true,
          processingStatus: "READY",
          id: { notIn: heard },
          terms: { some: { termId: top.termId } },
        },
        orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
        take: limit,
        include: TRACK_WITH_RELATIONS,
      }),
    ]);

    // Too few unheard tracks makes a thin, repetitive row.
    if (!genre || tracks.length < 4) return null;
    return { genreName: genre.name, genreSlug: genre.slug, tracks };
  }
}

export const recommendationService: RecommendationService = new MetadataRecommendationService();
