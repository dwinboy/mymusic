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
import { resolveArtistAvatarUrl, resolveArtistCoverUrl } from "@/lib/media/entity-images";
import { AlbumCard } from "@/components/music/collection-cards";
import { toAlbumCard } from "@/lib/catalog-cards";
import { creatorCatalog } from "@/lib/catalog";
import { FollowButton } from "@/components/music/follow-button";
import { TermChips } from "@/components/discovery/term-links";
import { formatCompactNumber } from "@/lib/utils";

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

  const [popularTracks, latestTracks, albums, stats, following, genres] = await Promise.all([
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
    creatorCatalog.profileStats(artist.id),
    session?.user?.id
      ? db.follow.findUnique({ where: { userId_artistId: { userId: session.user.id, artistId: artist.id } }, select: { id: true } })
      : Promise.resolve(null),
    // What this creator actually makes, from their published tracks.
    db.taxonomyTerm.findMany({
      where: { kind: "GENRE", isActive: true, tracks: { some: { track: { artistId: artist.id, isPublished: true } } } },
      select: { id: true, kind: true, name: true, slug: true },
      take: 6,
    }),
  ]);

  const popularPlayerTracks = popularTracks.map((t) => toPlayerTrack(t));
  const latestPlayerTracks = latestTracks.map((t) => toPlayerTrack(t));
  const liked = await getLikedTrackIds(session?.user?.id, popularPlayerTracks.map((t) => t.id));
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/artist/${artist.slug}`;
  const avatarImage = resolveArtistAvatarUrl(artist, "large");
  const coverImage = resolveArtistCoverUrl(artist, "hero");
  // With no cover, the artist's own most-played artwork makes a far better
  // backdrop than their avatar blurred to nothing — which left the header a
  // near-black band on every profile that had never uploaded one.
  const backdrop = coverImage ?? popularPlayerTracks.find((t) => t.coverUrl)?.coverUrl ?? avatarImage;

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
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            sizes="100vw"
            priority
            // A real cover is shown as it is; anything standing in for one is
            // blurred, because it was never framed to be a banner.
            className={coverImage ? "object-cover" : "scale-125 object-cover opacity-60 blur-3xl"}
          />
        )}
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
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground-subtle">Creator</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{artist.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground-muted">
              <span className="tabular">{stats.releases}</span> {stats.releases === 1 ? "release" : "releases"}
              {stats.monthlyListeners > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    <span className="tabular">{formatCompactNumber(stats.monthlyListeners)}</span> monthly{" "}
                    {stats.monthlyListeners === 1 ? "listener" : "listeners"}
                  </span>
                </>
              )}
              {artist.location && (
                <>
                  <span aria-hidden>·</span>
                  <span>{artist.location}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {popularPlayerTracks[0] && <PlayButton track={popularPlayerTracks[0]} queue={popularPlayerTracks} size="lg" />}
          <FollowButton
            artistId={artist.id}
            artistName={artist.name}
            initialFollowing={!!following}
            initialFollowers={stats.followers}
          />
          <ShareMenu url={shareUrl} title={artist.name} text={`${artist.name} on Vibe Banger`} size="lg" className="rounded-full border border-border-strong p-2.5" />
        </div>

        {genres.length > 0 && <TermChips terms={genres} className="mt-5" />}

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
                <AlbumCard key={album.id} album={toAlbumCard(album, { showArtist: false })} />
              ))}
            </HorizontalScroller>
          </div>
        )}

        {latestPlayerTracks.length > 0 && (
          <div className="mt-10">
            <SectionHeader title="Latest Releases" href={`/songs?q=${encodeURIComponent(artist.name)}`} />
            <HorizontalScroller>
              {latestPlayerTracks.map((track) => (
                <MusicCard key={track.id} track={track} queue={latestPlayerTracks} />
              ))}
            </HorizontalScroller>
          </div>
        )}

        {artist.bio && (
          <div className="mt-10 pb-10">
            <SectionHeader title="About" />
            <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-foreground-muted">{artist.bio}</p>
          </div>
        )}
      </div>
    </div>
  );
}
