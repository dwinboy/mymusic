"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { usePlayerStore } from "@/lib/stores/player-store";

export function useCurrentTrack() {
  return usePlayerStore((s) => s.currentTrack());
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
