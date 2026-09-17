import { usePlayerStore } from "@/lib/stores/player-store";
import {
  registerMediaSessionHandlers,
  updateMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPosition,
} from "./media-session";
import { PlayTracker } from "./play-tracker";

/**
 * Owns a single HTMLAudioElement created outside the React tree so playback
 * is never interrupted by component unmount/remount during navigation.
 * The Zustand player store is the single source of truth for *intent*
 * (which track, playing or not, volume, seek target); this class reconciles
 * the real <audio> element against that intent, and pushes real playback
 * facts (buffering, actual position, errors) back into the store.
 */
const SLEEP_FADE_MS = 8000;

class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private lastTrackId: string | null = null;
  private tracker = new PlayTracker();
  /**
   * Set when a track ends. Repeat-one (or repeat-all over a single track)
   * replays the same track id, so no track change occurs — without this the
   * loop would never register as a new listen.
   */
  private replayPending = false;
  private initialized = false;
  /** The store's play intent at the last reconcile, to tell a fresh "play" from a stale one. */
  private wasPlaying = false;
  /** Sleep timer volume multiplier: eases from 1 to 0 over the last seconds before stopping. */
  private fade = 1;
  private sleepTicker: ReturnType<typeof setInterval> | null = null;
  private lastPersistedVolume = 1;

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    const audio = new Audio();
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    this.audio = audio;

    try {
      const savedVolume = window.localStorage.getItem("vibebanger:volume");
      if (savedVolume !== null) {
        usePlayerStore.setState({ volume: Math.min(1, Math.max(0, Number(savedVolume))) });
      }
    } catch {
      // Storage unavailable (private mode, disabled cookies) — fall back to default volume.
    }

    audio.addEventListener("timeupdate", () => {
      usePlayerStore.getState()._setCurrentTime(audio.currentTime);
      setMediaSessionPosition(audio.duration, audio.currentTime);
      this.tracker.onTimeUpdate(audio.currentTime, !audio.paused);
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
      this.tracker.onEnded();
      this.replayPending = true;
      const store = usePlayerStore.getState();
      // "Stop at the end of this song": stay on it, paused, instead of moving on.
      if (store.sleepTimer.endOfTrack) {
        store.setSleepTimer(null);
        store.pause();
        return;
      }
      store._onEnded();
    });

    // Closing the tab or backgrounding the app on mobile is the last chance to
    // report how much of the current track was heard.
    window.addEventListener("pagehide", () => this.tracker.flush(true));
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

    this.syncSleepTicker(state);

    const track = state.currentTrack();
    const playRequested = state.isPlaying && !this.wasPlaying;
    this.wasPlaying = state.isPlaying;

    if (track?.id !== this.lastTrackId) {
      this.lastTrackId = track?.id ?? null;
      this.replayPending = false;
      if (track) {
        audio.src = track.audioUrl;
        // A start position set with the track (a shared "from 1:24" link)
        // can only be applied once the new source's metadata has loaded.
        const startAt = state.currentTime;
        if (startAt > 0) {
          const trackId = track.id;
          audio.addEventListener(
            "loadedmetadata",
            () => {
              if (this.lastTrackId !== trackId) return;
              audio.currentTime = Math.min(startAt, Math.max(0, (audio.duration || startAt) - 1));
            },
            { once: true }
          );
        }
        audio.load();
        updateMediaSessionMetadata(track);
        if (state.isPlaying) this.play(audio);
        // Records the play (and listening history for signed-in users).
        this.tracker.start(track.id, track.duration);
      } else {
        this.tracker.flush();
        audio.removeAttribute("src");
        audio.load();
      }
      return;
    }

    if (this.replayPending && track && state.isPlaying) {
      this.replayPending = false;
      this.tracker.start(track.id, track.duration);
    }

    // Seek before reconciling play state: repeat-one rewinds an ended track,
    // and it can only start playing again once it's no longer at the end.
    if (Math.abs(audio.currentTime - state.currentTime) > 0.75) {
      audio.currentTime = state.currentTime;
    }

    // An ended track reports paused while the store still says playing,
    // until the ended handler moves the queue on. Calling play() in that gap
    // restarted the finished track, and the pause that followed cancelled
    // the next one too, so a queue stopped after its first song.
    if (state.isPlaying && audio.paused && audio.ended && playRequested) {
      // Pressing play on a finished track starts it over. The rewind goes
      // through the store, which owns the position: moving only the element
      // gets undone by the next reconcile. That nested reconcile also plays.
      usePlayerStore.getState().seek(0);
      return;
    }
    if (state.isPlaying && audio.paused && !audio.ended) {
      this.play(audio);
    } else if (!state.isPlaying && !audio.paused) {
      audio.pause();
    }

    const targetVolume = (state.isMuted ? 0 : state.volume) * this.fade;
    if (Math.abs(audio.volume - targetVolume) > 0.001) {
      audio.volume = targetVolume;
    }
    if (Math.abs(this.lastPersistedVolume - state.volume) > 0.001) {
      this.lastPersistedVolume = state.volume;
      try {
        window.localStorage.setItem("vibebanger:volume", String(state.volume));
      } catch {
        // Ignore — non-critical preference persistence.
      }
    }
  }

  private syncSleepTicker(state: ReturnType<typeof usePlayerStore.getState>) {
    const active = state.sleepTimer.endsAt !== null || state.sleepTimer.endOfTrack;
    if (active && !this.sleepTicker) {
      this.sleepTicker = setInterval(() => this.sleepTick(), 250);
    } else if (!active && this.sleepTicker) {
      clearInterval(this.sleepTicker);
      this.sleepTicker = null;
      this.setFade(1);
    }
  }

  private sleepTick() {
    const audio = this.audio;
    const store = usePlayerStore.getState();
    const { endsAt, endOfTrack } = store.sleepTimer;
    if (!audio) return;

    let remainingMs: number | null = null;
    if (endsAt !== null) remainingMs = endsAt - Date.now();
    else if (endOfTrack && Number.isFinite(audio.duration) && audio.duration > 0) {
      remainingMs = (audio.duration - audio.currentTime) * 1000;
    }
    if (remainingMs === null) return;

    if (endsAt !== null && remainingMs <= 0) {
      // Pause first, at zero volume, then restore the volume for next time.
      store.pause();
      store.setSleepTimer(null);
      return;
    }
    // Ease out rather than cutting off mid-phrase. (iOS ignores element
    // volume, so there it simply stops.)
    this.setFade(store.isPlaying ? Math.min(1, Math.max(0, remainingMs / SLEEP_FADE_MS)) : 1);
  }

  private setFade(fade: number) {
    if (Math.abs(this.fade - fade) < 0.01) return;
    this.fade = fade;
    const state = usePlayerStore.getState();
    if (this.audio) this.audio.volume = (state.isMuted ? 0 : state.volume) * fade;
  }

  private play(audio: HTMLAudioElement) {
    audio.play().catch((error: unknown) => {
      // AbortError is routine: a pause or a new track interrupted this
      // play() request. Only an autoplay refusal needs the listener.
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        usePlayerStore.getState()._setError("Playback was blocked. Press play to try again.");
      }
    });
  }

  getElement() {
    return this.audio;
  }
}

export const audioEngine = new AudioEngine();
