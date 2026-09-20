"use client";

import { Play, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { PlayerTrack } from "@/lib/types";

/**
 * How many songs are in a library section, and how to play them.
 *
 * Playing your own liked songs used to mean picking one track out of the list
 * by hand — the most obvious thing you'd want to do here had no control at
 * all. The count is here for the same reason: a list you have to scroll to
 * the end of to size is a list you don't know the size of.
 */
export function LibrarySectionActions({ tracks, noun = "song" }: { tracks: PlayerTrack[]; noun?: string }) {
  const playQueue = usePlayerStore((s) => s.playQueue);
  if (tracks.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-foreground-muted">
        {tracks.length} {noun}
        {tracks.length === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => playQueue(tracks, 0)}>
          <Play className="mr-1.5 h-3.5 w-3.5" fill="currentColor" />
          Play all
        </Button>
        <Button
          size="sm"
          variant="secondary"
          // Shuffled here rather than by flipping the player's shuffle mode:
          // this plays these songs in a random order once, and doesn't change
          // how the player behaves for everything afterwards.
          onClick={() => {
            const shuffled = [...tracks];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            playQueue(shuffled, 0);
          }}
        >
          <Shuffle className="mr-1.5 h-3.5 w-3.5" />
          Shuffle
        </Button>
      </div>
    </div>
  );
}
