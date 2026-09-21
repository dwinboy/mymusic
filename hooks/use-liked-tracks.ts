"use client";

import { useSyncExternalStore } from "react";

/**
 * Which tracks this listener has liked, shared across the app.
 *
 * Pages that render a list already know the answer — the server sends it with
 * the rows. The mini player doesn't: it shows whatever is playing, which can
 * be a track from a page that was never rendered. Rather than ask the server
 * on every track change, the set is fetched once and then kept current by the
 * like buttons themselves, so liking a song anywhere is reflected everywhere
 * immediately.
 *
 * Loaded lazily on first use, and only once: an anonymous listener never
 * triggers the request at all, because nothing they can do would fill it.
 */
let liked: Set<string> | null = null;
let loading = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  void load();
  return () => listeners.delete(listener);
}

async function load() {
  if (liked || loading || typeof window === "undefined") return;
  loading = true;
  try {
    const response = await fetch("/api/favorites");
    const data = await response.json().catch(() => ({}));
    liked = new Set<string>(Array.isArray(data.trackIds) ? data.trackIds : []);
    notify();
  } catch {
    // An empty set is the right answer when we can't know: the heart shows
    // unfilled, and pressing it still works.
    liked = new Set<string>();
    notify();
  } finally {
    loading = false;
  }
}

/** Called by the like buttons so every other view agrees with what just happened. */
export function markLiked(trackId: string, isLiked: boolean) {
  liked ??= new Set<string>();
  if (isLiked) liked.add(trackId);
  else liked.delete(trackId);
  notify();
}

export function useIsLiked(trackId: string | undefined): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (!!trackId && liked?.has(trackId)) ?? false,
    () => false
  );
}
