import Link from "next/link";
import { TrackArt } from "@/components/player/track-art";
import { ArtworkMorphLink } from "@/components/music/artwork-morph-link";
import { PlayButton } from "@/components/player/play-button";
import { cn, formatDuration } from "@/lib/utils";
import type { PlayerTrack } from "@/lib/types";

/** Standard card: artwork, title, artist, hover play + more menu. Used in grids/rails. */
export function MusicCard({
  track,
  queue,
  className,
}: {
  track: PlayerTrack;
  queue?: PlayerTrack[];
  className?: string;
}) {
  return (
    <div className={cn("group w-40 shrink-0 sm:w-44", className)}>
      <ArtworkMorphLink href={`/song/${track.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-surface shadow-sm transition-shadow group-hover:shadow-elevated">
          <TrackArt src={track.coverUrl} alt={track.title} className="h-full w-full" rounded="rounded-none" sizes="176px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <PlayButton
            track={track}
            queue={queue}
            size="md"
            className="absolute bottom-2 right-2 shadow-lg transition-all can-hover:translate-y-1 can-hover:opacity-0 can-hover:group-hover:translate-y-0 can-hover:group-hover:opacity-100"
          />
        </div>
      </ArtworkMorphLink>
      <div className="mt-2.5 min-w-0">
        <Link href={`/song/${track.slug}`} className="block truncate text-sm font-medium text-foreground hover:underline">
          {track.title}
        </Link>
        <Link
          href={`/artist/${track.artistSlug}`}
          className="block truncate text-xs text-foreground-muted hover:text-foreground hover:underline"
        >
          {track.artistName}
        </Link>
      </div>
    </div>
  );
}

/** Compact card: smaller artwork, used in dense grids like genre-adjacent recommendations. */
export function CompactMusicCard({
  track,
  queue,
  className,
}: {
  track: PlayerTrack;
  queue?: PlayerTrack[];
  className?: string;
}) {
  return (
    <Link
      href={`/song/${track.slug}`}
      className={cn(
        "group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-hover",
        className
      )}
    >
      <div className="relative shrink-0">
        <TrackArt src={track.coverUrl} alt={track.title} className="h-12 w-12" sizes="48px" />
        <PlayButton
          track={track}
          queue={queue}
          size="sm"
          className="absolute inset-0 h-full w-full rounded-md bg-black/40 shadow-none transition-opacity can-hover:opacity-0 can-hover:group-hover:opacity-100"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
        <p className="truncate text-xs text-foreground-muted">{track.artistName}</p>
      </div>
      <span className="tabular shrink-0 text-xs text-foreground-subtle">{formatDuration(track.duration)}</span>
    </Link>
  );
}

/** Featured card: large hero-style card with description, used for editorial picks. */
export function FeaturedMusicCard({
  track,
  description,
  queue,
  className,
}: {
  track: PlayerTrack;
  description?: string;
  queue?: PlayerTrack[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative w-72 shrink-0 overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border-strong sm:w-80",
        className
      )}
    >
      <Link href={`/song/${track.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <TrackArt src={track.coverUrl} alt={track.title} className="h-full w-full" rounded="rounded-none" sizes="320px" />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/10 to-transparent" />
        </div>
      </Link>
      {/* Right padding keeps the title and artist clear of the play button,
          which floats over this boundary and is permanently visible on touch. */}
      <div className="p-4 pr-20">
        <Link href={`/song/${track.slug}`} className="block truncate text-base font-semibold text-foreground hover:underline">
          {track.title}
        </Link>
        <Link
          href={`/artist/${track.artistSlug}`}
          className="block truncate text-sm text-foreground-muted hover:text-foreground hover:underline"
        >
          {track.artistName}
        </Link>
        {description && <p className="mt-2 line-clamp-2 text-sm text-foreground-muted">{description}</p>}
      </div>
      <PlayButton
        track={track}
        queue={queue}
        size="lg"
        className="absolute right-4 top-[calc(75%-28px)] shadow-lg transition-all can-hover:translate-y-2 can-hover:opacity-0 can-hover:group-hover:translate-y-0 can-hover:group-hover:opacity-100"
      />
    </div>
  );
}

/** Horizontal mobile card: artwork + title/artist + play, optimized for touch. */
export function HorizontalMusicCard({
  track,
  queue,
  className,
}: {
  track: PlayerTrack;
  queue?: PlayerTrack[];
  className?: string;
}) {
  return (
    <Link
      href={`/song/${track.slug}`}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-2.5 transition-colors active:bg-surface-hover",
        className
      )}
    >
      <TrackArt src={track.coverUrl} alt={track.title} className="h-14 w-14" sizes="56px" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
        <p className="truncate text-xs text-foreground-muted">{track.artistName}</p>
      </div>
      <PlayButton track={track} queue={queue} size="sm" />
    </Link>
  );
}
