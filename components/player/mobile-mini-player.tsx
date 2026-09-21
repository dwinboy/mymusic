"use client";

import { useRef } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { TrackArt } from "@/components/player/track-art";
import { LikeButton } from "@/components/music/like-button";
import { Progress } from "@/components/ui/progress";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useNextTrack } from "@/hooks/use-player";
import { useIsLiked } from "@/hooks/use-liked-tracks";
import { cn } from "@/lib/utils";

/** A drag this far across the bar is a skip; anything less is a tap. */
const SWIPE_THRESHOLD = 60;

export function MobileMiniPlayer() {
  const track = usePlayerStore((s) => s.currentTrack());
  const next = useNextTrack();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playNext = usePlayerStore((s) => s.next);
  const playPrevious = usePlayerStore((s) => s.previous);
  const setNowPlayingOpen = usePlayerStore((s) => s.setNowPlayingOpen);
  const liked = useIsLiked(track?.id);

  const swipe = useRef<{ x: number; y: number } | null>(null);
  /** Set when a drag turned into a skip, so the click it becomes is ignored. */
  const swiped = useRef(false);

  if (!track) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <button
      onClick={() => {
        // A swipe ends in a click. Opening the full player after someone just
        // skipped would be the opposite of what they asked for.
        if (swiped.current) {
          swiped.current = false;
          return;
        }
        setNowPlayingOpen(true);
      }}
      onPointerDown={(e) => {
        swipe.current = { x: e.clientX, y: e.clientY };
        swiped.current = false;
      }}
      onPointerUp={(e) => {
        const start = swipe.current;
        swipe.current = null;
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        // Horizontal only: a vertical drag is the page being scrolled.
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
        swiped.current = true;
        if (dx < 0) playNext();
        else playPrevious();
      }}
      className={cn(
        "fixed inset-x-0 z-30 flex h-16 w-full items-center gap-3 border-t border-border bg-canvas-raised/85 px-3 text-left shadow-player backdrop-blur-xl lg:hidden"
      )}
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px))", viewTransitionName: "mini-player" }}
      aria-label="Open Now Playing"
    >
      <TrackArt src={track.coverUrl} alt={track.title} className="h-11 w-11" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
        {/* The elapsed/total readout used to sit here. The progress line above
            already shows position, and the exact seconds are in the full
            player — trading them for two real controls is the better use of
            a 390px bar. */}
        <p className="truncate text-xs text-foreground-muted">{track.artistName}</p>
        {next && (
          <p className="mt-0.5 truncate text-[11px] text-foreground-subtle">
            <span className="uppercase tracking-[0.12em]">Next</span> · {next.title}
          </p>
        )}
      </div>

      {/* Every control sits inside the bar's own button, so each one has to
          stop the click from also opening the full player. LikeButton already
          does; the others do it here. */}
      <LikeButton
        key={track.id}
        trackId={track.id}
        initialLiked={liked}
        size="sm"
        className="h-9 w-9 shrink-0"
      />
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
      <span
        onClick={(e) => {
          e.stopPropagation();
          playNext();
        }}
        role="button"
        aria-label="Next track"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:text-foreground"
      >
        <SkipForward className="h-[18px] w-[18px]" fill="currentColor" />
      </span>

      <Progress value={progressPercent} className="absolute inset-x-0 top-0 h-[2px] rounded-none" />
    </button>
  );
}
