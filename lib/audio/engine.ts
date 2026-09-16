import { usePlayerStore } from "@/lib/stores/player-store";
import {
  registerMediaSessionHandlers,
  updateMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPosition,
} from "./media-session";

/**
 * Owns a single HTMLAudioElement created outside the React tree so playback
 * is never interrupted by component unmount/remount during navigation.
 * The Zustand player store is the single source of truth for *intent*
 * (which track, playing or not, volume, seek target); this class reconciles
 * the real <audio> element against that intent, and pushes real playback
 * facts (buffering, actual position, errors) back into the store.
 */
class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private lastTrackId: string | null = null;
  private initialized = false;
  private lastPersistedVolume = 1;

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    const audio = new Audio();
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    this.audio = audio;

    try {
      const savedVolume = window.localStorage.getItem("lumen:volume");
      if (savedVolume !== null) {
        usePlayerStore.setState({ volume: Math.min(1, Math.max(0, Number(savedVolume))) });
      }
    } catch {
      // Storage unavailable (private mode, disabled cookies) — fall back to default volume.
    }

    audio.addEventListener("timeupdate", () => {
      usePlayerStore.getState()._setCurrentTime(audio.currentTime);
      setMediaSessionPosition(audio.duration, audio.currentTime);
    });
    audio.addEventListener("loadedmetadata", () => {
      usePlayerStore.getState()._setDuration(audio.duration || 0);
    });
    audio.addEventListener("waiting", () => usePlayerStore.getState()._setLoading(true));
    audio.addEventListener("canplay", () => usePlayerStore.getState()._setLoading(false));
    audio.addEventListener("playing", () => {
      usePlayerStore.getState()._setLoading(false);
      usePlayerStore.getState()._setPlaying(true);
      setMediaSessionPlaybackState("playing");
    });
    audio.addEventListener("pause", () => {
      usePlayerStore.getState()._setPlaying(false);
      setMediaSessionPlaybackState("paused");
    });
    audio.addEventListener("ended", () => {
      usePlayerStore.getState()._onEnded();
    });
    audio.addEventListener("error", () => {
      if (!audio.src) return;
      usePlayerStore.getState()._setError("This track couldn't be played.");
      usePlayerStore.getState()._setLoading(false);
    });

    registerMediaSessionHandlers({
      play: () => usePlayerStore.getState().resume(),
      pause: () => usePlayerStore.getState().pause(),
      previousTrack: () => usePlayerStore.getState().previous(),
      nextTrack: () => usePlayerStore.getState().next(),
      seekBackward: (offset) => {
        const s = usePlayerStore.getState();
        s.seek(Math.max(0, s.currentTime - offset));
      },
      seekForward: (offset) => {
        const s = usePlayerStore.getState();
        s.seek(Math.min(s.duration, s.currentTime + offset));
      },
      seekTo: (time) => usePlayerStore.getState().seek(time),
    });

    usePlayerStore.subscribe((state) => this.reconcile(state));
    // Reconcile once immediately in case a track was queued before init().
    this.reconcile(usePlayerStore.getState());
  }

  private reconcile(state: ReturnType<typeof usePlayerStore.getState>) {
    const audio = this.audio;
    if (!audio) return;

    const track = state.currentTrack();

    if (track?.id !== this.lastTrackId) {
      this.lastTrackId = track?.id ?? null;
      if (track) {
        audio.src = track.audioUrl;
        audio.load();
        updateMediaSessionMetadata(track);
        if (state.isPlaying) {
          audio.play().catch(() => {
            usePlayerStore.getState()._setError("Playback was blocked. Press play to try again.");
          });
        }
        fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId: track.id }),
        }).catch(() => {
          // Best-effort — listening history is a convenience, not critical path.
        });
      } else {
        audio.removeAttribute("src");
        audio.load();
      }
      return;
    }

    if (state.isPlaying && audio.paused) {
      audio.play().catch(() => {
        usePlayerStore.getState()._setError("Playback was blocked. Press play to try again.");
      });
    } else if (!state.isPlaying && !audio.paused) {
      audio.pause();
    }

    const targetVolume = state.isMuted ? 0 : state.volume;
    if (Math.abs(audio.volume - targetVolume) > 0.001) {
      audio.volume = targetVolume;
    }
    if (Math.abs(this.lastPersistedVolume - state.volume) > 0.001) {
      this.lastPersistedVolume = state.volume;
      try {
        window.localStorage.setItem("lumen:volume", String(state.volume));
      } catch {
        // Ignore — non-critical preference persistence.
      }
    }

    if (Math.abs(audio.currentTime - state.currentTime) > 0.75) {
      audio.currentTime = state.currentTime;
    }
  }

  getElement() {
    return this.audio;
  }
}

export const audioEngine = new AudioEngine();
