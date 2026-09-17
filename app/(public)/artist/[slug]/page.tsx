import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Mic2 } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getArtistBySlug } from "@/lib/queries";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import { TrackRow } from "@/components/music/track-row";
import { MusicCard } from "@/components/music/music-card";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { ShareMenu } from "@/components/music/share-menu";
import { PlayButton } from "@/components/player/play-button";
import { JsonLd } from "@/components/seo/json-ld";
import { resolveArtistAvatarUrl, resolveArtistCoverUrl, resolveAlbumCoverUrl } from "@/lib/media/entity-images";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return {};

  const description = artist.bio || `Stream music by ${artist.name} on Vibe Banger.`;

  return {
    title: artist.name,
    description,
    openGraph: {
      title: artist.name,
      description,
      type: "profile",
      images: artist.avatarUrl ? [{ url: artist.avatarUrl, width: 512, height: 512 }] : undefined,
    },
  };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [artist, session] = await Promise.all([getArtistBySlug(slug), auth()]);
  if (!artist) notFound();

  const [popularTracks, latestTracks, albums] = await Promise.all([
    db.track.findMany({
      where: { artistId: artist.id, isPublished: true },
      orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: { artist: true, album: true },
    }),
    db.track.findMany({
      where: { artistId: artist.id, isPublished: true },
      orderBy: { releaseDate: "desc" },
      take: 10,
      include: { artist: true, album: true },
    }),
    db.album.findMany({
      where: { artistId: artist.id, isPublished: true },
      orderBy: { releaseDate: "desc" },
    }),
  ]);

  const popularPlayerTracks = popularTracks.map((t) => toPlayerTrack(t));
  const latestPlayerTracks = latestTracks.map((t) => toPlayerTrack(t));
  const liked = await getLikedTrackIds(session?.user?.id, popularPlayerTracks.map((t) => t.id));
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/artist/${artist.slug}`;
  const avatarImage = resolveArtistAvatarUrl(artist, "large");
  const coverImage = resolveArtistCoverUrl(artist, "hero");

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MusicGroup",
          name: artist.name,
          description: artist.bio ?? undefined,
          image: avatarImage ?? undefined,
          url: shareUrl,
        }}
      />
      <div className="relative h-56 w-full overflow-hidden sm:h-72">
        {coverImage ? (
          <Image src={coverImage} alt="" fill sizes="100vw" className="object-cover" priority />
        ) : avatarImage ? (
          <Image src={avatarImage} alt="" fill sizes="100vw" className="scale-125 object-cover opacity-30 blur-2xl" priority />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/60 to-canvas/20" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-8">
        <div className="-mt-16 flex flex-col items-start gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:gap-6">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-canvas bg-surface shadow-elevated sm:h-40 sm:w-40">
            {avatarImage ? (
              <Image src={avatarImage} alt={artist.name} fill sizes="160px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-foreground-subtle">
                <Mic2 className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="min-w-0 pb-1">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground-subtle">Artist</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{artist.name}</h1>
          </div>
        </div>

        {artist.bio && <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground-muted">{artist.bio}</p>}

        <div className="mt-6 flex items-center gap-3">
          {popularPlayerTracks[0] && <PlayButton track={popularPlayerTracks[0]} queue={popularPlayerTracks} size="lg" />}
          <ShareMenu url={shareUrl} title={artist.name} size="lg" className="rounded-full border border-border-strong p-2.5" />
        </div>

        {popularPlayerTracks.length > 0 && (
          <div className="mt-12">
            <SectionHeader title="Popular" />
            <div className="flex flex-col">
              {popularPlayerTracks.map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  queue={popularPlayerTracks}
                  initiallyLiked={liked.has(track.id)}
                />
              ))}
            </div>
          </div>
        )}

        {albums.length > 0 && (
          <div className="mt-10">
            <SectionHeader title="Albums" />
            <HorizontalScroller>
              {albums.map((album) => (
                <AlbumTile key={album.id} album={album} />
              ))}
            </HorizontalScroller>
          </div>
        )}

        {latestPlayerTracks.length > 0 && (
          <div className="mt-10 pb-10">
            <SectionHeader title="Latest Releases" />
            <HorizontalScroller>
              {latestPlayerTracks.map((track) => (
                <MusicCard key={track.id} track={track} queue={latestPlayerTracks} />
              ))}
            </HorizontalScroller>
          </div>
        )}
      </div>
    </div>
  );
}

function AlbumTile({
  album,
}: {
  album: { slug: string; title: string; coverUrl: string | null; coverImagePublicId: string | null; releaseDate: Date | null };
}) {
  const cover = resolveAlbumCoverUrl(album, "small");
  return (
    <a href={`/album/${album.slug}`} className="group w-40 shrink-0 sm:w-44">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-surface shadow-sm transition-shadow group-hover:shadow-elevated">
        {cover && <Image src={cover} alt={album.title} fill sizes="176px" className="object-cover" />}
      </div>
      <p className="mt-2.5 truncate text-sm font-medium text-foreground group-hover:underline">{album.title}</p>
      <p className="text-xs text-foreground-muted">{album.releaseDate ? new Date(album.releaseDate).getFullYear() : ""}</p>
    </a>
  );
}
