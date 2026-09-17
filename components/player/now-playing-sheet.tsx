"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Shuffle, SkipBack, SkipForward, Repeat, Repeat1, ListMusic, FileText } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TrackArt } from "@/components/player/track-art";
import { PlayButton } from "@/components/player/play-button";
import { ProgressBar } from "@/components/player/progress-bar";
import { LikeButton } from "@/components/music/like-button";
import { DownloadButton } from "@/components/music/download-button";
import { ShareMenu } from "@/components/music/share-menu";
import { Badge } from "@/components/ui/badge";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useDominantColor } from "@/hooks/use-dominant-color";
import { cn } from "@/lib/utils";

export function NowPlayingSheet() {
  const track = usePlayerStore((s) => s.currentTrack());
  const isOpen = usePlayerStore((s) => s.isNowPlayingOpen);
  const setOpen = usePlayerStore((s) => s.setNowPlayingOpen);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen);

  const accent = useDominantColor(track?.coverUrl);
  const [showLyrics, setShowLyrics] = useState(false);

  // Lyrics are per track — don't leave the panel open over a song that has
  // none, or over someone else's words.
  const trackId = track?.id;
  useEffect(() => {
    setShowLyrics(false);
  }, [trackId]);

  // --- Swipe: down to dismiss, sideways to change track ------------------
  // Gestures starting on the transport controls or inside the scrollable
  // lyrics are ignored, so dragging the seek bar can't skip a track and
  // scrolling lyrics can't dismiss the sheet.
  const dragStart = useRef<{ x: number; y: number; ignore: boolean } | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (!isOpen) setDragY(0);
  }, [isOpen]);

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    dragStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      ignore: !!target.closest("[data-no-swipe]") || !!target.closest("[data-scrollable]"),
    };
  }

  function handleTouchMove(e: React.TouchEvent) {
    const start = dragStart.current;
    if (!start || start.ignore) return;
    const touch = e.touches[0];
    const dy = touch.clientY - start.y;
    const dx = touch.clientX - start.x;
    // Only follow the finger downward, and only once the gesture is clearly
    // vertical — otherwise a sideways swipe drags the sheet as it goes.
    if (dy > 0 && Math.abs(dy) > Math.abs(dx)) setDragY(dy);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = dragStart.current;
    dragStart.current = null;
    setDragY(0);
    if (!start || start.ignore) return;

    const touch = e.changedTouches[0];
    const dy = touch.clientY - start.y;
    const dx = touch.clientX - start.x;

    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy > 110) setOpen(false);
      return;
    }
    if (Math.abs(dx) > 70) {
      if (dx < 0) next();
      else previous();
    }
  }

  if (!track) return null;

  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;
  const hasLyrics = !!track.lyrics?.trim();

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="full"
        className="flex flex-col px-6 pb-8 pt-2 md:hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          ["--track-color" as string]: accent ?? "var(--color-accent)",
          background:
            "radial-gradient(120% 70% at 50% -10%, color-mix(in srgb, var(--track-color) 34%, transparent), transparent 70%), var(--color-canvas)",
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          // No transition while the finger is down — it should track exactly,
          // then spring back on release.
          transition: dragY
            ? "--track-color 900ms ease-out"
            : "--track-color 900ms ease-out, transform 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="flex items-center justify-between py-3">
          <button
            onClick={() => setOpen(false)}
            aria-label="Minimize"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted hover:bg-surface hover:text-foreground"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <p className="truncate px-3 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
            {track.albumTitle ?? "Playing"}
          </p>
          <button
            onClick={() => setQueueOpen(true)}
            aria-label="Open queue"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted hover:bg-surface hover:text-foreground"
          >
            <ListMusic className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          {showLyrics && hasLyrics ? (
            <div className="flex w-full max-w-sm flex-1 flex-col overflow-hidden">
              <div data-scrollable className="-mx-2 flex-1 overflow-y-auto px-2 py-4">
                <p className="whitespace-pre-line text-lg font-medium leading-loose text-foreground/90">
                  {track.lyrics}
                </p>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl transition-transform duration-700",
                isPlaying ? "scale-100" : "scale-[0.97]"
              )}
              style={{ boxShadow: "0 24px 70px -20px color-mix(in srgb, var(--track-color) 70%, transparent)" }}
            >
              <TrackArt src={track.coverUrl} alt={track.title} className="h-full w-full" rounded="rounded-none" sizes="400px" />
            </div>
          )}

          <div className="w-full max-w-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/song/${track.slug}`} className="truncate text-xl font-semibold text-foreground">
                    {track.title}
                  </Link>
                  {track.isExplicit && (
                    <Badge variant="outline" className="px-1 py-0 text-[9px]">
                      E
                    </Badge>
                  )}
                </div>
                <Link href={`/artist/${track.artistSlug}`} className="text-sm text-foreground-muted hover:underline">
                  {track.artistName}
                </Link>
              </div>
              <LikeButton trackId={track.id} size="lg" className="mt-1 shrink-0" />
            </div>

            <div data-no-swipe>
              <ProgressBar className="mt-6" />
            </div>

            <div data-no-swipe className="mt-4 flex items-center justify-center gap-6">
              <button
                onClick={toggleShuffle}
                aria-pressed={shuffle}
                aria-label="Shuffle"
                className={cn("flex h-9 w-9 items-center justify-center rounded-full", shuffle ? "text-accent" : "text-foreground-muted")}
              >
                <Shuffle className="h-[18px] w-[18px]" />
              </button>
              <button onClick={previous} aria-label="Previous" className="flex h-11 w-11 items-center justify-center rounded-full text-foreground">
                <SkipBack className="h-7 w-7" fill="currentColor" />
              </button>
              <PlayButton track={track} size="lg" />
              <button onClick={next} aria-label="Next" className="flex h-11 w-11 items-center justify-center rounded-full text-foreground">
                <SkipForward className="h-7 w-7" fill="currentColor" />
              </button>
              <button
                onClick={cycleRepeat}
                aria-pressed={repeatMode !== "off"}
                aria-label="Repeat"
                className={cn("flex h-9 w-9 items-center justify-center rounded-full", repeatMode !== "off" ? "text-accent" : "text-foreground-muted")}
              >
                <RepeatIcon className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div data-no-swipe className="mt-6 flex items-center justify-center gap-8">
              <DownloadButton track={track} size="md" />
              {hasLyrics && (
                <button
                  onClick={() => setShowLyrics((v) => !v)}
                  aria-pressed={showLyrics}
                  aria-label={showLyrics ? "Hide lyrics" : "Show lyrics"}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    showLyrics ? "text-accent" : "text-foreground-muted hover:text-foreground"
                  )}
                >
                  <FileText className="h-5 w-5" />
                </button>
              )}
              <ShareMenu
                url={typeof window !== "undefined" ? `${window.location.origin}/song/${track.slug}` : ""}
                title={track.title}
                size="md"
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
