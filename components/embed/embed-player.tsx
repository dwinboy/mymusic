"use client";

import { TrackArt } from "@/components/player/track-art";
import { PlayButton } from "@/components/player/play-button";
import { ProgressBar } from "@/components/player/progress-bar";
import { useDominantColor } from "@/hooks/use-dominant-color";
import { useIsCurrentTrack } from "@/hooks/use-player";
import type { PlayerTrack } from "@/lib/types";

/**
 * The player other sites embed with an iframe. Compact (152px tall) and
 * fluid in width; below 320px wide the artwork gives way to the controls.
 * Links open on Vibe Banger in a new tab, so a listener can continue there.
 */
export function EmbedPlayer({ track, songUrl, artistUrl }: { track: PlayerTrack; songUrl: string; artistUrl: string }) {
  const accent = useDominantColor(track.coverUrl);
  const isCurrent = useIsCurrentTrack(track.id);

  return (
    <div
      className="@container relative h-[152px] w-full overflow-hidden rounded-xl border border-white/10 text-foreground"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent ?? "var(--color-accent)"} 38%, #0a0a0b) 0%, #0a0a0b 85%)`,
      }}
    >
      <div className="flex h-full gap-4 p-4">
        <a href={songUrl} target="_blank" rel="noopener" className="hidden shrink-0 @xs:block" tabIndex={-1} aria-hidden>
          <TrackArt src={track.coverUrl} alt="" className="h-[120px] w-[120px]" rounded="rounded-lg" sizes="120px" />
        </a>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <a href={songUrl} target="_blank" rel="noopener" className="block truncate font-semibold hover:underline">
                {track.title}
              </a>
              <a href={artistUrl} target="_blank" rel="noopener" className="block truncate text-sm text-foreground-muted hover:underline">
                {track.artistName}
              </a>
            </div>
            <a
              href={songUrl}
              target="_blank"
              rel="noopener"
              aria-label="Open on Vibe Banger"
              className="flex shrink-0 items-center gap-1.5 rounded-full py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80 transition-colors hover:text-foreground"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-accent/50">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <span className="hidden @sm:inline">Vibe Banger</span>
            </a>
          </div>

          <div className="mt-auto flex items-center gap-3">
            <PlayButton track={track} queue={[track]} size="md" />
            {isCurrent ? (
              <ProgressBar className="min-w-0 flex-1" />
            ) : (
              <a href={songUrl} target="_blank" rel="noopener" className="truncate text-xs text-foreground-muted hover:text-foreground">
                Listen on Vibe Banger
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
