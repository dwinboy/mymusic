"use client";

import { useSyncExternalStore } from "react";

/**
 * The prompt shown when someone without an account tries to save a track.
 *
 * Downloading is offered from three places — the button on a song page, the
 * player, and a track's overflow menu — and all three should explain the same
 * thing in the same words. Rather than give each one its own dialog, they call
 * `openDownloadGate()` and a single dialog mounted in the root layout answers.
 *
 * Note this is a product gate, not a security boundary: streaming audio is
 * served from public storage, so it stops the button, not a determined person
 * with devtools. Gating the button is the point — the file was never secret.
 */
export type DownloadGateState = {
  open: boolean;
  /** The track they were trying to save, so the dialog can name it. */
  trackTitle: string | null;
  /** Where to send them back to once they have an account. */
  returnTo: string | null;
};

const CLOSED: DownloadGateState = { open: false, trackTitle: null, returnTo: null };

let state: DownloadGateState = CLOSED;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openDownloadGate(trackTitle?: string) {
  state = {
    open: true,
    trackTitle: trackTitle ?? null,
    // Captured now rather than in the dialog: by the time they choose, the
    // only thing that knows where they started is this call.
    returnTo: typeof window === "undefined" ? null : window.location.pathname + window.location.search,
  };
  notify();
}

export function closeDownloadGate() {
  if (!state.open) return;
  state = CLOSED;
  notify();
}

export function useDownloadGate(): DownloadGateState {
  return useSyncExternalStore(subscribe, () => state, () => CLOSED);
}
