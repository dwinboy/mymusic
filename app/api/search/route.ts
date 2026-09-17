import { NextResponse } from "next/server";
import { search } from "@/lib/search";
import { resolveImageUrl } from "@/lib/media/image-service";
import type { SearchResponse } from "@/lib/types";

const EMPTY: SearchResponse = { tracks: [], artists: [], albums: [], playlists: [], terms: [] };

/**
 * Instant results for the search box. Same search as the results page, so
 * the dropdown never shows something the page doesn't — including only
 * public creators, albums and playlists.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit")) || 6, 20);
  if (q.length === 0) return NextResponse.json<SearchResponse>(EMPTY);

  const results = await search(q, { songs: limit, others: limit });

  return NextResponse.json<SearchResponse>({
    tracks: results.songs.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      artistName: t.artist.name,
      artistSlug: t.artist.slug,
      coverUrl: resolveImageUrl({ publicId: t.coverImagePublicId ?? t.album?.coverImagePublicId, fallbackUrl: t.coverUrl ?? t.album?.coverUrl ?? null }, "thumbnail"),
      duration: t.duration,
    })),
    artists: results.artists.map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      avatarUrl: resolveImageUrl({ publicId: a.avatarImagePublicId, fallbackUrl: a.avatarUrl }, "thumbnail"),
    })),
    albums: results.albums.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      artistName: a.artist.name,
      coverUrl: resolveImageUrl({ publicId: a.coverImagePublicId, fallbackUrl: a.coverUrl }, "thumbnail"),
    })),
    playlists: results.playlists.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      trackCount: p._count.tracks,
      coverUrl: resolveImageUrl({ publicId: p.coverImagePublicId, fallbackUrl: p.coverUrl }, "thumbnail"),
    })),
    terms: results.terms.slice(0, limit).map((t) => ({ id: t.id, kind: t.kind, name: t.name, href: t.href })),
  });
}
