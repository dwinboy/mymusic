import { usePlayerStore } from "@/lib/stores/player-store";
import {
  registerMediaSessionHandlers,
  updateMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPosition,
} from "./media-session";
import { PlayTracker } from "./play-tracker";
import { loadSession, saveSession } from "./session";
import type { AudioQuality } from "@/lib/stores/player-store";
import type { PlayerTrack } from "@/lib/types";

/**
 * Which file to stream. "High" is per-track: most tracks have a 320k encode,
 * but one without simply plays the standard stream rather than failing.
 */
function sourceFor(track: PlayerTrack, quality: AudioQuality): string {
  return quality === "high" && track.highQualityUrl ? track.highQualityUrl : track.audioUrl;
}

const SLEEP_FADE_MS = 8000;
const CROSSFADE_TICK_MS = 50;

/**
 * iPhone and iPad ignore an audio element's volume, so a fade can't be done:
 * two tracks would simply overlap at full volume.
 */
export function volumeIsControllable() {
  if (typeof navigator === "undefined") return true;
  const iOS = /iphone|ipod|ipad/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return !iOS;
}

interface Crossfade {
  outgoing: HTMLAudioElement;
  startedAt: number;
  /** When the incoming track actually started sounding; its fade-in runs from here. */
  inStartedAt: number | null;
  durationMs: number;
  timer: ReturnType<typeof setInterval>;
}

/**
 * Owns the audio elements, created outside the React tree so playback is
 * never interrupted by component unmount/remount during navigation.
 * The Zustand player store is the single source of truth for *intent*
 * (which track, playing or not, volume, seek target); this class reconciles
 * the real <audio> element against that intent, and pushes real playback
 * facts (buffering, actual position, errors) back into the store.
 *
 * One element plays at a time. The second exists only for crossfading: the
 * next track starts on it while the current one fades out, and the two swap
 * roles. Events from whichever element isn't current are ignored.
 */
