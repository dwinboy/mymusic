"use client";

import { usePlayerStore } from "@/lib/stores/player-store";
import type { PlayerTrack } from "@/lib/types";

/** How many recently queued songs a refill avoids repeating. */
const RECENT_WINDOW = 20;

export async function fetchRadioTracks(seedId: string, exclude: string[], limit = 15): Promise<PlayerTrack[]> {
  const params = new URLSearchParams({ seed: seedId, limit: String(limit) });
  if (exclude.length) params.set("exclude", exclude.join(","));
  const res = await fetch(`/api/radio?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.tracks ?? [];
}

/**
 * Starts a station from a song. The song plays straight away, inside the tap
 * that asked for it (which iOS requires for audio), and the rest of the
 * station is appended when it arrives.
 */
export async function startRadioFrom(seed: PlayerTrack): Promise<number> {
  const store = usePlayerStore.getState();
  store.startRadio(seed);
  const tracks = await fetchRadioTracks(seed.id, [seed.id]);
  // The listener may have started something else while this loaded.
  if (usePlayerStore.getState().radio?.seedId !== seed.id) return 0;
  usePlayerStore.getState().appendToRadio(tracks);
  return tracks.length;
}

/** Tops up a running station when it's nearly out of songs, seeded by what's playing now. */
export async function refillRadio(): Promise<number> {
  const state = usePlayerStore.getState();
  const current = state.currentTrack();
  if (!state.radio || !current) return 0;
  const recent = state.tracks.slice(-RECENT_WINDOW).map((t) => t.id);
  const tracks = await fetchRadioTracks(current.id, recent);
  if (!usePlayerStore.getState().radio) return 0;
  usePlayerStore.getState().appendToRadio(tracks);
  return tracks.length;
}
