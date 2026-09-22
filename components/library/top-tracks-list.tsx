"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { PlayerTrack } from "@/lib/types";

/**
 * A ranked list, not a library.
 *
 * The shared library list brings a search box, a sort control and Play all —
 * right for every song you've liked, wrong for a top five, where a sort
 * control would quietly reorder the one thing the list is claiming to show.
 * Counts are on every row so the ranking explains itself.
 */
export function TopTracksList({ entries }: { entries: { track: PlayerTrack; plays: number }[] }) {
  const playQueue = usePlayerStore((s) => s.playQueue);
  const currentId = usePlayerStore((s) => s.currentTrack()?.id);
  const queue = entries.map((e) => e.track);

  return (
    <ol className="flex flex-col gap-px overflow-hidden rounded-2xl border border-border bg-border">
      {entries.map(({ track, plays }, index) => (
        <li key={track.id}>
          <button
            onClick={() => playQueue(queue, index)}
            className="group flex w-full items-center gap-3 bg-canvas px-4 py-2.5 text-left transition-colors hover:bg-surface-hover"
          >
            <span className="w-5 shrink-0 text-sm tabular-nums text-foreground-subtle">{index + 1}</span>
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface">
              {track.coverUrl && (
                <Image src={track.coverUrl} alt="" fill sizes="40px" className="object-cover" />
              )}
              <span className="absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
                <Play className="h-4 w-4 fill-white text-white" />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={
                  track.id === currentId
                    ? "block truncate text-sm font-medium text-accent"
                    : "block truncate text-sm font-medium text-foreground"
                }
              >
                {track.title}
              </span>
              <span className="block truncate text-xs text-foreground-muted">{track.artistName}</span>
            </span>
            <span className="shrink-0 text-sm tabular-nums text-foreground-muted">
              {plays} {plays === 1 ? "play" : "plays"}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
