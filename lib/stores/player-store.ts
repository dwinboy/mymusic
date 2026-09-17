import { create } from "zustand";
import type { PlayerTrack } from "@/lib/types";

export type RepeatMode = "off" | "all" | "one";

/** Stop after a number of minutes, or when the current track finishes. */
export type SleepTimerOption = number | "end-of-track";

export interface SleepTimer {
  /** Epoch ms when playback stops; null for end-of-track or no timer. */
  endsAt: number | null;
  endOfTrack: boolean;
}

interface PlayerState {
  tracks: PlayerTrack[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  loading: boolean;
  error: string | null;
  isNowPlayingOpen: boolean;
  isQueueOpen: boolean;
  /** Shuffle keeps the original order here so it can be restored. */
  unshuffledTracks: PlayerTrack[] | null;
  sleepTimer: SleepTimer;
  /** Set while playing a radio station; its queue keeps refilling with similar songs. */
  radio: { seedId: string; seedTitle: string } | null;
  /** Seconds to blend one track into the next; 0 plays them back to back. */
  crossfadeSeconds: number;

  currentTrack: () => PlayerTrack | null;
  upcoming: () => PlayerTrack[];

  /** startAt (seconds) begins mid-track, e.g. from a "listen from 1:24" link. */
  playTrack: (track: PlayerTrack, queue?: PlayerTrack[], startAt?: number) => void;
  playQueue: (tracks: PlayerTrack[], startIndex?: number) => void;
  /** Plays the seed now; the station's songs are appended as they arrive. */
  startRadio: (seed: PlayerTrack) => void;
  appendToRadio: (tracks: PlayerTrack[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: PlayerTrack) => void;
  playNext: (track: PlayerTrack) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  setNowPlayingOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  /** null turns the timer off. */
  setSleepTimer: (option: SleepTimerOption | null) => void;
  setCrossfadeSeconds: (seconds: number) => void;

  // Called by the audio engine to reflect real playback state.
  _setCurrentTime: (time: number) => void;
  _setDuration: (duration: number) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
  _setPlaying: (playing: boolean) => void;
  _onEnded: () => void;
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  tracks: [],
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  shuffle: false,
  repeatMode: "off",
  loading: false,
  error: null,
  isNowPlayingOpen: false,
  isQueueOpen: false,
  unshuffledTracks: null,
  sleepTimer: { endsAt: null, endOfTrack: false },
  radio: null,
  crossfadeSeconds: 0,

  currentTrack: () => {
    const { tracks, currentIndex } = get();
    return tracks[currentIndex] ?? null;
  },

  upcoming: () => {
    const { tracks, currentIndex } = get();
    return tracks.slice(currentIndex + 1);
  },

  playTrack: (track, queue, startAt = 0) => {
    const list = queue && queue.length > 0 ? queue : [track];
    const index = list.findIndex((t) => t.id === track.id);
    set({
      tracks: list,
      currentIndex: index >= 0 ? index : 0,
      isPlaying: true,
      currentTime: Math.max(0, startAt),
      error: null,
      shuffle: false,
      unshuffledTracks: null,
      radio: null,
    });
  },

  playQueue: (tracks, startIndex = 0) => {
    set({
      tracks,
      currentIndex: startIndex,
      isPlaying: true,
      currentTime: 0,
      error: null,
      shuffle: false,
      unshuffledTracks: null,
      radio: null,
    });
  },

  startRadio: (seed) => {
    set({
      tracks: [seed],
      currentIndex: 0,
      isPlaying: true,
      currentTime: 0,
      error: null,
      shuffle: false,
      unshuffledTracks: null,
      repeatMode: "off",
      radio: { seedId: seed.id, seedTitle: seed.title },
    });
  },

  appendToRadio: (incoming) =>
    set((s) => {
      if (!s.radio) return s;
      // Never queue the same song twice in a row.
      const last = s.tracks[s.tracks.length - 1];
      const tracks = incoming.filter((t, i) => (i === 0 ? t.id !== last?.id : t.id !== incoming[i - 1].id));
      return { tracks: [...s.tracks, ...tracks] };
    }),

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  next: () => {
    const { tracks, currentIndex, repeatMode } = get();
    if (tracks.length === 0) return;

    if (repeatMode === "one") {
      set({ currentTime: 0, isPlaying: true });
      return;
    }

    const isLast = currentIndex >= tracks.length - 1;
    if (isLast) {
      if (repeatMode === "all") {
        set({ currentIndex: 0, currentTime: 0, isPlaying: true });
      } else {
        set({ isPlaying: false });
      }
      return;
    }

    set({ currentIndex: currentIndex + 1, currentTime: 0, isPlaying: true, error: null });
  },

  previous: () => {
    const { tracks, currentIndex, currentTime } = get();
    if (tracks.length === 0) return;

    // Restart current track if more than 3s in, otherwise go back.
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
    set({ currentIndex: prevIndex, currentTime: 0, isPlaying: true, error: null });
  },

  seek: (time) => set({ currentTime: time }),

  setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)), isMuted: volume === 0 }),

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

  toggleShuffle: () => {
    const { shuffle, tracks, currentIndex, unshuffledTracks } = get();
    const current = tracks[currentIndex];

    if (!shuffle) {
      const rest = tracks.filter((_, i) => i !== currentIndex);
      const shuffled = current ? [current, ...shuffleArray(rest)] : shuffleArray(tracks);
      set({ shuffle: true, unshuffledTracks: tracks, tracks: shuffled, currentIndex: 0 });
    } else {
      const original = unshuffledTracks ?? tracks;
      const restoredIndex = current ? original.findIndex((t) => t.id === current.id) : 0;
      set({
        shuffle: false,
        tracks: original,
        unshuffledTracks: null,
        currentIndex: restoredIndex >= 0 ? restoredIndex : 0,
      });
    }
  },

  cycleRepeat: () =>
    set((s) => ({
      repeatMode: s.repeatMode === "off" ? "all" : s.repeatMode === "all" ? "one" : "off",
    })),

  addToQueue: (track) => set((s) => ({ tracks: [...s.tracks, track] })),

  playNext: (track) =>
    set((s) => {
      const tracks = [...s.tracks];
      tracks.splice(s.currentIndex + 1, 0, track);
      return { tracks };
    }),

  removeFromQueue: (index) =>
    set((s) => {
      if (index <= s.currentIndex) return s;
      const tracks = s.tracks.filter((_, i) => i !== index);
      return { tracks };
    }),

  reorderQueue: (fromIndex, toIndex) =>
    set((s) => {
      if (fromIndex <= s.currentIndex || toIndex <= s.currentIndex) return s;
      const tracks = [...s.tracks];
      const [moved] = tracks.splice(fromIndex, 1);
      tracks.splice(toIndex, 0, moved);
      return { tracks };
    }),

  clearQueue: () =>
    set((s) => ({
      tracks: s.currentIndex >= 0 ? s.tracks.slice(0, s.currentIndex + 1) : [],
      // Clearing a radio queue means "stop after this one", not "refill it".
      radio: null,
    })),

  setNowPlayingOpen: (open) => set({ isNowPlayingOpen: open }),
  setQueueOpen: (open) => set({ isQueueOpen: open }),
  setCrossfadeSeconds: (seconds) => {
    set({ crossfadeSeconds: seconds });
    try {
      window.localStorage.setItem("vibebanger:crossfade", String(seconds));
    } catch {
      // Non-critical preference.
    }
  },
  setSleepTimer: (option) =>
    set({
      sleepTimer:
        option === null
          ? { endsAt: null, endOfTrack: false }
          : option === "end-of-track"
            ? { endsAt: null, endOfTrack: true }
            : { endsAt: Date.now() + option * 60_000, endOfTrack: false },
    }),

  _setCurrentTime: (time) => set({ currentTime: time }),
  _setDuration: (duration) => set({ duration }),
  _setLoading: (loading) => set({ loading }),
  _setError: (error) => set({ error, isPlaying: error ? false : get().isPlaying }),
  _setPlaying: (playing) => set({ isPlaying: playing }),
  _onEnded: () => get().next(),
}));
