import type { PlayerTrack } from "@/lib/types";

/**
 * What was playing, kept across a reload.
 *
 * Closing a tab and coming back to silence and an empty player is the kind of
 * small betrayal people notice; every established player restores the track,
 * paused, exactly where it stopped. Never restored playing: browsers block
 * autoplay, and starting sound on page load would be hostile even if they
 * didn't.
 *
 * This browser only, like the other player preferences.
 */
const KEY = "vibebanger:session";

/** Beyond this, whatever was playing is no longer what you came back for. */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** Enough queue to keep next/previous meaningful, not enough to bloat storage. */
const MAX_TRACKS = 60;

export interface PlayerSession {
  tracks: PlayerTrack[];
  currentIndex: number;
  currentTime: number;
  savedAt: number;
}

export function loadSession(): PlayerSession | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as PlayerSession;
    const track = session?.tracks?.[session.currentIndex];
    // A shape we don't recognise, or one with nothing playable in it, is not
    // worth guessing at.
    if (!track?.id || !track.audioUrl) return null;
    if (!Number.isFinite(session.savedAt) || Date.now() - session.savedAt > MAX_AGE_MS) return null;

    return {
      tracks: session.tracks,
      currentIndex: session.currentIndex,
      currentTime: Number.isFinite(session.currentTime) ? Math.max(0, session.currentTime) : 0,
      savedAt: session.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveSession(tracks: PlayerTrack[], currentIndex: number, currentTime: number) {
  try {
    if (tracks.length === 0 || currentIndex < 0) {
      window.localStorage.removeItem(KEY);
      return;
    }

    // Keep the window of the queue around what's playing, so a long radio run
    // doesn't grow without limit.
    const start = Math.max(0, Math.min(currentIndex - 10, tracks.length - MAX_TRACKS));
    const kept = tracks.slice(start, start + MAX_TRACKS);
    const index = currentIndex - start;

    const session: PlayerSession = {
      // Lyrics can run to kilobytes each and are only needed for what's
      // playing; the rest re-arrive with the page.
      tracks: kept.map((track, i) => (i === index ? track : { ...track, lyrics: null })),
      currentIndex: index,
      currentTime,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Quota or private mode — the session simply isn't restored next time.
  }
}
