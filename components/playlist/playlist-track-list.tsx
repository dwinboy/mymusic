"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { TrackRow } from "@/components/music/track-row";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PlayerTrack } from "@/lib/types";

/**
 * A playlist you can rearrange.
 *
 * PlaylistTrack has carried a `position` since the beginning, but nothing
 * could ever change it, so a playlist was append-only in the order things
 * happened to be added — which for the thing people mostly build playlists
 * for, an order of songs, is the one capability that mattered.
 *
 * Dragging works the same way the queue does: pointer events, so mouse and
 * touch take one path, and the list sorts under your finger rather than
 * waiting for a drop. The new order is saved once, when you let go.
 */
export function PlaylistTrackList({
  tracks,
  likedIds,
  playlistId,
  isOwner,
}: {
  tracks: PlayerTrack[];
  likedIds: string[];
  playlistId: string;
  isOwner: boolean;
}) {
  const { toast } = useToast();
  const [list, setList] = useState(tracks);
  const liked = new Set(likedIds);

  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; index: number } | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  /** The order as it was before this drag, to put back if saving fails. */
  const beforeDrag = useRef<PlayerTrack[]>([]);
  const focusAfterMove = useRef<number | null>(null);

  useEffect(() => {
    const target = focusAfterMove.current;
    if (target === null) return;
    focusAfterMove.current = null;
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-playlist-row]");
    rows?.[target]?.querySelector<HTMLButtonElement>("[data-drag-handle]")?.focus();
  }, [list]);

  const rowUnder = useCallback((clientY: number) => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-playlist-row]");
    if (!rows || rows.length === 0) return null;
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length - 1;
  }, []);

  function move(from: number, to: number) {
    setList((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function save(order: PlayerTrack[]) {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds: order.map((t) => t.id) }),
      });
      if (response.ok) return;
      const data = await response.json().catch(() => ({}));
      toast({ title: data.error ?? "Couldn't save the new order.", variant: "danger" });
      setList(beforeDrag.current);
    } catch {
      toast({ title: "Couldn't save the new order.", variant: "danger" });
      setList(beforeDrag.current);
    }
  }

  /**
   * The drag listens on the window rather than capturing the pointer on the
   * handle. Reordering moves the handle's DOM node, and moving a node drops
   * any pointer capture it held — so the pointerup that ends the drag never
   * arrived, and the new order was never saved. The window is still there
   * wherever the row has been moved to.
   */
  function startDrag(event: React.PointerEvent<HTMLButtonElement>, index: number) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    beforeDrag.current = list;
    dragRef.current = { pointerId: event.pointerId, index };
    setDraggingIndex(index);

    const onMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== moveEvent.pointerId) return;
      // Stops the page scrolling under a finger that is dragging a row.
      moveEvent.preventDefault();
      const row = rowUnder(moveEvent.clientY);
      if (row === null || row === drag.index) return;
      move(drag.index, row);
      drag.index = row;
      setDraggingIndex(row);
    };

    const onEnd = (endEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== endEvent.pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      dragRef.current = null;
      setDraggingIndex(null);
      // Saved once, at the end — not on every row the finger crossed.
      setList((current) => {
        const changed = current.some((t, i) => beforeDrag.current[i]?.id !== t.id);
        if (changed) void save(current);
        return current;
      });
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  }

  function onHandleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (delta === 0) return;
    const next = index + delta;
    if (next < 0 || next >= list.length) return;
    event.preventDefault();
    beforeDrag.current = list;
    move(index, next);
    focusAfterMove.current = next;
    setList((current) => {
      void save(current);
      return current;
    });
  }

  return (
    <div ref={listRef} className={cn("flex flex-col", isOwner && "select-none")}>
      {list.map((track, i) => (
        <div
          key={track.id}
          data-playlist-row
          className={cn(
            "flex items-center gap-1 rounded-lg transition-colors",
            draggingIndex === i && "bg-surface-active shadow-elevated"
          )}
        >
          {isOwner && (
            <button
              data-drag-handle
              onPointerDown={(event) => startDrag(event, i)}
              onKeyDown={(event) => onHandleKeyDown(event, i)}
              aria-label={`Reorder ${track.title}. Position ${i + 1} of ${list.length}. Use the up and down arrow keys to move it.`}
              className={cn(
                "flex h-8 w-7 shrink-0 touch-none items-center justify-center rounded text-foreground-subtle transition-colors hover:text-foreground",
                draggingIndex === i ? "cursor-grabbing text-foreground" : "cursor-grab"
              )}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <TrackRow
              track={track}
              index={i}
              queue={list}
              initiallyLiked={liked.has(track.id)}
              removeFromPlaylistId={isOwner ? playlistId : undefined}
              onRemovedFromPlaylist={
                isOwner ? () => setList((prev) => prev.filter((t) => t.id !== track.id)) : undefined
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
