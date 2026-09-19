"use client";

import { Pause, Play } from "lucide-react";
import { TrackArt } from "@/components/player/track-art";
import { Progress } from "@/components/ui/progress";
import { usePlayerStore } from "@/lib/stores/player-store";
import { cn, formatDuration } from "@/lib/utils";

export function MobileMiniPlayer() {
  const track = usePlayerStore((s) => s.currentTrack());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const setNowPlayingOpen = usePlayerStore((s) => s.setNowPlayingOpen);

  if (!track) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <button
      onClick={() => setNowPlayingOpen(true)}
      className={cn(
        "fixed inset-x-0 z-30 flex h-16 w-full items-center gap-3 border-t border-border bg-canvas-raised/85 px-3 text-left shadow-player backdrop-blur-xl lg:hidden"
      )}
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px))", viewTransitionName: "mini-player" }}
      aria-label="Open Now Playing"
    >
      <TrackArt src={track.coverUrl} alt={track.title} className="h-11 w-11" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
        <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <span className="truncate">{track.artistName}</span>
          <span className="shrink-0 text-foreground-subtle" aria-hidden>
            ·
          </span>
          <span className="tabular shrink-0 text-foreground-subtle">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </p>
      </div>
      <span
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        role="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground"
      >
        {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />}
      </span>
      <Progress value={progressPercent} className="absolute inset-x-0 top-0 h-[2px] rounded-none" />
    </button>
  );
}
