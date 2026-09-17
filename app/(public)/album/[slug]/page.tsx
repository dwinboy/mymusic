import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAlbumBySlug } from "@/lib/queries";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import { PlayButton } from "@/components/player/play-button";
import { ShufflePlayButton } from "@/components/music/shuffle-play-button";
import { ShareMenu } from "@/components/music/share-menu";
import { TrackRow } from "@/components/music/track-row";
import { formatDuration, formatDurationLong, formatReleaseDate } from "@/lib/utils";
import { JsonLd } from "@/components/seo/json-ld";
import { resolveAlbumCoverUrl } from "@/lib/media/entity-images";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbumBySlug(slug);
  if (!album) return {};

  const description = album.description || `${album.title} by ${album.artist.name} on Vibe Banger.`;

  const ogImage = resolveAlbumCoverUrl(album, "large");

  return {
    title: album.title,
    description,
    openGraph: {
      title: `${album.title} — ${album.artist.name}`,
      description,
      type: "music.album",
      images: ogImage ? [{ url: ogImage, width: 1000, height: 1000 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${album.title} — ${album.artist.name}`,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [album, session] = await Promise.all([getAlbumBySlug(slug), auth()]);

  if (!album || album.tracks.length === 0) notFound();

  const playerTracks = album.tracks.map((t) => toPlayerTrack(t));
  const liked = await getLikedTrackIds(session?.user?.id, playerTracks.map((t) => t.id));
  const totalSeconds = album.tracks.reduce((sum, t) => sum + t.duration, 0);
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/album/${album.slug}`;
  const firstTrack = playerTracks[0];
  const heroImage = resolveAlbumCoverUrl(album, "large");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MusicAlbum",
          name: album.title,
          byArtist: { "@type": "MusicGroup", name: album.artist.name, url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/artist/${album.artist.slug}` },
          datePublished: album.releaseDate?.toISOString(),
          image: heroImage ?? undefined,
          url: shareUrl,
          numTracks: album.tracks.length,
        }}
      />
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
        <div className="relative aspect-square w-full max-w-xs shrink-0 overflow-hidden rounded-xl shadow-elevated sm:w-64">
          {heroImage && (
            <Image src={heroImage} alt={album.title} fill sizes="256px" className="object-cover" priority />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground-subtle">Album</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{album.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground-muted">
            <Link href={`/artist/${album.artist.slug}`} className="font-medium text-foreground hover:underline">
              {album.artist.name}
            </Link>
            <span>·</span>
            <span>{formatReleaseDate(album.releaseDate)}</span>
            <span>·</span>
            <span>{album.tracks.length} tracks</span>
            <span>·</span>
            <span>{formatDurationLong(totalSeconds)}</span>
          </div>

          {album.description && <p className="mt-4 max-w-xl text-sm text-foreground-muted">{album.description}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PlayButton track={firstTrack} queue={playerTracks} size="lg" />
            <ShufflePlayButton tracks={playerTracks} />
            <ShareMenu url={shareUrl} title={album.title} size="lg" className="rounded-full border border-border-strong p-2.5" />
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col">
        <div className="hidden grid-cols-[32px_auto_1fr_minmax(0,1fr)_auto_auto] gap-3 border-b border-border px-2.5 pb-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle md:grid">
          <span>#</span>
          <span />
          <span>Title</span>
          <span />
          <span className="text-right">Duration</span>
          <span />
        </div>
        {playerTracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            queue={playerTracks}
            showArt={false}
            showAlbum={false}
            initiallyLiked={liked.has(track.id)}
          />
        ))}
      </div>

      <p className="mt-6 text-xs text-foreground-subtle">
        {formatReleaseDate(album.releaseDate)} · {album.tracks.length} songs, {formatDuration(totalSeconds)}
      </p>
    </div>
  );
}
