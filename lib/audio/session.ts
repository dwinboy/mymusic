import type { PlayerTrack } from "@/lib/types";

/**
 * What was playing, kept across a reload.
 *
 * Closing a tab and coming back to silence and an empty player is the kind of
 * small betrayal people notice; every established player restores the track
 * exactly where it stopped.
 *
 * If it was playing moments ago — a reload, a link opened from elsewhere —
 * playback is resumed too, because stopping there was never the listener's
 * decision. Beyond a few minutes it comes back paused: returning to a tab
 * tomorrow should not start sound at you. Browsers block autoplay without a
 * gesture regardless, so a resume is an attempt, never a promise.
 *
 * This browser only, like the other player preferences.
 */
const KEY = "vibebanger:session";

/** Beyond this, whatever was playing is no longer what you came back for. */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** Enough queue to keep next/previous meaningful, not enough to bloat storage. */
const MAX_TRACKS = 60;

/** Within this, a return counts as "still listening" and playback resumes. */
const RESUME_WINDOW_MS = 10 * 60 * 1000;

export interface PlayerSession {
  tracks: PlayerTrack[];
  currentIndex: number;
  currentTime: number;
  savedAt: number;
  /** Whether the music was playing when this was written. */
  wasPlaying: boolean;
  /** Whether to try resuming — recent enough that stopping wasn't intended. */
  shouldResume: boolean;
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

    const wasPlaying = session.wasPlaying === true;
    return {
      tracks: session.tracks,
      currentIndex: session.currentIndex,
      currentTime: Number.isFinite(session.currentTime) ? Math.max(0, session.currentTime) : 0,
      savedAt: session.savedAt,
      wasPlaying,
      shouldResume: wasPlaying && Date.now() - session.savedAt < RESUME_WINDOW_MS,
    };
  } catch {
    return null;
  }
}

export function saveSession(tracks: PlayerTrack[], currentIndex: number, currentTime: number, isPlaying: boolean) {
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
      wasPlaying: isPlaying,
      // Derived on read; stored only so the shape stays self-describing.
      shouldResume: isPlaying,
    };
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Quota or private mode — the session simply isn't restored next time.
  }
}