class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private standby: HTMLAudioElement | null = null;
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
  private crossfade: Crossfade | null = null;
  /** Set while the engine itself is moving the queue on for a crossfade. */
  private advancingForCrossfade = false;
  private canFade = true;
  /** The quality at the last reconcile, to notice a change mid-track. */
  private lastQuality: AudioQuality = "standard";
  /** Throttles session writes: currentTime changes several times a second. */
  private lastSessionSave = 0;
  /** True until the restored session's first play attempt has been made. */
  private resumingSession = false;

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    this.canFade = volumeIsControllable();

    this.audio = this.createElement();
    this.standby = this.createElement();

    try {
      const savedVolume = window.localStorage.getItem("vibebanger:volume");
      const savedCrossfade = window.localStorage.getItem("vibebanger:crossfade");
      const savedQuality = window.localStorage.getItem("vibebanger:quality");
      usePlayerStore.setState({
        ...(savedVolume !== null ? { volume: Math.min(1, Math.max(0, Number(savedVolume))) } : {}),
        ...(savedCrossfade !== null ? { crossfadeSeconds: Math.min(12, Math.max(0, Number(savedCrossfade) || 0)) } : {}),
        ...(savedQuality === "high" || savedQuality === "standard" ? { audioQuality: savedQuality } : {}),
      });
      this.lastQuality = usePlayerStore.getState().audioQuality;
    } catch {
      // Storage unavailable (private mode, disabled cookies) — fall back to defaults.
    }

    // What was playing last time, restored where it stopped.
    //
    // Deferred by a turn so the tree has finished hydrating before the store
    // changes underneath it. Components that render differently for the
    // playing track hold the server's answer until then (see useHydrated in
    // hooks/use-player.ts); this keeps the two from racing at all.
    const restored = loadSession();
    if (restored && usePlayerStore.getState().tracks.length === 0) {
      window.setTimeout(() => {
        // Anything queued in the meantime — a shared "listen from 1:24" link,
        // or a track someone pressed play on — wins over history.
        if (usePlayerStore.getState().tracks.length > 0) return;
        this.resumingSession = restored.shouldResume;
        usePlayerStore.setState({
          tracks: restored.tracks,
          currentIndex: restored.currentIndex,
          currentTime: restored.currentTime,
          // Carries on if it was playing moments ago. The browser may refuse
          // without a gesture, which is why a refusal is silent: the track is
          // loaded and one tap away either way.
          isPlaying: restored.shouldResume,
        });
      }, 0);
    }

    // Closing the tab or backgrounding the app on mobile is the last chance to
    // report how much of the current track was heard, and to record the
    // position someone will come back to.
    window.addEventListener("pagehide", () => {
      this.tracker.flush(true);
      this.persistSession(true);
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

  private createElement() {
    const el = new Audio();
    el.preload = "metadata";
    el.crossOrigin = "anonymous";
    // Every handler speaks for the current element only; the other one is
    // either idle or fading out.
    const current = () => el === this.audio;

    el.addEventListener("timeupdate", () => {
      if (!current()) return;
      usePlayerStore.getState()._setCurrentTime(el.currentTime);
      setMediaSessionPosition(el.duration, el.currentTime);
      this.tracker.onTimeUpdate(el.currentTime, !el.paused);
      this.maybeStartCrossfade(el);
    });
    el.addEventListener("loadedmetadata", () => {
      if (current()) usePlayerStore.getState()._setDuration(el.duration || 0);
    });
    el.addEventListener("waiting", () => {
      if (current()) usePlayerStore.getState()._setLoading(true);
    });
    el.addEventListener("canplay", () => {
      if (current()) usePlayerStore.getState()._setLoading(false);
    });
    el.addEventListener("playing", () => {
      if (!current()) return;
      if (this.crossfade && this.crossfade.inStartedAt === null) this.crossfade.inStartedAt = Date.now();
      usePlayerStore.getState()._setLoading(false);
      usePlayerStore.getState()._setPlaying(true);
      setMediaSessionPlaybackState("playing");
    });
    el.addEventListener("pause", () => {
      if (!current()) return;
      usePlayerStore.getState()._setPlaying(false);
      setMediaSessionPlaybackState("paused");
    });
    el.addEventListener("ended", () => {
      if (!current()) return;
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
    el.addEventListener("error", () => {
      if (!current() || !el.src) return;
      usePlayerStore.getState()._setError("This track couldn't be played.");
      usePlayerStore.getState()._setLoading(false);
    });
    return el;
  }

  private reconcile(state: ReturnType<typeof usePlayerStore.getState>) {
    const audio = this.audio;
    if (!audio) return;

    this.syncSleepTicker(state);

    const track = state.currentTrack();
    const playRequested = state.isPlaying && !this.wasPlaying;
    this.wasPlaying = state.isPlaying;

    // Changing quality swaps the file under the current track. Reload it at
    // the same position rather than making the listener start the song again.
    if (state.audioQuality !== this.lastQuality) {
      this.lastQuality = state.audioQuality;
      if (track && track.id === this.lastTrackId) {
        const wanted = sourceFor(track, state.audioQuality);
        if (audio.src !== wanted) {
          const resumeAt = audio.currentTime;
          const wasPlaying = !audio.paused;
          audio.src = wanted;
          audio.addEventListener(
            "loadedmetadata",
            () => {
              audio.currentTime = resumeAt;
              if (wasPlaying) this.play(audio);
            },
            { once: true }
          );
        }
      }
    }

    // Pausing mid-crossfade stops both tracks, not just the incoming one.
    if (this.crossfade && !state.isPlaying) this.finishCrossfade();

    if (track?.id !== this.lastTrackId) {
      // Skipping or starting something else mid-crossfade cuts the old track.
      if (this.crossfade && !this.advancingForCrossfade) this.finishCrossfade();
      this.advancingForCrossfade = false;

      this.lastTrackId = track?.id ?? null;
      this.replayPending = false;
      if (track) {
        audio.src = sourceFor(track, state.audioQuality);
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
        this.applyVolume(state);
        updateMediaSessionMetadata(track);
        if (state.isPlaying) this.play(audio);
        // Records the play (and listening history for signed-in users).
        this.tracker.start(track.id, track.duration);
        this.persistSession(true);
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

    this.persistSession();
    this.applyVolume(state);
    if (Math.abs(this.lastPersistedVolume - state.volume) > 0.001) {
      this.lastPersistedVolume = state.volume;
      try {
        window.localStorage.setItem("vibebanger:volume", String(state.volume));
      } catch {
        // Ignore — non-critical preference persistence.
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Volume: the listener's setting, times the sleep timer fade, times any
  // crossfade ramp.
  // ---------------------------------------------------------------------------

  /** Records what is playing, at most once every few seconds. */
  private persistSession(force = false) {
    const now = Date.now();
    if (!force && now - this.lastSessionSave < 5000) return;
    this.lastSessionSave = now;
    const state = usePlayerStore.getState();
    saveSession(state.tracks, state.currentIndex, state.currentTime, state.isPlaying);
  }

  private baseVolume(state = usePlayerStore.getState()) {
    return (state.isMuted ? 0 : state.volume) * this.fade;
  }

  private applyVolume(state = usePlayerStore.getState()) {
    if (!this.audio) return;
    const target = this.baseVolume(state) * (this.crossfade ? this.crossfadeLevels().incoming : 1);
    if (Math.abs(this.audio.volume - target) > 0.001) this.audio.volume = target;
    if (this.crossfade) this.crossfade.outgoing.volume = this.baseVolume(state) * this.crossfadeLevels().outgoing;
  }

  // ---------------------------------------------------------------------------
  // Crossfade
  // ---------------------------------------------------------------------------

  private maybeStartCrossfade(el: HTMLAudioElement) {
    const state = usePlayerStore.getState();
    const seconds = state.crossfadeSeconds;
    if (!this.canFade || seconds <= 0 || this.crossfade || !state.isPlaying || el.paused) return;
    if (!Number.isFinite(el.duration) || el.duration < seconds * 3) return;
    if (el.duration - el.currentTime > seconds) return;
    // Nothing to fade into, or the listener asked for this track again or to stop after it.
    if (state.repeatMode === "one" || state.sleepTimer.endOfTrack) return;
    const hasNext = state.currentIndex < state.tracks.length - 1 || (state.repeatMode === "all" && state.tracks.length > 1);
    if (!hasNext || !this.standby) return;

    // The remaining seconds of this track count as heard.
    this.tracker.onEnded();

    const outgoing = el;
    this.audio = this.standby;
    this.standby = outgoing;
    this.crossfade = {
      outgoing,
      startedAt: Date.now(),
      inStartedAt: null,
      durationMs: Math.max(1, (outgoing.duration - outgoing.currentTime) * 1000),
      timer: setInterval(() => this.crossfadeTick(), CROSSFADE_TICK_MS),
    };
    this.advancingForCrossfade = true;
    state.next();
  }

  /** Equal-power curve: the combined loudness stays even through the blend. */
  private crossfadeLevels() {
    const cf = this.crossfade;
    if (!cf) return { incoming: 1, outgoing: 0 };
    const now = Date.now();
    const out = Math.min(1, (now - cf.startedAt) / cf.durationMs);
    const inProgress = cf.inStartedAt === null ? 0 : Math.min(1, (now - cf.inStartedAt) / cf.durationMs);
    return { incoming: Math.sin((inProgress * Math.PI) / 2), outgoing: Math.cos((out * Math.PI) / 2) };
  }

  private crossfadeTick() {
    const cf = this.crossfade;
    if (!cf) return;
    const { incoming } = this.crossfadeLevels();
    const outgoingDone = cf.outgoing.ended || cf.outgoing.paused || Date.now() - cf.startedAt >= cf.durationMs;
    if (outgoingDone && incoming >= 0.999) {
      this.finishCrossfade();
      return;
    }
    if (outgoingDone && !cf.outgoing.paused) cf.outgoing.pause();
    this.applyVolume();
  }

  /** Ends a crossfade now: silences the outgoing track and restores full volume to the current one. */
  private finishCrossfade() {
    const cf = this.crossfade;
    if (!cf) return;
    clearInterval(cf.timer);
    this.crossfade = null;
    cf.outgoing.pause();
    cf.outgoing.removeAttribute("src");
    cf.outgoing.load();
    this.applyVolume();
  }

  // ---------------------------------------------------------------------------
  // Sleep timer
  // ---------------------------------------------------------------------------

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
    this.applyVolume();
  }

  private play(audio: HTMLAudioElement) {
    // Whether this particular attempt is the one restoring a session, read
    // now because the flag is cleared as soon as the attempt settles.
    const resuming = this.resumingSession;
    this.resumingSession = false;

    audio.play().catch((error: unknown) => {
      // AbortError is routine: a pause or a new track interrupted this
      // play() request. Only an autoplay refusal needs handling.
      if (!(error instanceof DOMException) || error.name !== "NotAllowedError") return;

      if (resuming) {
        // A refused auto-resume is the browser's rule, not a failure the
        // listener needs told about — they never asked for it on this page.
        // The track stays loaded and one tap away.
        usePlayerStore.setState({ isPlaying: false });
      } else {
        usePlayerStore.getState()._setError("Playback was blocked. Press play to try again.");
      }
    });
  }

  getElement() {
    return this.audio;
  }
}

export const audioEngine = new AudioEngine();
