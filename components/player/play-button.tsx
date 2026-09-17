"use client";

import { Play, Pause, Loader2 } from "lucide-react";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useIsCurrentTrack } from "@/hooks/use-player";
import { cn } from "@/lib/utils";
import type { PlayerTrack } from "@/lib/types";

export function PlayButton({
  track,
  queue,
  startAt,
  label,
  size = "md",
  className,
  variant = "solid",
}: {
  track: PlayerTrack;
  queue?: PlayerTrack[];
  /** Seconds into the track to start from when it isn't already playing. */
  startAt?: number;
  /** Renders a pill with this text beside the icon instead of a round button. */
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "solid" | "ghost";
}) {
  const isCurrent = useIsCurrentTrack(track.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying && isCurrent);
  const loading = usePlayerStore((s) => s.loading && isCurrent);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-11 w-11",
    lg: "h-14 w-14",
  }[size];

  const iconSize = {
    sm: "h-3.5 w-3.5",
    md: "h-[18px] w-[18px]",
    lg: "h-6 w-6",
  }[size];

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queue, startAt);
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-95",
        variant === "solid"
          ? "bg-accent text-accent-foreground shadow-lg hover:scale-105 hover:bg-accent-hover"
          : "bg-canvas/60 text-foreground backdrop-blur-sm hover:bg-canvas/80",
        label ? cn("gap-2 px-6 font-semibold hover:scale-[1.02]", sizeClasses.split(" ")[0]) : sizeClasses,
        className
      )}
    >
      {loading ? (
        <Loader2 className={cn(iconSize, "animate-spin")} />
      ) : isPlaying ? (
        <Pause className={iconSize} fill="currentColor" />
      ) : (
        <Play className={cn(iconSize, "translate-x-[1px]")} fill="currentColor" />
      )}
      {label && <span className="tabular">{isCurrent ? (isPlaying ? "Pause" : "Resume") : label}</span>}
    </button>
  );
}
