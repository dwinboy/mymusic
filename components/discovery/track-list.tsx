"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackRow } from "@/components/music/track-row";
import { LyricSnippet } from "@/components/search/lyric-snippet";
import type { PlayerTrack } from "@/lib/types";

/**
 * First page is server-rendered; further pages load on request through the
 * same filter query. Loaded tracks join the play queue, so pressing play on
 * row 40 continues into row 41.
 */
export function PaginatedTrackList({
  initialTracks,
  initialCursor,
  query,
  likedIds = [],
  lyricQuery,
  pageSize = 24,
}: {
  initialTracks: PlayerTrack[];
  initialCursor: string | null;
  query: string;
  likedIds?: string[];
  /** When these results came from a search, the words that were searched for,
      so a song matched on its lyrics can show the line. */
  lyricQuery?: string;
  pageSize?: number;
}) {
  const [tracks, setTracks] = useState(initialTracks);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const liked = new Set(likedIds);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  async function loadMore() {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams(query);
      params.set("cursor", cursor);
      params.set("limit", String(pageSize));
      const res = await fetch(`/api/tracks?${params}`);
      if (!res.ok) throw new Error();
      const data: { tracks: PlayerTrack[]; nextCursor: string | null } = await res.json();
      setTracks((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...data.tracks.filter((t) => !seen.has(t.id))];
      });
      setCursor(data.nextCursor);
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  // Loads the next page as the end of the list comes into view. Stops after
  // an error, so a failing request isn't retried on every scroll; the button
  // stays for that, and for anyone not scrolling.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // loadMore reads the latest cursor through state on each call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, error]);

  return (
    <div>
      <div className="flex flex-col">
        {tracks.map((track, i) => (
          <div key={track.id}>
            <TrackRow track={track} index={i} queue={tracks} initiallyLiked={liked.has(track.id)} />
            {lyricQuery && <LyricSnippet query={lyricQuery} track={track} />}
          </div>
        ))}
      </div>

      {cursor && (
        <div ref={sentinel} className="mt-6 flex flex-col items-center gap-2">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more
          </Button>
          {error && <p className="text-sm text-danger">Couldn&apos;t load more. Try again.</p>}
        </div>
      )}
    </div>
  );
}
