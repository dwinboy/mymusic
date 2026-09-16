"use client";

import Link from "next/link";
import { Play, Pause } from "lucide-react";
import { TrackArt } from "@/components/player/track-art";
import { TrackMenu } from "@/components/music/track-menu";
import { LikeButton } from "@/components/music/like-button";
import { Equalizer } from "@/components/music/equalizer";
import { Badge } from "@/components/ui/badge";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useIsCurrentTrack, useIsTrackPlaying } from "@/hooks/use-player";
import { cn, formatDuration } from "@/lib/utils";
import type { PlayerTrack } from "@/lib/types";

export function TrackRow({
  track,
  index,
  queue,
  showAlbum = true,
  showArt = true,
  showLike = true,
  initiallyLiked = false,
  className,
  removeFromPlaylistId,
  onRemovedFromPlaylist,
}: {
  track: PlayerTrack;
  index?: number;
  queue?: PlayerTrack[];
  showAlbum?: boolean;
  showArt?: boolean;
  showLike?: boolean;
  initiallyLiked?: boolean;
  className?: string;
  removeFromPlaylistId?: string;
  onRemovedFromPlaylist?: () => void;
}) {
  const isCurrent = useIsCurrentTrack(track.id);
  const isPlaying = useIsTrackPlaying(track.id);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  function handlePlay() {
    if (isCurrent) togglePlay();
    else playTrack(track, queue);
  }

  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface-hover md:grid-cols-[32px_auto_1fr_minmax(0,1fr)_auto_auto]",
        isCurrent && "bg-surface-hover/70",
        className
      )}
    >
      <button
        onClick={handlePlay}
        className="hidden h-8 w-8 items-center justify-center rounded-md text-sm text-foreground-subtle transition-colors hover:bg-surface-active md:flex"
        aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5 text-accent" fill="currentColor" />
        ) : isCurrent ? (
          <Equalizer />
        ) : (
          <>
            <span className={cn("tabular group-hover:hidden", isCurrent && "text-accent")}>
              {index !== undefined ? index + 1 : ""}
            </span>
            <Play className="hidden h-3.5 w-3.5 group-hover:block" fill="currentColor" />
          </>
        )}
      </button>

      {/* Fixed grid slot for artwork on mobile — kept empty (not unmounted) so
          columns stay aligned with the header row when showArt is false. */}
      <div className="md:hidden">
        {showArt && (
          <button onClick={handlePlay} className="relative shrink-0">
            <TrackArt src={track.coverUrl} alt={track.title} className="h-11 w-11" />
            <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {isPlaying ? (
                <Pause className="h-4 w-4 text-white" fill="currentColor" />
              ) : (
                <Play className="h-4 w-4 text-white" fill="currentColor" />
              )}
            </span>
          </button>
        )}
      </div>
      <div className="hidden md:block">
        {showArt && (
          <button onClick={handlePlay} className="relative shrink-0">
            <TrackArt src={track.coverUrl} alt={track.title} className="h-11 w-11" />
            <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {isPlaying ? (
                <Pause className="h-4 w-4 text-white" fill="currentColor" />
              ) : (
                <Play className="h-4 w-4 text-white" fill="currentColor" />
              )}
            </span>
          </button>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/song/${track.slug}`}
            className={cn(
              "truncate text-sm font-medium hover:underline",
              isCurrent ? "text-accent" : "text-foreground"
            )}
          >
            {track.title}
          </Link>
          {track.isExplicit && (
            <Badge variant="outline" className="hidden shrink-0 px-1 py-0 text-[9px] sm:inline-flex">
              E
            </Badge>
          )}
        </div>
        <Link
          href={`/artist/${track.artistSlug}`}
          className="truncate text-xs text-foreground-muted hover:text-foreground hover:underline"
        >
          {track.artistName}
        </Link>
      </div>

      <div className="hidden md:block">
        {showAlbum && (
          <Link
            href={track.albumSlug ? `/album/${track.albumSlug}` : "#"}
            className="truncate text-sm text-foreground-muted hover:text-foreground hover:underline"
          >
            {track.albumTitle ?? "—"}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-3">
        {showLike && <LikeButton trackId={track.id} initialLiked={initiallyLiked} size="sm" className="hidden md:flex" />}
        <span className="tabular hidden text-xs text-foreground-subtle md:inline">
          {formatDuration(track.duration)}
        </span>
      </div>

      <TrackMenu
        track={track}
        removeFromPlaylistId={removeFromPlaylistId}
        onRemovedFromPlaylist={onRemovedFromPlaylist}
      />
    </div>
  );
}
