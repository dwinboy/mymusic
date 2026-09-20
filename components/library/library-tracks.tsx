"use client";

import { useMemo, useState } from "react";
import { Play, Search, Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrackRow } from "@/components/music/track-row";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { PlayerTrack } from "@/lib/types";

type Sort = "recent" | "title" | "artist";

/**
 * A list of the listener's own songs, with the three things a collection
 * needs once it stops being short: a way to find one, a way to reorder them,
 * and a way to play the lot.
 *
 * Filtering and sorting happen here rather than on the server. These lists
 * are bounded — every favourite, and history is capped at thirty — so the
 * whole set is already on the page, and going back to the server to hide
 * rows would put a network round trip between a keystroke and a result.
 *
 * Play all and Shuffle act on what's on screen, not on everything: having
 * searched for "amara", the obvious meaning of Play all is those songs.
 */
export function LibraryTracks({
  tracks,
  initiallyLiked = false,
  recentLabel = "Recently added",
}: {
  tracks: PlayerTrack[];
  initiallyLiked?: boolean;
  recentLabel?: string;
}) {
  const playQueue = usePlayerStore((s) => s.playQueue);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? tracks.filter(
          (t) => t.title.toLowerCase().includes(needle) || t.artistName.toLowerCase().includes(needle)
        )
      : tracks;

    if (sort === "recent") return filtered;
    const sorted = [...filtered];
    sorted.sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : a.artistName.localeCompare(b.artistName) || a.title.localeCompare(b.title)
    );
    return sorted;
  }, [tracks, query, sort]);

  function shufflePlay() {
    const list = [...shown];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    playQueue(list, 0);
  }

  return (
    <div>
      {/* Search appears once a list is long enough to need it. Below that it
          is a box that can only ever hide things you can already see. */}
      {tracks.length >= 8 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search these songs"
            aria-label="Search your songs"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground-subtle transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Two groups rather than three loose items: when the row wraps on a
          phone the controls drop to a second line together and stay aligned
          with the count above them, instead of one button floating off to
          the right on its own. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-foreground-muted">
            {shown.length} {shown.length === 1 ? "song" : "songs"}
          </p>

          {tracks.length >= 2 && (
            <label className="text-sm">
              <span className="sr-only">Sort these songs</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="recent">{recentLabel}</option>
                <option value="title">Title A–Z</option>
                <option value="artist">Artist A–Z</option>
              </select>
            </label>
          )}
        </div>

        {shown.length > 0 && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => playQueue(shown, 0)}>
              <Play className="mr-1.5 h-3.5 w-3.5" fill="currentColor" />
              Play all
            </Button>
            <Button size="sm" variant="secondary" onClick={shufflePlay}>
              <Shuffle className="mr-1.5 h-3.5 w-3.5" />
              Shuffle
            </Button>
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface/40 px-4 py-10 text-center">
          <p className="text-sm text-foreground">Nothing matches &ldquo;{query.trim()}&rdquo;.</p>
          <Button variant="ghost" size="sm" onClick={() => setQuery("")} className="mt-2">
            Clear search
          </Button>
        </div>
      ) : (
        <div className="flex flex-col">
          {shown.map((track, i) => (
            // Queue is the visible list, so skipping forward goes where the
            // eye expects rather than into rows a search has hidden.
            <TrackRow key={track.id} track={track} index={i} queue={shown} initiallyLiked={initiallyLiked} />
          ))}
        </div>
      )}
    </div>
  );
}
