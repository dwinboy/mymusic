"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, X, ListX } from "lucide-react";
import { TrackArt } from "@/components/player/track-art";
import { Equalizer } from "@/components/music/equalizer";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { usePlayerStore } from "@/lib/stores/player-store";
import { cn, formatDuration } from "@/lib/utils";
import { CrossfadeSetting } from "@/components/player/crossfade-setting";
import { QualitySetting } from "@/components/player/quality-setting";

export function QueuePanel() {
  const track = usePlayerStore((s) => s.currentTrack());
  // Select the stored array and derive from it: a selector that returns a
  // fresh slice on every read never compares equal, and React bails out of
  // the endless re-render by crashing the page.
  const tracks = usePlayerStore((s) => s.tracks);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const upcoming = useMemo(() => tracks.slice(currentIndex + 1), [tracks, currentIndex]);
  const radio = usePlayerStore((s) => s.radio);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  const listRef = useRef<HTMLDivElement>(null);
  /** The live drag, outside state so pointermove doesn't wait on a render. */
  const dragRef = useRef<{ pointerId: number; index: number } | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  /** Row to restore focus to after a keyboard move re-renders the list. */
  const focusAfterMove = useRef<number | null>(null);

  useEffect(() => {
    const target = focusAfterMove.current;
    if (target === null) return;
    focusAfterMove.current = null;
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-queue-row]");
    rows?.[target]?.querySelector<HTMLButtonElement>("[data-drag-handle]")?.focus();
  });

  /** Which row the pointer is over, by row midpoints read fresh each move. */
  const rowUnder = useCallback((clientY: number) => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-queue-row]");
    if (!rows || rows.length === 0) return null;
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length - 1;
  }, []);

  /**
   * Listens on the window rather than capturing the pointer on the handle.
   * Reordering replaces the row's DOM node, and a node that leaves the
   * document loses any capture it held — after which moves only arrived while
   * the pointer happened to be over another handle, and stopped the moment it
   * crossed a gap or a title.
   */
  function startDrag(event: React.PointerEvent<HTMLButtonElement>, absoluteIndex: number) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Stops the touch from scrolling the sheet instead of dragging the row.
    event.preventDefault();
    dragRef.current = { pointerId: event.pointerId, index: absoluteIndex };
    setDraggingIndex(absoluteIndex);

    const onMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== moveEvent.pointerId) return;
      moveEvent.preventDefault();
      const row = rowUnder(moveEvent.clientY);
      if (row === null) return;
      const target = currentIndex + 1 + row;
      if (target === drag.index) return;
      reorderQueue(drag.index, target);
      drag.index = target;
      setDraggingIndex(target);
    };

    const onEnd = (endEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== endEvent.pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      dragRef.current = null;
      setDraggingIndex(null);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  }

  /** The same move by keyboard, for anyone not using a pointer. */
  function onHandleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, absoluteIndex: number, row: number) {
    const delta = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (delta === 0) return;
    const nextRow = row + delta;
    if (nextRow < 0 || nextRow >= upcoming.length) return;
    event.preventDefault();
    reorderQueue(absoluteIndex, absoluteIndex + delta);
    focusAfterMove.current = nextRow;
  }

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
            {radio ? `Radio · songs like ${radio.seedTitle}` : "Next up"} {upcoming.length > 0 && `(${upcoming.length})`}
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
          <div ref={listRef} className="flex select-none flex-col gap-1">
            {upcoming.map((t, i) => {
              const absoluteIndex = currentIndex + 1 + i;
              const isDragging = draggingIndex === absoluteIndex;
              return (
                <div
                  key={`${t.id}-${absoluteIndex}`}
                  data-queue-row
                  className={cn(
                    "flex items-center gap-2 rounded-lg p-2 transition-colors",
                    isDragging ? "bg-surface-active shadow-elevated" : "hover:bg-surface-hover"
                  )}
                >
                  {/* Always visible, never hover-gated: these used to appear
                      only on hover, which meant a phone — where the queue is
                      most useful — could not reorder or remove anything. */}
                  <button
                    data-drag-handle
                    onPointerDown={(event) => startDrag(event, absoluteIndex)}
                    onKeyDown={(event) => onHandleKeyDown(event, absoluteIndex, i)}
                    aria-label={`Reorder ${t.title}. Position ${i + 1} of ${upcoming.length}. Use the up and down arrow keys to move it.`}
                    className={cn(
                      "flex h-8 w-8 shrink-0 touch-none items-center justify-center rounded text-foreground-subtle transition-colors hover:text-foreground",
                      isDragging ? "cursor-grabbing text-foreground" : "cursor-grab"
                    )}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>

                  <TrackArt src={t.coverUrl} alt={t.title} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{t.title}</p>
                    <p className="truncate text-xs text-foreground-muted">{t.artistName}</p>
                  </div>
                  <span className="tabular text-xs text-foreground-subtle">{formatDuration(t.duration)}</span>

                  <button
                    onClick={() => removeFromQueue(absoluteIndex)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-foreground-subtle transition-colors hover:text-danger"
                    aria-label={`Remove ${t.title} from the queue`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <QualitySetting />
      <CrossfadeSetting />
    </div>
  );
}
