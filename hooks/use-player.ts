"use client";

import { useSyncExternalStore } from "react";
import { usePlayerStore } from "@/lib/stores/player-store";

const noSubscribe = () => () => {};

/**
 * False while the server's HTML is being hydrated, true afterwards.
 *
 * The player restores what was playing from this browser's own storage, which
 * the server knew nothing about. Any component that renders differently for
 * the playing track — a row showing an equalizer instead of its number — has
 * to give the server's answer until hydration is done, or React finds the two
 * disagree and throws the whole tree away.
 */
function useHydrated() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false
  );
}

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
