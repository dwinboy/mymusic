import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { PUBLIC_ALBUM_WHERE, PUBLIC_ARTIST_WHERE, PUBLIC_PLAYLIST_WHERE, PUBLIC_TRACK_WHERE } from "@/lib/public-scope";

/**
 * Queries behind the catalogue pages: /albums, /artists and /playlists.
 * Sections are small fixed-size lists; the full, filterable lists are
 * cursor-paginated so a large catalogue is never loaded at once.
 */

const ALBUM_INCLUDE = { artist: { select: { name: true, slug: true } } } as const;

function hydrateInOrder<T extends { id: string }>(ids: string[], rows: T[]) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is T => !!r);
}

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

export const albumCatalog = {
  featured(limit = 12) {
    return db.album.findMany({
      where: { ...PUBLIC_ALBUM_WHERE, isFeatured: true },
      orderBy: [{ releaseDate: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      take: limit,
      include: ALBUM_INCLUDE,
    });
  },

  newReleases(limit = 12) {
    return db.album.findMany({
      where: PUBLIC_ALBUM_WHERE,
      orderBy: [{ releaseDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }],
      take: limit,
      include: ALBUM_INCLUDE,
    });
  },

  /** Most listened to, by counted plays across the album's public tracks. */
  async popular(limit = 12) {
    const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT a.id
        FROM albums a
        JOIN tracks t ON t."albumId" = a.id AND t."isPublished" = true AND t."processingStatus" = 'READY'
       WHERE a."isPublished" = true
       GROUP BY a.id
      HAVING SUM(t."playCount") > 0
       ORDER BY SUM(t."playCount") DESC, a.id DESC
       LIMIT ${limit}
    `);
    const ids = rows.map((r) => r.id);
    return hydrateInOrder(ids, await db.album.findMany({ where: { id: { in: ids } }, include: ALBUM_INCLUDE }));
  },

  /**
   * The filterable list. Genre matches albums with a public track in that
   * genre (or any sub-genre); year is the release year; creator is a slug.
   */
  async list(opts: { genreTermIds?: string[]; year?: number; creatorSlug?: string; cursor?: string | null; limit?: number }) {
    const limit = Math.min(Math.max(opts.limit ?? 24, 1), 60);
    const where: Prisma.AlbumWhereInput = {
      ...PUBLIC_ALBUM_WHERE,
      ...(opts.genreTermIds?.length
        ? { tracks: { some: { ...PUBLIC_TRACK_WHERE, terms: { some: { termId: { in: opts.genreTermIds } } } } } }
        : {}),
      ...(opts.year
        ? { releaseDate: { gte: new Date(Date.UTC(opts.year, 0, 1)), lt: new Date(Date.UTC(opts.year + 1, 0, 1)) } }
        : {}),
      ...(opts.creatorSlug ? { artist: { slug: opts.creatorSlug } } : {}),
    };
    const rows = await db.album.findMany({
      where,
      orderBy: [{ releaseDate: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: ALBUM_INCLUDE,
    });
    const hasMore = rows.length > limit;
    const albums = hasMore ? rows.slice(0, limit) : rows;
    const total = opts.cursor ? null : await db.album.count({ where });
    return { albums, nextCursor: hasMore ? albums[albums.length - 1].id : null, total };
  },

  async years() {
    const rows = await db.$queryRaw<{ year: number }[]>(Prisma.sql`
      SELECT DISTINCT EXTRACT(YEAR FROM a."releaseDate")::int AS year
        FROM albums a
       WHERE a."isPublished" = true AND a."releaseDate" IS NOT NULL
         AND EXISTS (SELECT 1 FROM tracks t WHERE t."albumId" = a.id AND t."isPublished" = true AND t."processingStatus" = 'READY')
       ORDER BY year DESC
    `);
    return rows.map((r) => r.year);
  },

  creators() {
    return db.artist.findMany({
      where: { albums: { some: PUBLIC_ALBUM_WHERE } },
      orderBy: { name: "asc" },
      take: 300,
      select: { name: true, slug: true },
    });
  },
};

// ---------------------------------------------------------------------------
// Creators
// ---------------------------------------------------------------------------

const ARTIST_SELECT = { id: true, name: true, slug: true, avatarUrl: true, avatarImagePublicId: true } as const;

export const creatorCatalog = {
  featured(limit = 12) {
    return db.artist.findMany({
      where: { ...PUBLIC_ARTIST_WHERE, isFeatured: true },
      orderBy: { name: "asc" },
      take: limit,
      select: ARTIST_SELECT,
    });
  },

  /**
   * Gaining listeners in the last week. No filler: if nobody has momentum,
   * the section isn't shown rather than relabelling other creators as rising.
   */
  async rising(limit = 12) {
    const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT t."artistId" AS id
        FROM plays p
        JOIN tracks t ON t.id = p."trackId" AND t."isPublished" = true AND t."processingStatus" = 'READY'
       WHERE p."countedAsPlay" AND p."createdAt" > NOW() - INTERVAL '7 days'
       GROUP BY t."artistId"
       ORDER BY COUNT(DISTINCT COALESCE(p."userId", p."sessionId")) DESC, t."artistId"
       LIMIT ${limit}
    `);
    const ids = rows.map((r) => r.id);
    return hydrateInOrder(ids, await db.artist.findMany({ where: { id: { in: ids } }, select: ARTIST_SELECT }));
  },

  /** All-time counted plays across public tracks. */
  async popular(limit = 12) {
    const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT t."artistId" AS id
        FROM tracks t
       WHERE t."isPublished" = true AND t."processingStatus" = 'READY'
       GROUP BY t."artistId"
      HAVING SUM(t."playCount") > 0
       ORDER BY SUM(t."playCount") DESC, t."artistId"
       LIMIT ${limit}
    `);
    const ids = rows.map((r) => r.id);
    return hydrateInOrder(ids, await db.artist.findMany({ where: { id: { in: ids } }, select: ARTIST_SELECT }));
  },

  /**
   * Creators whose first public track appeared in the last 60 days, newest
   * first. Empty when nobody is new, so the section never relabels
   * long-standing creators as new.
   */
  async newest(limit = 12) {
    const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT t."artistId" AS id
        FROM tracks t
       WHERE t."isPublished" = true AND t."processingStatus" = 'READY'
       GROUP BY t."artistId"
      HAVING MIN(t."createdAt") > NOW() - INTERVAL '60 days'
       ORDER BY MIN(t."createdAt") DESC, t."artistId"
       LIMIT ${limit}
    `);
    const ids = rows.map((r) => r.id);
    return hydrateInOrder(ids, await db.artist.findMany({ where: { id: { in: ids } }, select: ARTIST_SELECT }));
  },

  /** Everyone, A–Z, with their public track count. */
  async list(opts: { cursor?: string | null; limit?: number } = {}) {
    const limit = Math.min(Math.max(opts.limit ?? 36, 1), 90);
    const rows = await db.artist.findMany({
      where: PUBLIC_ARTIST_WHERE,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: { ...ARTIST_SELECT, _count: { select: { tracks: { where: PUBLIC_TRACK_WHERE } } } },
    });
    const hasMore = rows.length > limit;
    const artists = hasMore ? rows.slice(0, limit) : rows;
    const total = opts.cursor ? null : await db.artist.count({ where: PUBLIC_ARTIST_WHERE });
    return { artists, nextCursor: hasMore ? artists[artists.length - 1].id : null, total };
  },
};

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------

const PLAYLIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  coverUrl: true,
  coverImagePublicId: true,
  kind: true,
  isFeatured: true,
  user: { select: { name: true } },
  _count: { select: { tracks: true } },
} as const;

export const playlistCatalog = {
  /** Made by the platform: featured first. */
  editorial(limit = 12) {
    return db.playlist.findMany({
      where: { ...PUBLIC_PLAYLIST_WHERE, kind: "EDITORIAL" },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: limit,
      select: PLAYLIST_SELECT,
    });
  },

  collections(limit = 12) {
    return db.playlist.findMany({
      where: { ...PUBLIC_PLAYLIST_WHERE, kind: "ALGORITHMIC" },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: limit,
      select: PLAYLIST_SELECT,
    });
  },

  /** Listeners' public playlists that actually have something in them. */
  async community(opts: { cursor?: string | null; limit?: number } = {}) {
    const limit = Math.min(Math.max(opts.limit ?? 24, 1), 60);
    const rows = await db.playlist.findMany({
      where: { ...PUBLIC_PLAYLIST_WHERE, kind: "USER", tracks: { some: { track: PUBLIC_TRACK_WHERE } } },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: PLAYLIST_SELECT,
    });
    const hasMore = rows.length > limit;
    const playlists = hasMore ? rows.slice(0, limit) : rows;
    return { playlists, nextCursor: hasMore ? playlists[playlists.length - 1].id : null };
  },
};
