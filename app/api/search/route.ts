import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SearchResponse } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit")) || 6, 20);

  if (q.length === 0) {
    return NextResponse.json<SearchResponse>({ tracks: [], artists: [], albums: [], playlists: [] });
  }

  const [tracks, artists, albums, playlists] = await Promise.all([
    db.track.findMany({
      where: { isPublished: true, title: { contains: q, mode: "insensitive" } },
      take: limit,
      orderBy: { playCount: "desc" },
      include: { artist: true },
    }),
    db.artist.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: limit,
    }),
    db.album.findMany({
      where: { isPublished: true, title: { contains: q, mode: "insensitive" } },
      take: limit,
      include: { artist: true },
    }),
    db.playlist.findMany({
      where: { isPublic: true, title: { contains: q, mode: "insensitive" } },
      take: limit,
      include: { _count: { select: { tracks: true } } },
    }),
  ]);

  const response: SearchResponse = {
    tracks: tracks.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      artistName: t.artist.name,
      artistSlug: t.artist.slug,
      coverUrl: t.coverUrl,
      duration: t.duration,
    })),
    artists: artists.map((a) => ({ id: a.id, slug: a.slug, name: a.name, avatarUrl: a.avatarUrl })),
    albums: albums.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      artistName: a.artist.name,
      coverUrl: a.coverUrl,
    })),
    playlists: playlists.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      trackCount: p._count.tracks,
      coverUrl: p.coverUrl,
    })),
  };

  return NextResponse.json(response);
}
