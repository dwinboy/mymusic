import { db } from "@/lib/db";
import { Prisma, type EnergyLevel, type TaxonomyKind } from "@/lib/generated/prisma/client";
import { resolveImageUrl, type ImageSize } from "@/lib/media/image-service";

/**
 * Single query path for the discovery taxonomy. Pages and API routes read
 * terms and term-filtered tracks through here rather than composing Prisma
 * queries inline, so filtering behaves identically on every discovery surface.
 */

export type { TaxonomyKind };

/**
 * Kinds that get their own public discovery pages. Instruments, languages,
 * vocal characteristics and tags are filter dimensions only — giving each a
 * page would mean hundreds of thin, near-empty SEO pages.
 */
export const BROWSABLE_KINDS = ["GENRE", "MOOD", "ACTIVITY", "OCCASION"] as const;
export type BrowsableKind = (typeof BROWSABLE_KINDS)[number];

const ROUTE_SEGMENT: Record<BrowsableKind, string> = {
  GENRE: "genre",
  MOOD: "mood",
  ACTIVITY: "activity",
  OCCASION: "occasion",
};

const INDEX_SEGMENT: Record<BrowsableKind, string> = {
  GENRE: "genres",
  MOOD: "moods",
  ACTIVITY: "activities",
  OCCASION: "occasions",
};

export function isBrowsableKind(kind: TaxonomyKind): kind is BrowsableKind {
  return (BROWSABLE_KINDS as readonly string[]).includes(kind);
}

export function termHref(kind: TaxonomyKind, slug: string): string | null {
  return isBrowsableKind(kind) ? `/${ROUTE_SEGMENT[kind]}/${slug}` : null;
}

export function kindIndexHref(kind: BrowsableKind): string {
  return `/${INDEX_SEGMENT[kind]}`;
}

export function kindFromSegment(segment: string): BrowsableKind | null {
  const match = (Object.entries(ROUTE_SEGMENT) as [BrowsableKind, string][]).find(([, s]) => s === segment);
  return match ? match[0] : null;
}

export const TERM_SELECT = {
  id: true,
  kind: true,
  name: true,
  slug: true,
  description: true,
  imageUrl: true,
  imagePublicId: true,
  parentId: true,
  displayOrder: true,
  isFeatured: true,
} satisfies Prisma.TaxonomyTermSelect;

export type Term = Prisma.TaxonomyTermGetPayload<{ select: typeof TERM_SELECT }>;

