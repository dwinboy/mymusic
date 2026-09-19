"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { usePlayerStore } from "@/lib/stores/player-store";

export function useCurrentTrack() {
  return usePlayerStore((s) => s.currentTrack());
}

/**
 * What plays after this one, or null at the end of the queue.
 *
 * Returns the stored object rather than building one, so the reference stays
 * equal between renders and the store doesn't re-render on every tick.
 * Gated on hydration like the rest: the server has no queue, and rendering a
 * next title before hydration would mismatch.
 */
export function useNextTrack() {
  const hydrated = useHydrated();
  const next = usePlayerStore((s) => s.tracks[s.currentIndex + 1] ?? null);
  return hydrated ? next : null;
}

export function useIsCurrentTrack(trackId: string | undefined) {
  const hydrated = useHydrated();
  const isCurrent = usePlayerStore((s) => !!trackId && s.currentTrack()?.id === trackId);
  return hydrated && isCurrent;
}

export function useIsTrackPlaying(trackId: string | undefined) {
  const hydrated = useHydrated();
  const isPlaying = usePlayerStore((s) => !!trackId && s.isPlaying && s.currentTrack()?.id === trackId);
  return hydrated && isPlaying;
}
