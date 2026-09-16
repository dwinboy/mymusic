import type { PlayerTrack } from "@/lib/types";

export function isMediaSessionSupported(): boolean {
  return typeof window !== "undefined" && "mediaSession" in navigator;
}

export function updateMediaSessionMetadata(track: PlayerTrack) {
  if (!isMediaSessionSupported()) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artistName,
    album: track.albumTitle ?? undefined,
    artwork: track.coverUrl
      ? [
          { src: track.coverUrl, sizes: "96x96", type: "image/jpeg" },
          { src: track.coverUrl, sizes: "256x256", type: "image/jpeg" },
          { src: track.coverUrl, sizes: "512x512", type: "image/jpeg" },
        ]
      : [],
  });
}

export function setMediaSessionPlaybackState(state: "playing" | "paused" | "none") {
  if (!isMediaSessionSupported()) return;
  navigator.mediaSession.playbackState = state;
}

export function setMediaSessionPosition(duration: number, position: number, playbackRate = 1) {
  if (!isMediaSessionSupported() || !("setPositionState" in navigator.mediaSession)) return;
  if (!Number.isFinite(duration) || duration <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration,
      position: Math.min(position, duration),
      playbackRate,
    });
  } catch {
    // Some browsers throw if called with stale values mid-transition — safe to ignore.
  }
}

export interface MediaSessionHandlers {
  play: () => void;
  pause: () => void;
  previousTrack: () => void;
  nextTrack: () => void;
  seekBackward: (offset: number) => void;
  seekForward: (offset: number) => void;
  seekTo: (time: number) => void;
}

export function registerMediaSessionHandlers(handlers: MediaSessionHandlers) {
  if (!isMediaSessionSupported()) return;
  const ms = navigator.mediaSession;

  const safeSet = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      // Unsupported action in this browser — ignore gracefully.
    }
  };

  safeSet("play", handlers.play);
  safeSet("pause", handlers.pause);
  safeSet("previoustrack", handlers.previousTrack);
  safeSet("nexttrack", handlers.nextTrack);
  safeSet("seekbackward", (details) => handlers.seekBackward(details.seekOffset ?? 10));
  safeSet("seekforward", (details) => handlers.seekForward(details.seekOffset ?? 10));
  safeSet("seekto", (details) => {
    if (typeof details.seekTime === "number") handlers.seekTo(details.seekTime);
  });
}