/** Active terms of a kind, in admin-defined order. Top level only by default. */
export async function getTerms(
  kind: TaxonomyKind,
  opts: { featuredOnly?: boolean; includeChildren?: boolean } = {}
): Promise<Term[]> {
  return db.taxonomyTerm.findMany({
    where: {
      kind,
      isActive: true,
      ...(opts.featuredOnly ? { isFeatured: true } : {}),
      ...(opts.includeChildren ? {} : { parentId: null }),
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: TERM_SELECT,
  });
}

export interface TermNode extends Term {
  children: TermNode[];
}

/**
 * A term plus its active descendants, for pages like /occasion/wedding whose
 * sections are sub-terms. Fetches the whole kind once and assembles the tree
 * in memory rather than issuing a query per level.
 */
export async function getTermTree(kind: TaxonomyKind, slug: string): Promise<TermNode | null> {
  const all = await db.taxonomyTerm.findMany({
    where: { kind, isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: TERM_SELECT,
  });

  const byParent = new Map<string | null, Term[]>();
  for (const term of all) {
    const list = byParent.get(term.parentId) ?? [];
    list.push(term);
    byParent.set(term.parentId, list);
  }

  const build = (term: Term): TermNode => ({
    ...term,
    children: (byParent.get(term.id) ?? []).map(build),
  });

  const root = all.find((t) => t.slug === slug);
  return root ? build(root) : null;
}

/** Every term id in a subtree — so "Wedding" also matches tracks tagged "First Dance". */
export function subtreeIds(node: TermNode): string[] {
  return [node.id, ...node.children.flatMap(subtreeIds)];
}

export type GroupedTerms = Partial<Record<TaxonomyKind, (Term & { isPrimary: boolean })[]>>;

export async function getTrackTerms(trackId: string): Promise<GroupedTerms> {
  const rows = await db.trackTerm.findMany({
    where: { trackId, term: { isActive: true } },
    select: { isPrimary: true, term: { select: TERM_SELECT } },
    orderBy: [{ isPrimary: "desc" }, { term: { displayOrder: "asc" } }],
  });

  const grouped: GroupedTerms = {};
  for (const row of rows) {
    (grouped[row.term.kind] ??= []).push({ ...row.term, isPrimary: row.isPrimary });
  }
  return grouped;
}

/**
 * Real artwork for term cards. An admin-assigned image wins; otherwise the
 * cover of the most-played published track carrying the term (falling back
 * to that track's album cover). Terms with no artwork anywhere are simply
 * absent from the map — the card renders typographically rather than with a
 * generated gradient.
 *
 * One query regardless of how many terms: DISTINCT ON picks the top track per
 * term inside Postgres instead of fetching every tagged track and discarding
 * all but one.
 */
export async function getTermArtwork(terms: Term[], size: ImageSize = "medium"): Promise<Map<string, string>> {
  const artwork = new Map<string, string>();
  const needFallback: string[] = [];

  for (const term of terms) {
    const own = resolveImageUrl({ publicId: term.imagePublicId, fallbackUrl: term.imageUrl }, size);
    if (own) artwork.set(term.id, own);
    else needFallback.push(term.id);
  }
  if (needFallback.length === 0) return artwork;

  const rows = await db.$queryRaw<
    { termId: string; trackPublicId: string | null; trackUrl: string | null; albumPublicId: string | null; albumUrl: string | null }[]
  >(Prisma.sql`
    WITH RECURSIVE subtree AS (
      -- Each requested term plus its descendants, so a parent with music only
      -- in its sub-terms (Wedding via First Dance) still gets real artwork.
      SELECT id AS root_id, id AS term_id FROM taxonomy_terms WHERE id IN (${Prisma.join(needFallback)})
      UNION ALL
      SELECT s.root_id, child.id FROM subtree s JOIN taxonomy_terms child ON child."parentId" = s.term_id
    )
    SELECT DISTINCT ON (s.root_id)
      s.root_id              AS "termId",
      t."coverImagePublicId" AS "trackPublicId",
      t."coverUrl"           AS "trackUrl",
      a."coverImagePublicId" AS "albumPublicId",
      a."coverUrl"           AS "albumUrl"
    FROM subtree s
    JOIN track_terms tt ON tt."termId" = s.term_id
    JOIN tracks t ON t.id = tt."trackId"
    LEFT JOIN albums a ON a.id = t."albumId"
    WHERE t."isPublished" = true
      AND t."processingStatus" = 'READY'
      AND COALESCE(t."coverImagePublicId", t."coverUrl", a."coverImagePublicId", a."coverUrl") IS NOT NULL
    ORDER BY s.root_id, t."playCount" DESC, t."createdAt" DESC
  `);

  for (const row of rows) {
    const url = resolveImageUrl(
      { publicId: row.trackPublicId ?? row.albumPublicId, fallbackUrl: row.trackUrl ?? row.albumUrl },
      size
    );
    if (url) artwork.set(row.termId, url);
  }
  return artwork;
}

/**
 * Maps every term of a kind to itself and all of its ancestors. A track tagged
 * "First Dance" belongs to Reception and to Wedding as well, so both counts
 * and artwork roll up the hierarchy through this.
 */
function lineageCte(kind: TaxonomyKind) {
  return Prisma.sql`
    WITH RECURSIVE lineage AS (
      SELECT id AS term_id, id AS ancestor_id, "parentId" AS next_parent
        FROM taxonomy_terms
       WHERE kind = ${kind}::"TaxonomyKind"
      UNION ALL
      SELECT l.term_id, parent.id, parent."parentId"
        FROM lineage l
        JOIN taxonomy_terms parent ON parent.id = l.next_parent
    )
  `;
}

/**
 * Published track counts per term, including everything in the term's
 * subtree. DISTINCT matters: a track tagged both "First Dance" and
 * "Afrobeat Wedding" is one wedding track, not two.
 */
export async function countTracksPerTerm(kind: TaxonomyKind): Promise<Map<string, number>> {
  const rows = await db.$queryRaw<{ termId: string; count: number }[]>(Prisma.sql`
    ${lineageCte(kind)}
    SELECT l.ancestor_id AS "termId", COUNT(DISTINCT tt."trackId")::int AS count
      FROM lineage l
      JOIN track_terms tt ON tt."termId" = l.term_id
      JOIN tracks tr ON tr.id = tt."trackId"
     WHERE tr."isPublished" = true AND tr."processingStatus" = 'READY'
     GROUP BY l.ancestor_id
  `);
  return new Map(rows.map((r) => [r.termId, r.count]));
}

export interface Intersection {
  term: Term;
  trackCount: number;
}

/**
 * The terms of *other* kinds that co-occur most often with a term — what
 * turns "Calm" into "Calm Ambient", "Calm Piano", "Calm Instrumentals" without
 * anyone curating those combinations by hand. Only intersections with enough
 * tracks to fill a row are returned.
 */
export async function getIntersections(
  subtreeTermIds: string[],
  kind: TaxonomyKind,
  opts: { limit?: number; minTracks?: number; kinds?: TaxonomyKind[]; baseTrackCount?: number } = {}
): Promise<Intersection[]> {
  if (subtreeTermIds.length === 0) return [];
  const limit = opts.limit ?? 4;

  // Pairing two situational kinds ("Wedding · Workout") describes nothing a
  // listener would browse for, so activities and occasions only intersect
  // with what the music sounds and feels like.
  const situational: TaxonomyKind[] = ["ACTIVITY", "OCCASION"];
  const defaultKinds: TaxonomyKind[] = situational.includes(kind)
    ? ["GENRE", "MOOD", "VOCAL", "INSTRUMENT"]
    : ["GENRE", "MOOD", "VOCAL", "INSTRUMENT", "ACTIVITY"];
  const kinds = (opts.kinds ?? defaultKinds).filter((k) => k !== kind);
  if (kinds.length === 0) return [];

  const rows = await db.$queryRaw<(Term & { trackCount: number })[]>(Prisma.sql`
    SELECT other.id, other.kind, other.name, other.slug, other.description,
           other."imageUrl", other."imagePublicId", other."parentId",
           other."displayOrder", other."isFeatured",
           COUNT(DISTINCT base."trackId")::int AS "trackCount"
      FROM track_terms base
      JOIN track_terms co ON co."trackId" = base."trackId"
      JOIN taxonomy_terms other ON other.id = co."termId"
      JOIN tracks t ON t.id = base."trackId"
     WHERE base."termId" IN (${Prisma.join(subtreeTermIds)})
       AND other.kind IN (${Prisma.join(kinds.map((k) => Prisma.sql`${k}::"TaxonomyKind"`))})
       AND other."isActive" = true
       AND t."isPublished" = true AND t."processingStatus" = 'READY'
     GROUP BY other.id
    HAVING COUNT(DISTINCT base."trackId") >= ${opts.minTracks ?? 2}
     ORDER BY "trackCount" DESC, other."displayOrder" ASC
     LIMIT ${limit * 4}
  `);

  const picked: Intersection[] = [];
  for (const { trackCount, ...term } of rows) {
    // An intersection covering every track in the base narrows nothing —
    // "Wedding Instrumentals" is just "Wedding" again if all wedding music
    // is instrumental.
    if (opts.baseTrackCount !== undefined && trackCount >= opts.baseTrackCount) continue;
    // A term and its own parent or child ("Sleep" and "Deep Sleep") would be
    // two near-identical rows.
    const related = picked.some((p) => p.term.id === term.parentId || p.term.parentId === term.id);
    if (related) continue;
    picked.push({ term, trackCount });
    if (picked.length === limit) break;
  }
  return picked;
}

/** Readable name for a pairing: "Calm Ambient", "Calm Instrumentals", "Ambient for Sleep". */
export function intersectionTitle(base: { kind: TaxonomyKind; name: string }, other: { kind: TaxonomyKind; name: string; slug?: string }) {
  if (other.kind === "VOCAL" && other.slug === "instrumental") return `${base.name} Instrumentals`;
  if (base.kind === "MOOD") return `${base.name} ${other.name}`;
  if (other.kind === "MOOD") return `${other.name} ${base.name}`;
  if ((base.kind === "ACTIVITY" || base.kind === "OCCASION") && other.kind === "GENRE") return `${other.name} for ${base.name}`;
  if ((other.kind === "ACTIVITY" || other.kind === "OCCASION") && base.kind === "GENRE") return `${base.name} for ${other.name}`;
  return `${base.name} · ${other.name}`;
}

/** Most-represented creators within a term, for "related creators" rows. */
export async function getTopArtistsForTerms(subtreeTermIds: string[], limit = 10) {
  if (subtreeTermIds.length === 0) return [];
  const rows = await db.$queryRaw<{ artistId: string }[]>(Prisma.sql`
    SELECT t."artistId"
      FROM track_terms tt
      JOIN tracks t ON t.id = tt."trackId"
     WHERE tt."termId" IN (${Prisma.join(subtreeTermIds)})
       AND t."isPublished" = true AND t."processingStatus" = 'READY'
     GROUP BY t."artistId"
     ORDER BY COUNT(DISTINCT t.id) DESC, SUM(t."playCount") DESC
     LIMIT ${limit}
  `);
  const ids = rows.map((r) => r.artistId);
  if (ids.length === 0) return [];
  const artists = await db.artist.findMany({ where: { id: { in: ids } } });
  const byId = new Map(artists.map((a) => [a.id, a]));
  return ids.map((id) => byId.get(id)).filter((a): a is NonNullable<typeof a> => !!a);
}

// ---------------------------------------------------------------------------
// Track discovery query
// ---------------------------------------------------------------------------

export type TrackSort = "newest" | "popular" | "recommended";

export interface TrackFilter {
  /** Track must carry every one of these (intersection: Calm AND Piano). */
  allTermIds?: string[];
  /**
   * Groups of alternatives, each of which must be satisfied (Wedding-or-any-
   * of-its-sub-occasions AND Romantic). Each inner array is an OR.
   */
  anyOfGroups?: string[][];
  energy?: EnergyLevel[];
  maxDurationSec?: number;
  minDurationSec?: number;
  artistId?: string;
  excludeTrackIds?: string[];
  query?: string;
}

export function buildTrackWhere(filter: TrackFilter): Prisma.TrackWhereInput {
  const and: Prisma.TrackWhereInput[] = [];

  // Each `some` compiles to an EXISTS against track_terms, served by the
  // (trackId, termId) primary key — no row multiplication, no DISTINCT.
  for (const termId of filter.allTermIds ?? []) {
    and.push({ terms: { some: { termId } } });
  }
  for (const group of filter.anyOfGroups ?? []) {
    if (group.length > 0) and.push({ terms: { some: { termId: { in: group } } } });
  }
  if (filter.energy?.length) and.push({ energy: { in: filter.energy } });
  if (filter.minDurationSec) and.push({ duration: { gte: filter.minDurationSec } });
  if (filter.maxDurationSec) and.push({ duration: { lte: filter.maxDurationSec } });
  if (filter.artistId) and.push({ artistId: filter.artistId });
  if (filter.excludeTrackIds?.length) and.push({ id: { notIn: filter.excludeTrackIds } });
  if (filter.query?.trim()) {
    const q = filter.query.trim();
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { artist: { name: { contains: q, mode: "insensitive" } } },
        { album: { title: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  return { isPublished: true, processingStatus: "READY", AND: and };
}

function orderFor(sort: TrackSort): Prisma.TrackOrderByWithRelationInput[] {
  // `id` is the tiebreaker in every ordering so cursor pagination is stable
  // even when many tracks share a play count or timestamp.
  switch (sort) {
    case "popular":
      return [{ playCount: "desc" }, { id: "desc" }];
    case "recommended":
      return [{ isFeatured: "desc" }, { playCount: "desc" }, { createdAt: "desc" }, { id: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

export const TRACK_WITH_RELATIONS = { artist: true, album: true } satisfies Prisma.TrackInclude;

/**
 * Cursor-paginated published tracks. Never returns the whole catalogue: the
 * caller gets one page plus an opaque cursor for the next.
 */
export async function findTracks(
  filter: TrackFilter,
  opts: { sort?: TrackSort; limit?: number; cursor?: string | null } = {}
) {
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);
  const rows = await db.track.findMany({
    where: buildTrackWhere(filter),
    orderBy: orderFor(opts.sort ?? "newest"),
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: TRACK_WITH_RELATIONS,
  });

  const hasMore = rows.length > limit;
  const tracks = hasMore ? rows.slice(0, limit) : rows;
  return { tracks, nextCursor: hasMore ? tracks[tracks.length - 1].id : null };
}

/**
 * Replaces a track's terms of one kind. Scoped per kind so saving moods never
 * touches genres. Inactive or unknown term ids are dropped rather than
 * trusted, since they come from the client.
 */
export async function setTrackTermsForKind(
  tx: Prisma.TransactionClient,
  trackId: string,
  kind: TaxonomyKind,
  termIds: string[],
  primaryTermId?: string | null
) {
  const valid = await tx.taxonomyTerm.findMany({
    where: { id: { in: [...new Set(termIds)] }, kind, isActive: true },
    select: { id: true },
  });
  const validIds = valid.map((t) => t.id);

  await tx.trackTerm.deleteMany({ where: { trackId, term: { kind } } });
  if (validIds.length === 0) return;

  const primary = primaryTermId && validIds.includes(primaryTermId) ? primaryTermId : validIds[0];
  await tx.trackTerm.createMany({
    data: validIds.map((termId) => ({ trackId, termId, isPrimary: kind === "GENRE" && termId === primary })),
  });
}
