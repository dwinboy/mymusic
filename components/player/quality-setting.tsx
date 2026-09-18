"use client";

import { usePlayerStore } from "@/lib/stores/player-store";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "standard", label: "Standard", hint: "192 kbps" },
  { value: "high", label: "High", hint: "320 kbps" },
] as const;

/**
 * Which encode to stream. Every track has the standard one; high quality is
 * the same file the download uses, so a track without a download has nothing
 * better to offer and quietly stays on standard.
 */
export function QualitySetting() {
  const quality = usePlayerStore((s) => s.audioQuality);
  const setQuality = usePlayerStore((s) => s.setAudioQuality);
  const hasHigh = usePlayerStore((s) => !!s.currentTrack()?.highQualityUrl);

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-sm font-medium text-foreground">Sound quality</p>
      <p className="text-xs text-foreground-muted">
        {quality === "high" && !hasHigh
          ? "This track is only available in standard quality."
          : "High uses more data. Changing it keeps your place in the song."}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-surface p-1" role="radiogroup" aria-label="Sound quality">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            role="radio"
            aria-checked={quality === option.value}
            onClick={() => setQuality(option.value)}
            className={cn(
              "flex h-9 flex-col items-center justify-center rounded-md text-xs font-medium leading-tight transition-colors",
              quality === option.value ? "bg-canvas-raised text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground"
            )}
          >
            {option.label}
            <span className="text-[10px] font-normal text-foreground-subtle">{option.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
