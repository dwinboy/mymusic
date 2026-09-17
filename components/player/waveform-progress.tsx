"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ProgressBar } from "@/components/player/progress-bar";
import { usePlayerStore } from "@/lib/stores/player-store";
import { cn, formatDuration } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Peaks, fetched once per track per page load and shared by every player view.
// ---------------------------------------------------------------------------

const peaksById = new Map<string, number[]>();
const requested = new Set<string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function requestPeaks(trackId: string) {
  if (requested.has(trackId)) return;
  requested.add(trackId);
  fetch(`/api/tracks/${trackId}/waveform`)
    .then((res) => (res.ok ? res.json() : { peaks: [] }))
    .then((data: { peaks?: number[] }) => {
      peaksById.set(trackId, data.peaks ?? []);
      listeners.forEach((l) => l());
    })
    .catch(() => {
      // Offline or failed: stays on the plain seek bar for this page load.
    });
}

function useWaveform(trackId: string | undefined) {
  useEffect(() => {
    if (trackId) requestPeaks(trackId);
  }, [trackId]);
  return useSyncExternalStore(
    subscribe,
    () => (trackId ? peaksById.get(trackId) : undefined),
    () => undefined
  );
}

/** Averages peaks into fewer bars so each stays wide enough to read. */
function resample(peaks: number[], bars: number) {
  if (bars >= peaks.length) return peaks;
  const out: number[] = [];
  const size = peaks.length / bars;
  for (let i = 0; i < bars; i++) {
    const slice = peaks.slice(Math.floor(i * size), Math.max(Math.floor((i + 1) * size), Math.floor(i * size) + 1));
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}

/** Target width of one bar plus its gap, in px. */
const BAR_PITCH = 5;

/**
 * The seek bar drawn as the track's waveform. Played bars take the track's
 * colour; dragging or tapping seeks. Keyboard users get a standard slider:
 * arrow keys move 5 seconds, Home and End jump to either end.
 */
export function WaveformProgress({
  className,
  layout = "stacked",
  barsClassName = "h-12",
}: {
  className?: string;
  /** stacked: times under the waveform (full-screen player); inline: times either side (player bar). */
  layout?: "stacked" | "inline";
  barsClassName?: string;
}) {
  const trackId = usePlayerStore((s) => s.currentTrack()?.id);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const seek = usePlayerStore((s) => s.seek);
  const peaks = useWaveform(trackId);

  const barsRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [grown, setGrown] = useState<string | undefined>(undefined);

  useEffect(() => {
    const el = barsRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [peaks]);

  // Bars rise from the baseline when a new track's waveform arrives.
  useEffect(() => {
    if (!peaks?.length || grown === trackId) return;
    const id = requestAnimationFrame(() => setGrown(trackId));
    return () => cancelAnimationFrame(id);
  }, [peaks, trackId, grown]);

  const bars = useMemo(() => {
    if (!peaks?.length) return [];
    const count = Math.max(24, Math.min(peaks.length, Math.floor((width || 300) / BAR_PITCH)));
    return resample(peaks, count);
  }, [peaks, width]);

  if (!peaks?.length) {
    return <ProgressBar className={className} />;
  }

  const shownTime = drag ?? currentTime;
  const progress = duration > 0 ? Math.min(1, shownTime / duration) : 0;
  const playhead = Math.floor(progress * bars.length);

  function timeAt(clientX: number) {
    const rect = barsRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration;
  }

  const waveform = (
    <div
      ref={barsRef}
      role="slider"
      data-waveform
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shownTime)}
      aria-valuetext={`${formatDuration(shownTime)} of ${formatDuration(duration)}`}
      className={cn(
        "group relative flex min-w-0 flex-1 cursor-pointer touch-none select-none items-center gap-px rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent",
        barsClassName
      )}
      onPointerDown={(e) => {
        if (!duration) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag(timeAt(e.clientX));
      }}
      onPointerMove={(e) => {
        if (drag !== null) setDrag(timeAt(e.clientX));
      }}
      onPointerUp={(e) => {
        if (drag === null) return;
        seek(timeAt(e.clientX));
        setDrag(null);
      }}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(e) => {
        const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 }[e.key];
        if (step !== undefined) seek(Math.min(duration, Math.max(0, currentTime + step)));
        else if (e.key === "Home") seek(0);
        else if (e.key === "End") seek(Math.max(0, duration - 1));
        else return;
        e.preventDefault();
      }}
    >
      {bars.map((peak, i) => (
        <span
          key={i}
          className={cn(
            "flex-1 rounded-full",
            i < playhead ? "bg-[var(--track-color,var(--color-accent))]" : "bg-foreground/20 group-hover:bg-foreground/30",
            i === playhead && isPlaying && "bg-foreground/60"
          )}
          style={{
            height: grown === trackId ? `${Math.max(8, peak * 100)}%` : "8%",
            // Heights rise left to right; colour follows the playhead without lag.
            transition: `height 600ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 4}ms, background-color 150ms ease-out`,
          }}
        />
      ))}
    </div>
  );

  const time = (seconds: number, align: "left" | "right") => (
    <span className={cn("tabular w-10 shrink-0 text-[11px] text-foreground-subtle", align === "right" ? "text-right" : "text-left")}>
      {formatDuration(seconds)}
    </span>
  );

  if (layout === "inline") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        {time(shownTime, "right")}
        {waveform}
        {time(duration, "left")}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex">{waveform}</div>
      <div className="flex justify-between">
        {time(shownTime, "left")}
        {time(duration, "right")}
      </div>
    </div>
  );
}
