import type { Metadata } from "next";
import Image from "next/image";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { MusicCard } from "@/components/music/music-card";
import { FeaturedMusicCard } from "@/components/music/music-card";
import { ArtistCard } from "@/components/music/artist-card";
import { GenreTile } from "@/components/music/genre-tile";
import { TrackRow } from "@/components/music/track-row";
import { EmptyState } from "@/components/states/empty-state";
import { Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Discover",
  description: "Curated new music, featured artists, and genre collections on Lumen.",
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre: genreSlug } = await searchParams;
  const session = await auth();

  if (genreSlug) {
    const genre = await db.genre.findUnique({ where: { slug: genreSlug } });
    if (!genre) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
          <EmptyState icon={Compass} title="Genre not found" />
        </div>
      );
    }

    const tracks = await db.track.findMany({
      where: { isPublished: true, genres: { some: { genreId: genre.id } } },
      orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: { artist: true, album: true },
    });

    const playerTracks = tracks.map((t) => toPlayerTrack(t));
    const liked = await getLikedTrackIds(session?.user?.id, playerTracks.map((t) => t.id));

    return (
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground-subtle">Genre</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{genre.name}</h1>

        {playerTracks.length === 0 ? (
          <EmptyState icon={Compass} title="No tracks in this genre yet" className="mt-10" />
        ) : (
          <div className="mt-8 flex flex-col">
            {playerTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} queue={playerTracks} initiallyLiked={liked.has(track.id)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const [newTracks, featuredTracks, popularTracks, popularArtists, albums, genres, playlists] = await Promise.all([
    db.track.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { artist: true, album: true },
    }),
    db.track.findMany({
      where: { isPublished: true, isFeatured: true },
      orderBy: { releaseDate: "desc" },
      take: 6,
      include: { artist: true, album: true },
    }),
    db.track.findMany({
      where: { isPublished: true },
      orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
      take: 8,
      include: { artist: true, album: true },
    }),
    db.artist.findMany({ orderBy: { isFeatured: "desc" }, take: 10 }),
    db.album.findMany({ where: { isPublished: true }, orderBy: { releaseDate: "desc" }, take: 10, include: { artist: true } }),
    db.genre.findMany({ orderBy: { name: "asc" } }),
    db.playlist.findMany({ where: { isPublic: true }, take: 8, include: { _count: { select: { tracks: true } } } }),
  ]);

  const newPlayerTracks = newTracks.map((t) => toPlayerTrack(t));
  const featuredPlayerTracks = featuredTracks.map((t) => toPlayerTrack(t));
  const popularPlayerTracks = popularTracks.map((t) => toPlayerTrack(t));
  const liked = await getLikedTrackIds(
    session?.user?.id,
    popularPlayerTracks.map((t) => t.id)
  );

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-10 px-4 py-6 sm:px-8 sm:py-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Discover</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Curated for you
        </h1>
      </div>

      {featuredPlayerTracks.length > 0 && (
        <section>
          <SectionHeader title="Featured" subtitle="Editorial picks from the catalogue" />
          <HorizontalScroller>
            {featuredPlayerTracks.map((track, i) => (
              <FeaturedMusicCard
                key={track.id}
                track={track}
                description={featuredTracks[i].description ?? undefined}
                queue={featuredPlayerTracks}
              />
            ))}
          </HorizontalScroller>
        </section>
      )}

      {newPlayerTracks.length > 0 && (
        <section>
          <SectionHeader title="New Music" href="/new-releases" />
          <HorizontalScroller>
            {newPlayerTracks.map((track) => (
              <MusicCard key={track.id} track={track} queue={newPlayerTracks} />
            ))}
          </HorizontalScroller>
        </section>
      )}

      {popularPlayerTracks.length > 0 && (
        <section>
          <SectionHeader title="Popular Tracks" />
          <div className="flex flex-col">
            {popularPlayerTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} queue={popularPlayerTracks} initiallyLiked={liked.has(track.id)} />
            ))}
          </div>
        </section>
      )}

      {popularArtists.length > 0 && (
        <section>
          <SectionHeader title="Popular Artists" href="/artists" />
          <HorizontalScroller>
            {popularArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </HorizontalScroller>
        </section>
      )}

      {albums.length > 0 && (
        <section>
          <SectionHeader title="Albums" />
          <HorizontalScroller>
            {albums.map((album) => (
              <a key={album.id} href={`/album/${album.slug}`} className="group w-40 shrink-0 sm:w-44">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-surface shadow-sm transition-shadow group-hover:shadow-elevated">
                  {album.coverUrl && (
                    <Image src={album.coverUrl} alt={album.title} fill sizes="176px" className="object-cover" />
                  )}
                </div>
                <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">{album.title}</p>
                <p className="truncate text-xs text-foreground-muted">{album.artist.name}</p>
              </a>
            ))}
          </HorizontalScroller>
        </section>
      )}

      {genres.length > 0 && (
        <section>
          <SectionHeader title="Genres" />
          <HorizontalScroller>
            {genres.map((genre, i) => (
              <GenreTile key={genre.id} genre={genre} index={i} />
            ))}
          </HorizontalScroller>
        </section>
      )}

      {playlists.length > 0 && (
        <section>
          <SectionHeader title="Curated Playlists" />
          <HorizontalScroller>
            {playlists.map((playlist) => (
              <a key={playlist.id} href={`/playlist/${playlist.slug}`} className="group w-40 shrink-0 sm:w-44">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface shadow-sm transition-shadow group-hover:shadow-elevated">
                  {playlist.coverUrl ? (
                    <Image src={playlist.coverUrl} alt={playlist.title} fill sizes="176px" className="object-cover" />
                  ) : (
                    <Compass className="h-8 w-8 text-foreground-subtle" />
                  )}
                </div>
                <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">{playlist.title}</p>
                <p className="text-xs text-foreground-muted">{playlist._count.tracks} tracks</p>
              </a>
            ))}
          </HorizontalScroller>
        </section>
      )}
    </div>
  );
}
