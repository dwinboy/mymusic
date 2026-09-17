"use client";

import Link from "next/link";
import { Shuffle, SkipBack, SkipForward, Repeat, Repeat1, ListMusic, Maximize2 } from "lucide-react";
import { TrackArt } from "@/components/player/track-art";
import { PlayButton } from "@/components/player/play-button";
import { ProgressBar } from "@/components/player/progress-bar";
import { VolumeControl } from "@/components/player/volume-control";
import { LikeButton } from "@/components/music/like-button";
import { DownloadButton } from "@/components/music/download-button";
import { ShareMenu } from "@/components/music/share-menu";
import { usePlayerStore } from "@/lib/stores/player-store";
import { cn } from "@/lib/utils";

export function DesktopPlayer() {
  const track = usePlayerStore((s) => s.currentTrack());
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen);

  if (!track) return null;

  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;

  return (
    <div
      className="relative hidden h-20 items-center gap-6 border-t border-border bg-canvas-raised/85 px-6 shadow-player backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-accent/50 before:to-transparent md:flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex w-72 min-w-0 items-center gap-3">
        <Link href={`/song/${track.slug}`}>
          <TrackArt src={track.coverUrl} alt={track.title} className="h-14 w-14" sizes="56px" />
        </Link>
        <div className="min-w-0">
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
        <LikeButton trackId={track.id} size="sm" className="ml-1 shrink-0" />
      </div>

      <div className="flex flex-1 max-w-2xl flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            aria-label="Shuffle"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:text-foreground",
              shuffle ? "text-accent" : "text-foreground-muted"
            )}
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button
            onClick={previous}
            aria-label="Previous"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:text-accent"
          >
            <SkipBack className="h-5 w-5" fill="currentColor" />
          </button>
          <PlayButton track={track} size="md" />
          <button
            onClick={next}
            aria-label="Next"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:text-accent"
          >
            <SkipForward className="h-5 w-5" fill="currentColor" />
          </button>
          <button
            onClick={cycleRepeat}
            aria-pressed={repeatMode !== "off"}
            aria-label="Repeat"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:text-foreground",
              repeatMode !== "off" ? "text-accent" : "text-foreground-muted"
            )}
          >
            <RepeatIcon className="h-4 w-4" />
          </button>
        </div>
        <ProgressBar className="w-full" />
      </div>

      <div className="flex w-72 items-center justify-end gap-3">
        <DownloadButton track={track} size="sm" />
        <ShareMenu url={typeof window !== "undefined" ? `${window.location.origin}/song/${track.slug}` : ""} title={track.title} size="sm" />
        <VolumeControl />
        <button
          onClick={() => setQueueOpen(true)}
          aria-label="Open queue"
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <ListMusic className="h-4 w-4" />
        </button>
        <Link
          href={`/song/${track.slug}`}
          aria-label="Expand"
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Maximize2 className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
