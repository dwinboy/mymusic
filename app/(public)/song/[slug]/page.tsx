import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getTrackBySlug } from "@/lib/queries";
import { toPlayerTrack } from "@/lib/mappers";
import { getLikedTrackIds } from "@/lib/favorites";
import { PlayButton } from "@/components/player/play-button";
import { LikeButton } from "@/components/music/like-button";
import { DownloadButton } from "@/components/music/download-button";
import { ShareMenu } from "@/components/music/share-menu";
import { AddToPlaylistDialog } from "@/components/music/add-to-playlist-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/music/section-header";
import { HorizontalScroller } from "@/components/music/horizontal-scroller";
import { MusicCard } from "@/components/music/music-card";
import { formatReleaseDate, formatDuration } from "@/lib/utils";
import { ListMusic } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { resolveTrackCoverUrl } from "@/lib/media/entity-images";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  if (!track) return {};

  const description = track.description || `${track.title} by ${track.artist.name} on Lumen.`;

  const ogImage = resolveTrackCoverUrl(track, "large");

  return {
    title: track.title,
    description,
    openGraph: {
      title: `${track.title} — ${track.artist.name}`,
      description,
      type: "music.song",
      images: ogImage ? [{ url: ogImage, width: 1000, height: 1000 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${track.title} — ${track.artist.name}`,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [track, session] = await Promise.all([getTrackBySlug(slug), auth()]);

  if (!track) notFound();

  const genreIds = track.genres.map((g) => g.genreId);

  const [moreFromArtist, moreLikeThis] = await Promise.all([
    db.track.findMany({
      where: { isPublished: true, artistId: track.artistId, id: { not: track.id } },
      take: 8,
      orderBy: { releaseDate: "desc" },
      include: { artist: true, album: true },
    }),
    genreIds.length > 0
      ? db.track.findMany({
          where: {
            isPublished: true,
            id: { not: track.id },
            genres: { some: { genreId: { in: genreIds } } },
          },
          take: 8,
          orderBy: { playCount: "desc" },
          include: { artist: true, album: true },
        })
      : Promise.resolve([]),
  ]);

  const playerTrack = toPlayerTrack(track, "large");
  const liked = await getLikedTrackIds(session?.user?.id, [track.id]);
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/song/${track.slug}`;
  const heroImage = resolveTrackCoverUrl(track, "large");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MusicRecording",
          name: track.title,
          byArtist: { "@type": "MusicGroup", name: track.artist.name, url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/artist/${track.artist.slug}` },
          duration: `PT${track.duration}S`,
          datePublished: track.releaseDate?.toISOString(),
          image: heroImage ?? undefined,
          url: shareUrl,
          inAlbum: track.album
            ? { "@type": "MusicAlbum", name: track.album.title, url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/album/${track.album.slug}` }
            : undefined,
        }}
      />
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
        <div className="relative aspect-square w-full max-w-xs shrink-0 overflow-hidden rounded-xl shadow-elevated sm:w-64">
          {heroImage && (
            <Image src={heroImage} alt={track.title} fill sizes="256px" className="object-cover" priority />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground-subtle">Song</p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{track.title}</h1>
            {track.isExplicit && <Badge variant="outline">Explicit</Badge>}
            {track.isAiGenerated && <Badge variant="accent">AI Composed</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground-muted">
            <Link href={`/artist/${track.artist.slug}`} className="font-medium text-foreground hover:underline">
              {track.artist.name}
            </Link>
            {track.album && (
              <>
                <span>·</span>
                <Link href={`/album/${track.album.slug}`} className="hover:underline">
                  {track.album.title}
                </Link>
              </>
            )}
            <span>·</span>
            <span>{formatReleaseDate(track.releaseDate)}</span>
            <span>·</span>
            <span className="tabular">{formatDuration(track.duration)}</span>
          </div>

          {track.description && <p className="mt-4 max-w-xl text-sm text-foreground-muted">{track.description}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PlayButton track={playerTrack} size="lg" />
            <LikeButton trackId={track.id} initialLiked={liked.has(track.id)} size="lg" className="rounded-full border border-border-strong p-2.5" />
            <DownloadButton track={playerTrack} size="lg" className="rounded-full border border-border-strong p-2.5" />
            <AddToPlaylistDialog
              trackId={track.id}
              trigger={
                <Button variant="outline" size="icon-lg" aria-label="Add to playlist">
                  <ListMusic className="h-5 w-5" />
                </Button>
              }
            />
            <ShareMenu url={shareUrl} title={track.title} size="lg" className="rounded-full border border-border-strong p-2.5" />
          </div>
        </div>
      </div>

      {(track.lyrics || track.credits || track.composer || track.producer) && (
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {track.lyrics && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Lyrics</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground-muted">{track.lyrics}</p>
            </div>
          )}
          {(track.credits || track.composer || track.producer) && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Credits</h2>
              <dl className="space-y-1.5 text-sm">
                {track.composer && (
                  <div className="flex gap-2">
                    <dt className="text-foreground-muted">Composer</dt>
                    <dd className="text-foreground">{track.composer}</dd>
                  </div>
                )}
                {track.producer && (
                  <div className="flex gap-2">
                    <dt className="text-foreground-muted">Producer</dt>
                    <dd className="text-foreground">{track.producer}</dd>
                  </div>
                )}
                {track.credits && <p className="whitespace-pre-line text-foreground-muted">{track.credits}</p>}
              </dl>
            </div>
          )}
        </div>
      )}

      {moreFromArtist.length > 0 && (
        <div className="mt-14">
          <SectionHeader title={`More from ${track.artist.name}`} href={`/artist/${track.artist.slug}`} />
          <HorizontalScroller>
            {moreFromArtist.map((t) => (
              <MusicCard key={t.id} track={toPlayerTrack(t)} />
            ))}
          </HorizontalScroller>
        </div>
      )}

      {moreLikeThis.length > 0 && (
        <div className="mt-10">
          <SectionHeader title="More like this" />
          <HorizontalScroller>
            {moreLikeThis.map((t) => (
              <MusicCard key={t.id} track={toPlayerTrack(t)} />
            ))}
          </HorizontalScroller>
        </div>
      )}
    </div>
  );
}
