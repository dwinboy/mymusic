"use client";

import { ChevronUp, ChevronDown, X, ListX } from "lucide-react";
import { TrackArt } from "@/components/player/track-art";
import { Equalizer } from "@/components/music/equalizer";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { usePlayerStore } from "@/lib/stores/player-store";
import { formatDuration } from "@/lib/utils";

export function QueuePanel() {
  const track = usePlayerStore((s) => s.currentTrack());
  const upcoming = usePlayerStore((s) => s.upcoming());
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  if (!track) {
    return <EmptyState icon={ListX} title="Nothing queued" description="Play a song to start a queue." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">Now playing</p>
        <div className="flex items-center gap-3 rounded-lg bg-surface p-2.5">
          <TrackArt src={track.coverUrl} alt={track.title} className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
            <p className="truncate text-xs text-foreground-muted">{track.artistName}</p>
          </div>
          <Equalizer />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">
            Next up {upcoming.length > 0 && `(${upcoming.length})`}
          </p>
          {upcoming.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearQueue} className="h-7 px-2 text-xs">
              Clear
            </Button>
          )}
        </div>

        {upcoming.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground-muted">Your queue is empty.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {upcoming.map((t, i) => {
              const absoluteIndex = currentIndex + 1 + i;
              return (
                <div key={`${t.id}-${absoluteIndex}`} className="group flex items-center gap-3 rounded-lg p-2 hover:bg-surface-hover">
                  <TrackArt src={t.coverUrl} alt={t.title} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{t.title}</p>
                    <p className="truncate text-xs text-foreground-muted">{t.artistName}</p>
                  </div>
                  <span className="tabular text-xs text-foreground-subtle">{formatDuration(t.duration)}</span>
                  <div className="hidden items-center gap-0.5 group-hover:flex">
                    <button
                      onClick={() => i > 0 && reorderQueue(absoluteIndex, absoluteIndex - 1)}
                      disabled={i === 0}
                      className="flex h-6 w-6 items-center justify-center rounded text-foreground-muted hover:text-foreground disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => i < upcoming.length - 1 && reorderQueue(absoluteIndex, absoluteIndex + 1)}
                      disabled={i === upcoming.length - 1}
                      className="flex h-6 w-6 items-center justify-center rounded text-foreground-muted hover:text-foreground disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromQueue(absoluteIndex)}
                      className="flex h-6 w-6 items-center justify-center rounded text-foreground-muted hover:text-danger"
                      aria-label="Remove from queue"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
