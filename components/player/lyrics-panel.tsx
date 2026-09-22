"use client";

import { X } from "lucide-react";
import { SyncedLyrics } from "@/components/player/synced-lyrics";
import { parseLyrics } from "@/lib/lyrics";
import { cn } from "@/lib/utils";
import type { PlayerTrack } from "@/lib/types";

/**
 * Lyrics, given the screen.
 *
 * They used to be swapped in where the artwork sits — a 237px slot on a
 * 664px phone, with lines sliced in half at both edges and no sign the box
 * scrolled. The only way back was one of four small icons in a row at the
 * bottom, which is what left people stuck: nothing on screen said what this
 * was or how to leave it.
 *
 * Now it is its own view. A header that names it and carries a close button
 * where a close button goes, the words taking all the height that is left,
 * and a soft fade top and bottom so a part-line at the edge reads as more to
 * come rather than as something broken.
 */
export function LyricsPanel({
  track,
  onClose,
  className,
}: {
  track: PlayerTrack;
  onClose: () => void;
  className?: string;
}) {
  const parsed = parseLyrics(track.lyrics);

  return (
    <div className={cn("flex min-h-0 w-full flex-col", className)}>
      <header className="flex shrink-0 items-start gap-3 pb-2.5">
        <div className="min-w-0 flex-1">
          {/* The hint lives here rather than on its own line at the bottom:
              tapping a line to jump is not something anyone guesses, and a
              separate line for it cost the words half a verse of height. */}
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">
            {parsed.synced ? "Lyrics · tap a line to jump" : "Lyrics"}
          </p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-foreground">{track.title}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close lyrics"
          className="-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground-muted transition-colors hover:bg-surface hover:text-foreground active:scale-95"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </header>

      <div
        data-scrollable
        className="-mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2"
        // A line cut off at the edge of a scrolling box looks like a bug.
        // Fading it says "there is more" without taking any height to do it.
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 6%, black 94%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 6%, black 94%, transparent)",
        }}
      >
        <SyncedLyrics lyrics={track.lyrics ?? ""} className={parsed.synced ? undefined : "py-2"} />
      </div>
    </div>
  );
}
