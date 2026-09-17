import { albumCatalog, creatorCatalog, playlistCatalog } from "@/lib/catalog";
import { toAlbumCard, toCreatorCard, toPlaylistCard } from "@/lib/catalog-cards";
import { parseDiscoveryFilters } from "@/lib/discovery-filters";

/**
 * One page of a catalogue grid as card data, shared by the pages (first
 * page, server-rendered) and /api/catalog/[type] (every page after).
 */

export type CatalogListType = "albums" | "creators" | "playlists";

export async function albumListPage(params: URLSearchParams, cursor: string | null) {
  const genreSlugs = params.get("genre");
  const genreTermIds = genreSlugs
    ? (await parseDiscoveryFilters(new URLSearchParams({ genre: genreSlugs }))).filter.anyOfGroups?.[0]
    : undefined;
  const year = Number(params.get("year")) || undefined;
  const creatorSlug = params.get("creator") || undefined;
  // A genre that matched nothing filters to nothing, rather than being ignored.
  if (genreSlugs && !genreTermIds) return { items: [], nextCursor: null, total: 0 };

  const { albums, nextCursor, total } = await albumCatalog.list({ genreTermIds, year, creatorSlug, cursor, limit: 24 });
  return { items: albums.map((a) => toAlbumCard(a)), nextCursor, total };
}

export async function creatorListPage(cursor: string | null) {
  const { artists, nextCursor, total } = await creatorCatalog.list({ cursor, limit: 36 });
  return { items: artists.map((a) => toCreatorCard(a)), nextCursor, total };
}

export async function playlistListPage(cursor: string | null) {
  const { playlists, nextCursor } = await playlistCatalog.community({ cursor, limit: 24 });
  return { items: playlists.map(toPlaylistCard), nextCursor, total: null };
}
