import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * Listening analytics for Creator Studio. Aggregates only: creators see how
 * many people listened and how, never who. Every query is scoped to the
 * artist ids passed in, which callers take from the signed-in user's own
 * profiles.
 */

export type Range = 7 | 30 | 90 | null;

/** Narrows a query to one track; always combined with the owned-artist filter, never instead of it. */
function onlyTrack(trackId?: string) {
  return trackId ? Prisma.sql`AND t.id = ${trackId}` : Prisma.empty;
}

function since(days: Range) {
  return days ? Prisma.sql`NOW() - INTERVAL '${Prisma.raw(String(days))} days'` : Prisma.sql`'epoch'::timestamp`;
}

export interface CreatorStats {
  plays: number;
  listeners: number;
  /** Share of started plays that reached the end, 0–1. */
  completionRate: number;
  likes: number;
  playlistAdds: number;
  downloads: number;
}

export async function getCreatorStats(artistIds: string[], days: Range, trackId?: string): Promise<CreatorStats> {
  const empty = { plays: 0, listeners: 0, completionRate: 0, likes: 0, playlistAdds: 0, downloads: 0 };
  if (artistIds.length === 0) return empty;
  const ids = Prisma.join(artistIds);
  const from = since(days);
  const one = onlyTrack(trackId);

  const [row] = await db.$queryRaw<
    { plays: number; listeners: number; started: number; completed: number; likes: number; adds: number; downloads: number }[]
  >(Prisma.sql`
    SELECT
      (SELECT COUNT(*)::int FROM plays p JOIN tracks t ON t.id = p."trackId"
        WHERE t."artistId" IN (${ids}) ${one} AND p."countedAsPlay" AND p."createdAt" > ${from}) AS plays,
      (SELECT COUNT(DISTINCT COALESCE(p."userId", p."sessionId"))::int FROM plays p JOIN tracks t ON t.id = p."trackId"
        WHERE t."artistId" IN (${ids}) ${one} AND p."countedAsPlay" AND p."createdAt" > ${from}) AS listeners,
      (SELECT COUNT(*)::int FROM plays p JOIN tracks t ON t.id = p."trackId"
        WHERE t."artistId" IN (${ids}) ${one} AND p."createdAt" > ${from}) AS started,
      (SELECT COUNT(*)::int FROM plays p JOIN tracks t ON t.id = p."trackId"
        WHERE t."artistId" IN (${ids}) ${one} AND p.completed AND p."createdAt" > ${from}) AS completed,
      (SELECT COUNT(*)::int FROM favorites f JOIN tracks t ON t.id = f."trackId"
        WHERE t."artistId" IN (${ids}) ${one} AND f."createdAt" > ${from}) AS likes,
      (SELECT COUNT(*)::int FROM playlist_tracks pt JOIN tracks t ON t.id = pt."trackId"
        WHERE t."artistId" IN (${ids}) ${one} AND pt."addedAt" > ${from}) AS adds,
      (SELECT COUNT(*)::int FROM downloads d JOIN tracks t ON t.id = d."trackId"
        WHERE t."artistId" IN (${ids}) ${one} AND d."createdAt" > ${from}) AS downloads
  `);

  return {
    plays: row.plays,
    listeners: row.listeners,
    completionRate: row.started > 0 ? row.completed / row.started : 0,
    likes: row.likes,
    playlistAdds: row.adds,
    downloads: row.downloads,
  };
}

export async function getTopTracks(artistIds: string[], days: Range, limit = 10) {
  if (artistIds.length === 0) return [];
  const rows = await db.$queryRaw<{ id: string; plays: number; listeners: number }[]>(Prisma.sql`
    SELECT t.id,
           COUNT(p.id) FILTER (WHERE p."countedAsPlay")::int AS plays,
           COUNT(DISTINCT COALESCE(p."userId", p."sessionId")) FILTER (WHERE p."countedAsPlay")::int AS listeners
      FROM tracks t
      LEFT JOIN plays p ON p."trackId" = t.id AND p."createdAt" > ${since(days)}
     WHERE t."artistId" IN (${Prisma.join(artistIds)}) AND t."isPublished" = true
     GROUP BY t.id
     ORDER BY plays DESC, t."createdAt" DESC
     LIMIT ${limit}
  `);
  if (rows.length === 0) return [];
  const tracks = await db.track.findMany({ where: { id: { in: rows.map((r) => r.id) } }, include: { artist: true, album: true } });
  const byId = new Map(tracks.map((t) => [t.id, t]));
  return rows.flatMap((r) => {
    const track = byId.get(r.id);
    return track ? [{ track, plays: r.plays, listeners: r.listeners }] : [];
  });
}

/** Plays and listeners per day, zero-filled so quiet days still appear on the chart. */
export async function getDailyTrend(artistIds: string[], days: 7 | 30 | 90, trackId?: string) {
  if (artistIds.length === 0) return [];
  const rows = await db.$queryRaw<{ day: Date; plays: number; listeners: number }[]>(Prisma.sql`
    SELECT d.day::date AS day,
           COUNT(p.id)::int AS plays,
           COUNT(DISTINCT COALESCE(p."userId", p."sessionId"))::int AS listeners
      FROM generate_series((NOW() - INTERVAL '${Prisma.raw(String(days - 1))} days')::date, NOW()::date, INTERVAL '1 day') AS d(day)
      LEFT JOIN (
        SELECT p.* FROM plays p JOIN tracks t ON t.id = p."trackId"
         WHERE t."artistId" IN (${Prisma.join(artistIds)}) ${onlyTrack(trackId)} AND p."countedAsPlay"
      ) p ON p."createdAt"::date = d.day::date
     GROUP BY d.day
     ORDER BY d.day
  `);
  return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), plays: r.plays, listeners: r.listeners }));
}
