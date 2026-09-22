"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Play, Pause, RotateCcw, Undo2, Save, Loader2, Eye, Rewind, FastForward, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SyncedLyrics } from "@/components/player/synced-lyrics";
import { splitForTiming, toLrc, formatLrcTime, type TimingLine } from "@/lib/lyrics";
import { cn } from "@/lib/utils";

const SPEEDS = [0.75, 1, 1.25];

/**
 * Turns written lyrics into timed ones by tapping along with the song.
 *
 * The player has read LRC since it was built, but the only way to produce it
 * was typing `[00:12.30]` in front of every line by hand — which is why not
 * one track has ever had timings. This is the missing half: press play, tap
 * once as each line starts, save.
 *
 * Tap latency is systematic rather than random — people hear the line, then
 * move — so the nudge control shifts every stamp at once instead of asking
 * anyone to fix forty lines individually.
 */
export function LyricsTimer({
  trackId,
  title,
  audioUrl,
  lyrics,
}: {
  trackId: string;
  title: string;
  audioUrl: string;
  lyrics: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  const [lines, setLines] = useState<TimingLine[]>(() => splitForTiming(lyrics));
  const [history, setHistory] = useState<TimingLine[][]>([]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const timeable = useMemo(() => lines.map((l, i) => ({ l, i })).filter(({ l }) => l.text !== ""), [lines]);
  const nextIndex = useMemo(() => timeable.find(({ l }) => l.time === null)?.i ?? -1, [timeable]);
  const stampedCount = timeable.filter(({ l }) => l.time !== null).length;
  const remaining = timeable.length - stampedCount;

  const push = useCallback((next: TimingLine[]) => {
    setHistory((h) => [...h.slice(-80), lines]);
    setLines(next);
    setSaved(false);
  }, [lines]);

  /** Stamp the next untimed line with where the song is now. */
  const stamp = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || nextIndex === -1) return;
    const at = audio.currentTime;
    setHistory((h) => [...h.slice(-80), lines]);
    setLines((prev) => prev.map((l, i) => (i === nextIndex ? { ...l, time: at } : l)));
    setSaved(false);
  }, [nextIndex, lines]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setLines(h[h.length - 1]);
      setSaved(false);
      return h.slice(0, -1);
    });
  }, []);

  /** Shift every stamp together — what tap latency actually needs. */
  function nudge(delta: number) {
    push(lines.map((l) => (l.time === null ? l : { ...l, time: Math.max(0, l.time + delta) })));
  }

  function clearAll() {
    push(lines.map((l) => ({ ...l, time: null })));
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  function seekBy(delta: number) {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
  }

  // Space stamps, because the hand that's tapping shouldn't have to aim.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const el = event.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      if (event.code === "Space") {
        event.preventDefault();
        stamp();
      } else if (event.key === "k" || event.key === "K") {
        event.preventDefault();
        toggle();
      } else if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        event.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stamp, undo]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // Keep the line about to be stamped in view without stealing the scroll
  // from someone reading further down.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [nextIndex]);

  async function save() {
    setSaving(true);
    try {
      const form = new FormData();
      form.set("lyrics", toLrc(lines));
      const response = await fetch(`/api/creator/tracks/${trackId}`, { method: "PATCH", body: form });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast({ title: data.error ?? "That didn't save.", variant: "danger" });
        return;
      }
      setSaved(true);
      toast({ title: "Timings saved", description: "The lyrics now follow the song." });
      router.refresh();
    } catch {
      toast({ title: "That didn't save.", variant: "danger" });
    } finally {
      setSaving(false);
    }
  }

  const previewTrack = useMemo(() => toLrc(lines), [lines]);

  return (
    <div className="flex flex-col gap-6">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
      />

      {/* Transport */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <Button size="icon-lg" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="rounded-full">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <div className="min-w-0 flex-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={time}
              onChange={(e) => {
                if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
              }}
              aria-label="Position"
              className="w-full accent-[var(--color-accent)]"
            />
            <div className="flex justify-between text-xs tabular-nums text-foreground-subtle">
              <span>{formatLrcTime(time)}</span>
              <span>{formatLrcTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => seekBy(-5)}>
            <Rewind className="mr-1.5 h-3.5 w-3.5" /> 5s
          </Button>
          <Button variant="secondary" size="sm" onClick={() => seekBy(5)}>
            <FastForward className="mr-1.5 h-3.5 w-3.5" /> 5s
          </Button>
          <div className="flex items-center gap-1 rounded-lg bg-canvas p-1" role="radiogroup" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={speed === s}
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  speed === s ? "bg-surface-active text-foreground" : "text-foreground-subtle hover:text-foreground"
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The tap button — the whole tool, really */}
      <div className="sticky top-2 z-10">
        <Button
          size="lg"
          onClick={stamp}
          disabled={nextIndex === -1}
          className="h-16 w-full text-base shadow-elevated"
        >
          {nextIndex === -1 ? (
            <>
              <Check className="mr-2 h-5 w-5" /> Every line is timed
            </>
          ) : (
            <>Tap as this line starts · {remaining} to go</>
          )}
        </Button>
        <p className="mt-1.5 text-center text-xs text-foreground-subtle">
          Press <kbd className="rounded bg-surface px-1.5 py-0.5 font-sans">Space</kbd> instead, if you have a keyboard —{" "}
          <kbd className="rounded bg-surface px-1.5 py-0.5 font-sans">K</kbd> plays and pauses.
        </p>
      </div>

      {/* Adjustments */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-foreground-subtle">Everything a touch</span>
        <Button variant="secondary" size="sm" onClick={() => nudge(-0.2)} disabled={stampedCount === 0}>
          earlier
        </Button>
        <Button variant="secondary" size="sm" onClick={() => nudge(0.2)} disabled={stampedCount === 0}>
          later
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={undo} disabled={history.length === 0}>
          <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Undo
        </Button>
        <Button variant="ghost" size="sm" onClick={clearAll} disabled={stampedCount === 0}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Start over
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPreview((v) => !v)} aria-pressed={preview}>
          <Eye className="mr-1.5 h-3.5 w-3.5" /> {preview ? "Back to timing" : "Preview"}
        </Button>
      </div>

      {preview ? (
        <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-border bg-canvas-raised px-5">
          <SyncedLyrics lyrics={previewTrack} />
        </div>
      ) : (
        <ol className="flex flex-col gap-1">
          {lines.map((line, index) =>
            line.text === "" ? (
              <li key={index} className="h-3" aria-hidden />
            ) : (
              <li
                key={index}
                ref={index === nextIndex ? activeRef : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                  index === nextIndex ? "bg-accent/10 ring-1 ring-accent/40" : "hover:bg-surface"
                )}
              >
                <button
                  onClick={() => {
                    if (line.time === null) return;
                    if (audioRef.current) audioRef.current.currentTime = line.time;
                  }}
                  disabled={line.time === null}
                  aria-label={line.time === null ? "Not timed yet" : `Jump to ${formatLrcTime(line.time)}`}
                  className={cn(
                    "w-[4.5rem] shrink-0 rounded-md px-1.5 py-1 text-xs tabular-nums transition-colors",
                    line.time === null
                      ? "text-foreground-subtle/50"
                      : "bg-surface text-accent hover:bg-surface-active"
                  )}
                >
                  {line.time === null ? "—" : formatLrcTime(line.time)}
                </button>
                <span className={cn("min-w-0 flex-1 text-sm", line.time === null ? "text-foreground-muted" : "text-foreground")}>
                  {line.text}
                </span>
                {line.time !== null && (
                  <button
                    onClick={() => push(lines.map((l, i) => (i === index ? { ...l, time: null } : l)))}
                    className="shrink-0 text-xs text-foreground-subtle underline underline-offset-2 hover:text-foreground"
                  >
                    clear
                  </button>
                )}
              </li>
            )
          )}
        </ol>
      )}

      {/* Save */}
      <div className="sticky bottom-3 flex items-center gap-3 rounded-2xl border border-border bg-canvas-raised/95 p-3 backdrop-blur-xl">
        <p className="min-w-0 flex-1 text-xs text-foreground-muted">
          {remaining === 0
            ? `All ${stampedCount} lines timed.`
            : `${stampedCount} of ${timeable.length} timed — the rest will still show, they just won't light up.`}
        </p>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/creator/tracks/${trackId}`}>Back</Link>
        </Button>
        <Button onClick={save} disabled={saving || saved}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          {saved ? "Saved" : "Save timings"}
        </Button>
      </div>

      <p className="sr-only" aria-live="polite">
        {remaining === 0 ? "All lines timed" : `${remaining} lines left to time`}
      </p>
      <span className="sr-only">{title}</span>
    </div>
  );
}
