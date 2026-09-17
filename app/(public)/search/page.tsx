import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import { TrackRow } from "@/components/music/track-row";
import { ArtistCard } from "@/components/music/artist-card";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { EmptyState } from "@/components/states/empty-state";
import { SearchBar } from "@/components/search/search-bar";
import { Search as SearchIcon } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Search",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const session = await auth();

  if (query.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
        <div className="mb-8 md:hidden">
          <SearchBar />
        </div>
        <EmptyState icon={SearchIcon} title="Search Vibe Banger" description="Find songs, artists, albums, and playlists." />
      </div>
    );
  }

  const [tracks, artists, albums, playlists] = await Promise.all([
    db.track.findMany({
      where: { isPublished: true, title: { contains: query, mode: "insensitive" } },
      take: 25,
      orderBy: { playCount: "desc" },
      include: { artist: true, album: true },
    }),
    db.artist.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: 10 }),
    db.album.findMany({
      where: { isPublished: true, title: { contains: query, mode: "insensitive" } },
      take: 10,
      include: { artist: true },
    }),
    db.playlist.findMany({
      where: { isPublic: true, title: { contains: query, mode: "insensitive" } },
      take: 10,
      include: { _count: { select: { tracks: true } } },
    }),
  ]);

  const hasResults = tracks.length + artists.length + albums.length + playlists.length > 0;
  const playerTracks = tracks.map((t) => toPlayerTrack(t));
  const liked = await getLikedTrackIds(session?.user?.id, playerTracks.map((t) => t.id));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-8 md:hidden">
        <SearchBar />
      </div>

      <h1 className="text-xl text-foreground-muted">
        Results for <span className="font-semibold text-foreground">&ldquo;{query}&rdquo;</span>
      </h1>

      {!hasResults && (
        <EmptyState
          icon={SearchIcon}
          title="No results found"
          description="Try a different search term, or check the spelling."
          className="mt-8"
        />
      )}

      {artists.length > 0 && (
        <div className="mt-8">
          <SectionHeader title="Artists" />
          <HorizontalScroller>
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </HorizontalScroller>
        </div>
      )}

      {albums.length > 0 && (
        <div className="mt-8">
          <SectionHeader title="Albums" />
          <HorizontalScroller>
            {albums.map((album) => (
              <a key={album.id} href={`/album/${album.slug}`} className="group w-40 shrink-0 sm:w-44">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-surface">
                  {album.coverUrl && (
                    <Image src={album.coverUrl} alt={album.title} fill sizes="176px" className="object-cover" />
                  )}
                </div>
                <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">{album.title}</p>
                <p className="truncate text-xs text-foreground-muted">{album.artist.name}</p>
              </a>
            ))}
          </HorizontalScroller>
        </div>
      )}

      {playlists.length > 0 && (
        <div className="mt-8">
          <SectionHeader title="Playlists" />
          <HorizontalScroller>
            {playlists.map((playlist) => (
              <a key={playlist.id} href={`/playlist/${playlist.slug}`} className="group w-40 shrink-0 sm:w-44">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-surface">
                  {playlist.coverUrl && (
                    <Image src={playlist.coverUrl} alt={playlist.title} fill sizes="176px" className="object-cover" />
                  )}
                </div>
                <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">{playlist.title}</p>
                <p className="text-xs text-foreground-muted">{playlist._count.tracks} tracks</p>
              </a>
            ))}
          </HorizontalScroller>
        </div>
      )}

      {playerTracks.length > 0 && (
        <div className="mt-8 pb-8">
          <SectionHeader title="Songs" />
          <div className="flex flex-col">
            {playerTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} queue={playerTracks} initiallyLiked={liked.has(track.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
