import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recommendationService } from "@/lib/recommendations";
import { toPlayerTrack } from "@/lib/mappers";
import { PUBLIC_TRACK_WHERE } from "@/lib/public-scope";

const MAX_PER_ARTIST = 2;

/**
 * Songs for a radio station built from a seed track.
 *
 *   GET /api/radio?seed=<trackId>&exclude=<id,id,…>&limit=15
 *
 * The client passes what it has just played as `exclude` and re-seeds from
 * the current track as the station goes on, so it drifts the way radio does
 * rather than looping one list. Within a batch no creator appears more than
 * twice. A small catalogue can run out of unheard songs; the station then
 * repeats older ones instead of going silent.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const seedId = params.get("seed") ?? "";
  const limit = Math.min(Math.max(Number(params.get("limit")) || 15, 1), 30);
  const exclude = (params.get("exclude") ?? "").split(",").filter(Boolean).slice(0, 50);

  const seed = await db.track.findFirst({ where: { id: seedId, ...PUBLIC_TRACK_WHERE }, select: { id: true } });
  if (!seed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch extra so the per-creator cap still leaves a full batch.
  let candidates = await recommendationService.similarTracks(seed.id, { limit: limit * 2, excludeIds: exclude });
  if (candidates.length < Math.min(3, limit)) {
    candidates = await recommendationService.similarTracks(seed.id, { limit: limit * 2 });
  }

  const perArtist = new Map<string, number>();
  const picked = candidates.filter((track) => {
    const count = perArtist.get(track.artistId) ?? 0;
    if (count >= MAX_PER_ARTIST) return false;
    perArtist.set(track.artistId, count + 1);
    return true;
  });

  return NextResponse.json(
    { tracks: picked.slice(0, limit).map((t) => toPlayerTrack(t)) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
