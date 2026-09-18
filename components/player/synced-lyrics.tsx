"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePlayerStore } from "@/lib/stores/player-store";
import { parseLyrics, activeLineIndex } from "@/lib/lyrics";
import { cn } from "@/lib/utils";

/**
 * Lyrics that follow the song: the line being sung is lit, the rest recede,
 * and the view keeps the current line centred. Tapping a line jumps there,
 * which is the fastest way back to a part you wanted to hear again.
 *
 * Falls back to the plain text whenever the lyrics carry no timings, so this
 * is the only lyrics view either way.
 */
export function SyncedLyrics({ lyrics, className }: { lyrics: string; className?: string }) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const seek = usePlayerStore((s) => s.seek);
  const parsed = useMemo(() => parseLyrics(lyrics), [lyrics]);
  const active = parsed.synced ? activeLineIndex(parsed.lines, currentTime) : -1;
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }, [active]);

  if (!parsed.synced) {
    return (
      <p className={cn("whitespace-pre-line text-lg font-medium leading-loose text-foreground/90", className)}>
        {parsed.plain}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1 py-[35%]", className)}>
      {parsed.lines.map((line, index) => (
        <button
          key={`${line.time}-${index}`}
          ref={index === active ? activeRef : undefined}
          type="button"
          onClick={() => seek(line.time)}
          aria-current={index === active ? "true" : undefined}
          className={cn(
            "rounded-lg px-2 py-1.5 text-left text-lg font-semibold leading-snug transition-[color,opacity,transform] duration-500",
            index === active
              ? "text-foreground"
              : index < active
                ? "text-foreground/25 hover:text-foreground/50"
                : "text-foreground/40 hover:text-foreground/70"
          )}
        >
          {/* An instrumental gap is a real line in LRC, with no words. */}
          {line.text || "·"}
        </button>
      ))}
    </div>
  );
}
