"use client";

import Link from "next/link";
import { ChevronDown, Shuffle, SkipBack, SkipForward, Repeat, Repeat1, ListMusic } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TrackArt } from "@/components/player/track-art";
import { PlayButton } from "@/components/player/play-button";
import { ProgressBar } from "@/components/player/progress-bar";
import { LikeButton } from "@/components/music/like-button";
import { DownloadButton } from "@/components/music/download-button";
import { ShareMenu } from "@/components/music/share-menu";
import { Badge } from "@/components/ui/badge";
import { usePlayerStore } from "@/lib/stores/player-store";
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

  if (!track) return null;

  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="full" className="flex flex-col bg-canvas px-6 pb-8 pt-2 md:hidden">
        <div className="flex items-center justify-between py-3">
          <button
            onClick={() => setOpen(false)}
            aria-label="Minimize"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted hover:bg-surface hover:text-foreground"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">
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
          <div
            className={cn(
              "relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl shadow-elevated transition-transform duration-700",
              isPlaying ? "scale-100" : "scale-[0.97]"
            )}
          >
            <TrackArt src={track.coverUrl} alt={track.title} className="h-full w-full" rounded="rounded-none" sizes="400px" />
          </div>

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

            <ProgressBar className="mt-6" />

            <div className="mt-4 flex items-center justify-center gap-6">
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

            <div className="mt-6 flex items-center justify-center gap-8">
              <DownloadButton track={track} size="md" />
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
