"use client";

import { usePlayerStore } from "@/lib/stores/player-store";

export function useCurrentTrack() {
  return usePlayerStore((s) => s.currentTrack());
}

export function useIsCurrentTrack(trackId: string | undefined) {
  return usePlayerStore((s) => !!trackId && s.currentTrack()?.id === trackId);
}

export function useIsTrackPlaying(trackId: string | undefined) {
  return usePlayerStore((s) => !!trackId && s.isPlaying && s.currentTrack()?.id === trackId);
}
